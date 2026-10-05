import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service'; // Ngày 18: Import Queue
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { questionSelect } from '../common/question-select';

@Injectable()
export class TheoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masteryQueueService: MasteryQueueService, // Ngày 18: Inject Queue
  ) {}

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
        explanation: q.explanation,
      };
    });

    if (userId) {
      await this.masteryQueueService.enqueueBulkMasteryUpdate(details.map((answer) => ({
        userId, questionId: answer.questionId, isCorrect: answer.isCorrect,
        skillIds: questionMap.get(answer.questionId)!.skills.map((s) => s.skillId),
      })));
    }

    return {
      totalQuestions: dto.answers.length,
      correctCount,
      scorePercentage: Math.round((correctCount / dto.answers.length) * 100), // Khôi phục scorePercentage nguyên bản
      details,
    };
  }
}