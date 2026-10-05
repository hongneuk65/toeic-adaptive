import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExamAttempt, ExamType } from '@prisma/client';
import { questionSelect } from '../common/question-select';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

const EXAM_COUNTS: Record<ExamType, number[]> = {
  FULL: [6, 25, 39, 30, 30, 16, 54],
  MINI: [3, 12, 20, 15, 15, 8, 27],
  PART_5: [0, 0, 0, 0, 30, 0, 0],
};

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly masteryQueueService: MasteryQueueService,
  ) {}

  async startExam(userId: number, dto: StartExamDto) {
    const questions = await this.selectQuestions(dto.examType);
    const attempt = await this.prisma.examAttempt.create({
      data: { userId, examType: dto.examType, questionIds: questions.map((q) => q.id) },
    });
    return this.toExamResponse(attempt, questions);
  }

  private async selectQuestions(examType: ExamType) {
    const groups = await Promise.all(EXAM_COUNTS[examType].map(async (count, index) => {
      if (!count) return [];
      const questions = await this.prisma.question.findMany({
        where: { part: index + 1 }, take: count, orderBy: { id: 'asc' }, select: questionSelect,
      });
      if (questions.length !== count) {
        throw new BadRequestException(`Part ${index + 1} cần đủ ${count} câu hỏi để tạo đề`);
      }
      return questions;
    }));
    return groups.flat();
  }

  async getExam(userId: number, attemptId: number) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    this.assertOpen(attempt);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: attempt.questionIds } }, select: questionSelect,
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    if (questions.length !== attempt.questionIds.length) {
      throw new BadRequestException('Câu hỏi trong đề đã thay đổi. Vui lòng tạo lượt thi mới.');
    }
    return this.toExamResponse(attempt, attempt.questionIds.map((id) => byId.get(id)!));
  }

  private toExamResponse(attempt: ExamAttempt, questions: unknown[]) {
    return {
      attemptId: attempt.id, examType: attempt.examType, startedAt: attempt.startedAt,
      totalQuestions: questions.length, questions,
    };
  }

  private async getOwnedAttempt(userId: number, id: number) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id } });
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt thi');
    if (attempt.userId !== userId) throw new ForbiddenException('Bạn không có quyền truy cập bài thi này');
    return attempt;
  }

  private assertOpen(attempt: ExamAttempt) {
    if (attempt.submittedAt) throw new BadRequestException('Bài thi này đã được nộp trước đó');
    if (!attempt.questionIds.length) {
      throw new BadRequestException('Lượt thi cũ chưa lưu danh sách câu hỏi. Vui lòng tạo lượt thi mới.');
    }
  }

  async submitExam(userId: number, dto: SubmitExamDto) {
    const attempt = await this.getOwnedAttempt(userId, dto.attemptId);
    this.assertOpen(attempt);
    const selected = new Map(dto.answers.map((a) => [a.questionId, a.selectedAnswer]));
    if (selected.size !== dto.answers.length || dto.answers.some((a) => !attempt.questionIds.includes(a.questionId))) {
      throw new BadRequestException('Danh sách đáp án bị trùng hoặc chứa câu hỏi ngoài đề');
    }
    const questions = await this.prisma.question.findMany({
      where: { id: { in: attempt.questionIds } },
      select: { id: true, part: true, correctAnswer: true, skills: { select: { skillId: true } } },
    });
    if (questions.length !== attempt.questionIds.length) {
      throw new BadRequestException('Một hoặc nhiều câu hỏi trong đề không còn tồn tại');
    }
    const byId = new Map(questions.map((q) => [q.id, q]));
    const records = attempt.questionIds.map((questionId) => ({
      attemptId: attempt.id, questionId, selectedAnswer: selected.get(questionId) ?? '',
      isCorrect: selected.get(questionId) === byId.get(questionId)!.correctAnswer,
    }));
    const listeningCorrect = records.filter((a) => a.isCorrect && byId.get(a.questionId)!.part <= 4).length;
    const totalCorrect = records.filter((a) => a.isCorrect).length;
    const readingCorrect = totalCorrect - listeningCorrect;
    const counts = EXAM_COUNTS[attempt.examType];
    const listeningScore = this.scaleScore(listeningCorrect, counts.slice(0, 4));
    const readingScore = this.scaleScore(readingCorrect, counts.slice(4));
    const scores = { listeningScore, readingScore, totalScore: listeningScore + readingScore };

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.examAttempt.updateMany({
        where: { id: attempt.id, submittedAt: null },
        data: { submittedAt: new Date(), ...scores },
      });
      if (!claimed.count) throw new BadRequestException('Bài thi này đã được nộp trước đó');
      await tx.examAnswer.createMany({ data: records });
    });
    // Unanswered items appear in review, but are not observations of a skill.
    const logs = records.filter((a) => a.selectedAnswer).map((a) => ({
      userId, questionId: a.questionId, isCorrect: a.isCorrect,
      skillIds: byId.get(a.questionId)!.skills.map((s) => s.skillId),
    }));
    await this.masteryQueueService.enqueueBulkMasteryUpdate(logs).catch((error: unknown) => {
      this.logger.error(`Không thể xếp hàng cập nhật mastery cho bài thi ${attempt.id}`, error);
    });
    return { attemptId: attempt.id, listeningCorrect, readingCorrect, totalCorrect, ...scores };
  }

  private scaleScore(correct: number, counts: number[]) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    return total ? Math.round(correct / total * 495) : 0;
  }

  async getReview(userId: number, attemptId: number) {
    const attempt = await this.getOwnedAttempt(userId, attemptId);
    if (!attempt.submittedAt) throw new BadRequestException('Bạn cần nộp bài trước khi xem đáp án');
    const answers = await this.prisma.examAnswer.findMany({
      where: { attemptId }, include: { question: true }, orderBy: { id: 'asc' },
    });
    return { ...attempt, answers };
  }
}