import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExamAttempt, ExamType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { questionSelect } from '../common/question-select';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ExamService } from './exam.service';

describe('Exam behavior', () => {
  const startedAt = new Date('2026-09-21T10:00:00Z');
  const makeAttempt = (): ExamAttempt => ({
    id: 10, userId: 1, examType: ExamType.PART_5, questionIds: [2, 1],
    startedAt, submittedAt: null, listeningScore: null, readingScore: null,
    totalScore: null, createdAt: startedAt, updatedAt: startedAt,
  });
  const questions = [1, 2].map((id) => ({
    id, part: 5, correctAnswer: 'A', skills: [{ skillId: 7 }],
  }));
  const tx = {
    examAttempt: { updateMany: jest.fn<() => Promise<{ count: number }>>() },
    examAnswer: { createMany: jest.fn<() => Promise<{ count: number }>>() },
  };
  const db = {
    examAttempt: {
      findUnique: jest.fn<() => Promise<ExamAttempt | null>>(),
      create: jest.fn<() => Promise<ExamAttempt>>(),
    },
    question: { findMany: jest.fn<() => Promise<typeof questions>>() },
    examAnswer: { findMany: jest.fn<() => Promise<unknown[]>>() },
    $transaction: jest.fn<(callback: (client: typeof tx) => Promise<void>) => Promise<void>>(),
  };
  const queue = { enqueueBulkMasteryUpdate: jest.fn<() => Promise<void>>() };
  let service: ExamService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.examAttempt.findUnique.mockResolvedValue(makeAttempt());
    db.examAttempt.create.mockResolvedValue(makeAttempt());
    db.question.findMany.mockResolvedValue(questions);
    tx.examAttempt.updateMany.mockResolvedValue({ count: 1 });
    tx.examAnswer.createMany.mockResolvedValue({ count: 2 });
    db.$transaction.mockImplementation((callback) => callback(tx));
    queue.enqueueBulkMasteryUpdate.mockResolvedValue();
    service = new ExamService(db as unknown as PrismaService, queue as unknown as MasteryQueueService);
  });

  it.each([ExamType.FULL, ExamType.MINI, ExamType.PART_5])('persists the selected %s exam membership', async (examType) => {
    const counts = { FULL: [6, 25, 39, 30, 30, 16, 54], MINI: [3, 12, 20, 15, 15, 8, 27], PART_5: [30] };
    let nextId = 0;
    const ids: number[] = [];
    for (const count of counts[examType]) {
      db.question.findMany.mockResolvedValueOnce(Array.from({ length: count }, () => {
        const id = ++nextId;
        ids.push(id);
        return { ...questions[0], id };
      }));
    }
    const result = await service.startExam(1, { examType });
    expect(result.totalQuestions).toBe(nextId);
    expect(db.examAttempt.create).toHaveBeenCalledWith({ data: { userId: 1, examType, questionIds: ids } });
    for (const call of db.question.findMany.mock.calls) {
      expect(call).toEqual([expect.objectContaining({ select: questionSelect })]);
    }
    expect(questionSelect).not.toHaveProperty('correctAnswer');
    expect(questionSelect).not.toHaveProperty('explanation');
  });

  it('does not create an undersized exam', async () => {
    await expect(service.startExam(1, { examType: ExamType.PART_5 })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.examAttempt.create).not.toHaveBeenCalled();
  });

  it('resumes in the original order with the original server timestamp', async () => {
    const result = await service.getExam(1, 10);
    expect(result.questions.map((q) => (q as { id: number }).id)).toEqual([2, 1]);
    expect(result.startedAt).toBe(startedAt);
    expect(db.question.findMany).toHaveBeenCalledWith({ where: { id: { in: [2, 1] } }, select: questionSelect });
  });

  it.each(['resume', 'submit', 'review'])('enforces ownership for %s', async (action) => {
    const request = action === 'resume' ? service.getExam(2, 10) : action === 'review'
      ? service.getReview(2, 10) : service.submitExam(2, { attemptId: 10, answers: [] });
    await expect(request).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.question.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('reports missing attempts', async () => {
    db.examAttempt.findUnique.mockResolvedValue(null);
    await expect(service.getExam(1, 999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects attempts without a persisted question list', async () => {
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), questionIds: [] });
    await expect(service.getExam(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([[1, 1], [999]])('rejects duplicate or out-of-exam answers %j', async (...ids) => {
    await expect(service.submitExam(1, {
      attemptId: 10, answers: ids.map((questionId) => ({ questionId, selectedAnswer: 'A' })),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('grades a blank submission and stores every unanswered question', async () => {
    const result = await service.submitExam(1, { attemptId: 10, answers: [] });
    expect(result.totalCorrect).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(tx.examAnswer.createMany).toHaveBeenCalledWith({ data: [2, 1].map((questionId) => ({
      attemptId: 10, questionId, selectedAnswer: '', isCorrect: false,
    })) });
    expect(queue.enqueueBulkMasteryUpdate).toHaveBeenCalledWith([]);
  });

  it('records omitted answers but only queues answered questions', async () => {
    const result = await service.submitExam(1, { attemptId: 10, answers: [{ questionId: 1, selectedAnswer: 'A' }] });
    expect(result.readingScore).toBe(17);
    expect(result.totalCorrect).toBe(1);
    expect(queue.enqueueBulkMasteryUpdate).toHaveBeenCalledWith([
      { userId: 1, questionId: 1, isCorrect: true, skillIds: [7] },
    ]);
  });

  it('refuses to resume or grade when a stored question has disappeared', async () => {
    db.question.findMany.mockResolvedValue([questions[0]]);
    await expect(service.getExam(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a repeated submission', async () => {
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), submittedAt: startedAt });
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.examAnswer.createMany).not.toHaveBeenCalled();
  });

  it('allows only one concurrent submission to claim an attempt', async () => {
    tx.examAttempt.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([1, 2].map(() => service.submitExam(1, { attemptId: 10, answers: [] })));
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(tx.examAnswer.createMany).toHaveBeenCalledTimes(1);
    expect(queue.enqueueBulkMasteryUpdate).toHaveBeenCalledTimes(1);
    expect(tx.examAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10, submittedAt: null },
    }));
  });

  it('does not queue observations if saving answers fails', async () => {
    tx.examAnswer.createMany.mockRejectedValue(new Error('database unavailable'));
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toThrow('database unavailable');
    expect(queue.enqueueBulkMasteryUpdate).not.toHaveBeenCalled();
  });

  it('does not reveal review data before submission', async () => {
    await expect(service.getReview(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.examAnswer.findMany).not.toHaveBeenCalled();
  });

  it('returns every stored answer after submission', async () => {
    const answers = [{ questionId: 2, selectedAnswer: '' }, { questionId: 1, selectedAnswer: 'A' }];
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), submittedAt: startedAt });
    db.examAnswer.findMany.mockResolvedValue(answers);
    expect((await service.getReview(1, 10)).answers).toEqual(answers);
  });
});

describe('SubmitExamDto validation', () => {
  it('allows an empty submission', async () => {
    expect(await validate(plainToInstance(SubmitExamDto, { attemptId: 1, answers: [] }))).toEqual([]);
  });

  it.each([
    { attemptId: 0, answers: [] },
    { attemptId: 1, answers: [{ questionId: -1, selectedAnswer: 'A' }] },
    { attemptId: 1, answers: [{ questionId: 1, selectedAnswer: 'E' }] },
    { attemptId: 1, answers: [1, 1].map((questionId) => ({ questionId, selectedAnswer: 'A' })) },
    { attemptId: 1, answers: Array.from({ length: 201 }, (_, i) => ({ questionId: i + 1, selectedAnswer: 'A' })) },
  ])('rejects invalid input %#', async (body) => {
    expect((await validate(plainToInstance(SubmitExamDto, body))).length).toBeGreaterThan(0);
  });
});