import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { TheoryService } from './theory.service';

describe('Lesson quiz membership', () => {
  const db = {
    theoryLesson: { findUnique: jest.fn<() => Promise<unknown>>() },
    examAttempt: { findFirst: jest.fn<() => Promise<unknown>>() },
    $executeRaw: jest.fn<() => Promise<number>>(),
    learningAttempt: { findUnique: jest.fn<() => Promise<unknown>>(), create: jest.fn<() => Promise<unknown>>() },
    masteryOutbox: { createMany: jest.fn<() => Promise<unknown>>() },
    $transaction: jest.fn<(fn: (client: any) => Promise<any>) => Promise<any>>(),
    question: { findMany: jest.fn<() => Promise<unknown[]>>() },
  };
  const queue = { enqueueBulkMasteryUpdate: jest.fn<() => Promise<void>>() };
  let service: TheoryService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(fn => fn(db));
    db.theoryLesson.findUnique.mockResolvedValue({ id: 1, skillId: 8 });
    db.question.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    service = new TheoryService(db as unknown as PrismaService, queue as unknown as MasteryQueueService);
  });

  it.each([[1, 1], [1, 999], [1], []])('rejects invalid quiz membership %j', async (...ids) => {
    await expect(service.submitQuiz(1, {
      attemptId: '123e4567-e89b-42d3-a456-426614174000',
      answers: ids.map((questionId) => ({ questionId, selectedAnswer: 'A' })),
    }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.enqueueBulkMasteryUpdate).not.toHaveBeenCalled();
    expect(db.question.findMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a nonexistent lesson', async () => {
    db.theoryLesson.findUnique.mockResolvedValue(null);
    await expect(service.submitQuiz(99, { attemptId: '123e4567-e89b-42d3-a456-426614174000', answers: [] }, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replays an already committed quiz without enqueueing duplicate mastery events', async () => {
    const answers = [{ questionId: 1, selectedAnswer: 'A' }];
    const result = { totalQuestions: 1, correctCount: 1, scorePercentage: 100, details: [] };
    db.learningAttempt.findUnique.mockResolvedValue({ scopeId: 1, payloadHash: createHash('sha256').update(JSON.stringify(answers)).digest('hex'), result });
    await expect(service.submitQuiz(1, { attemptId: '123e4567-e89b-42d3-a456-426614174000', answers }, 5)).resolves.toEqual(result);
    expect(db.masteryOutbox.createMany).not.toHaveBeenCalled();
    expect(db.question.findMany).not.toHaveBeenCalled();
  });

  it('grades all quiz questions and queues only server-derived skills', async () => {
    db.question.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]).mockResolvedValueOnce([
      { id: 1, itemDifficulty: 0.5, correctAnswer: 'A', explanation: 'first', skills: [{ skillId: 8 }] },
      { id: 2, itemDifficulty: 0.5, correctAnswer: 'B', explanation: 'second', skills: [{ skillId: 8 }, { skillId: 9 }] },
    ]);
    const result = await service.submitQuiz(1, {
      attemptId: '123e4567-e89b-42d3-a456-426614174000',
      answers: [1, 2].map((questionId) => ({ questionId, selectedAnswer: 'A' })),
    }, 5);
    expect(result.scorePercentage).toBe(50);
    expect(result.correctCount).toBe(1);
    expect(result.details).toHaveLength(2);
    expect(db.masteryOutbox.createMany).toHaveBeenCalledWith({ data: [
      { id: 'theory-5-123e4567-e89b-42d3-a456-426614174000-1', payload: { userId: 5, questionId: 1, isCorrect: true, occurredAt: expect.any(String), itemDifficulty: 0.5, skillIds: [8] } },
      { id: 'theory-5-123e4567-e89b-42d3-a456-426614174000-2', payload: { userId: 5, questionId: 2, isCorrect: false, occurredAt: expect.any(String), itemDifficulty: 0.5, skillIds: [8, 9] } },
    ] });
  });
});