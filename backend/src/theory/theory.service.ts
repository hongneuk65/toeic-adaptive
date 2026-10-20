import { createHash } from 'node:crypto';
import { assertQuestionAnswersAccessible } from '../common/exam-answer-access';
import { learnerExplanation } from '../common/learner-explanation';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service'; // Ngày 18: Import Queue
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { questionSelect } from '../common/question-select';
import { importedQuestions } from '../common/imported-questions';
import { topicForLesson } from '../mastery/learning-topics';

@Injectable()
export class TheoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masteryQueueService: MasteryQueueService, // Ngày 18: Inject Queue
  ) {}

  async getCatalog() {
    const lessons = await this.prisma.theoryLesson.findMany({
      select: { id: true, title: true, part: true, skillId: true, skill: { select: { code: true, name: true, category: true } } },
      orderBy: [{ part: 'asc' }, { id: 'asc' }],
    });
    return lessons.map(lesson => ({ ...lesson, topic: topicForLesson(lesson) }));
  }

  // 1. Lấy danh sách bài học theo Part (chỉ lấy thông tin cơ bản, không load chi tiết nặng)
  async getLessonsByPart(part: number) {
    return this.prisma.theoryLesson.findMany({
      where: { part },
      select: {
        id: true,
        title: true,
        part: true,
        skillId: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  // 2. Lấy nội dung chi tiết bài học kèm thông tin skill
  async getLessonDetail(id: number) {
    const lesson = await this.prisma.theoryLesson.findUnique({
      where: { id },
      include: {
        skill: true,
      },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học lý thuyết');
    }
    return lesson;
  }

  // 3. Lấy 5 câu mini-quiz của bài học (TUYỆT ĐỐI KHÔNG LỘ correctAnswer)
  async getLessonQuiz(lessonId: number) {
    const lesson = await this.getLessonDetail(lessonId);
    // Lấy tối đa 5 câu hỏi thuộc skill của bài học này (Quan hệ chuẩn xác theo theory.docx)
    return this.prisma.question.findMany({
      where: {
        ...importedQuestions,
        skills: {
          some: { skillId: lesson.skillId },
        },
      },
      take: 5,
      select: questionSelect,
      orderBy: { id: 'asc' },
    });
  }

  // 4. Chấm điểm bài quiz (Chống N+1 query bằng "id: { in: [...] }")
  async submitQuiz(lessonId: number, dto: SubmitQuizDto, userId?: number) {
    const payloadHash = createHash('sha256').update(JSON.stringify([...dto.answers].sort((a, b) => a.questionId - b.questionId).map(a => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer })))).digest('hex');
    if (userId && dto.attemptId) {
      await assertQuestionAnswersAccessible(this.prisma, userId, dto.answers.map(a => a.questionId));
      const existing = await this.prisma.learningAttempt.findUnique({ where: { id: `theory-${userId}-${dto.attemptId}` } });
      if (existing) {
        if (existing.scopeId !== lessonId || existing.payloadHash !== payloadHash) throw new BadRequestException('Mã lượt làm bài đã được dùng với nội dung khác');
        return existing.result as { totalQuestions: number; correctCount: number; scorePercentage: number; details: { questionId: number; selectedAnswer: string; correctAnswer: string; isCorrect: boolean; explanation: string | null }[] };
      }
    }
    const quiz = await this.getLessonQuiz(lessonId);
    const questionIds = dto.answers.map((a) => a.questionId);
    const allowedIds = new Set(quiz.map((q) => q.id));
    if (!questionIds.length || new Set(questionIds).size !== questionIds.length ||
        questionIds.length !== allowedIds.size || questionIds.some((id) => !allowedIds.has(id))) {
      throw new BadRequestException('Cần trả lời đủ các câu hỏi của bài học, không trùng lặp');
    }

    // Gom toàn bộ câu hỏi cần chấm vào 1 câu SQL SELECT duy nhất
    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        id: true,
        correctAnswer: true,
        itemDifficulty: true,
        explanation: true,
        skills: {
          select: {
            skillId: true, // Lấy danh sách skillId để truyền cho hàng đợi
          },
        },
      },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('Một hoặc nhiều questionId không hợp lệ');
    }

    // Đưa vào Map để tra cứu O(1) trong bộ nhớ
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let correctCount = 0;

    const details = dto.answers.map((ans) => {
      const q = questionMap.get(ans.questionId)!;
      const isCorrect = q.correctAnswer === ans.selectedAnswer; // Khớp chuẩn selectedAnswer
      if (isCorrect) correctCount++;
      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: learnerExplanation(q.explanation),
      };
    });

    if (userId) await assertQuestionAnswersAccessible(this.prisma, userId, questionIds);
    const result = {
      totalQuestions: dto.answers.length, correctCount,
      scorePercentage: Math.round((correctCount / dto.answers.length) * 100), details,
    };
    if (!userId || !dto.attemptId) throw new BadRequestException('Thiếu mã lượt làm bài');
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::bigint)`;
      const id = `theory-${userId}-${dto.attemptId}`;
      const existing = await tx.learningAttempt.findUnique({ where: { id } });
      if (existing) {
        if (existing.scopeId !== lessonId || existing.payloadHash !== payloadHash) throw new BadRequestException('Mã lượt làm bài đã được dùng với nội dung khác');
        return existing.result as typeof result;
      }
      await tx.learningAttempt.create({ data: { id, userId, kind: 'theory', scopeId: lessonId, payloadHash, result } });
      await tx.masteryOutbox.createMany({ data: details.map(answer => ({
        id: `${id}-${answer.questionId}`,
        payload: { userId, questionId: answer.questionId, isCorrect: answer.isCorrect, occurredAt: new Date().toISOString(), itemDifficulty: questionMap.get(answer.questionId)!.itemDifficulty, skillIds: questionMap.get(answer.questionId)!.skills.map(s => s.skillId) },
      })) });
      return result;
    });
  }
}
