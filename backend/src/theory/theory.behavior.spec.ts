import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { TheoryService } from './theory.service';

describe('Lesson quiz membership', () => {
  const db = {
    theoryLesson: { findUnique: jest.fn<() => Promise<unknown>>() },
    question: { findMany: jest.fn<() => Promise<unknown[]>>() },
  };
  const queue = { enqueueBulkMasteryUpdate: jest.fn<() => Promise<void>>() };
  let service: TheoryService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.theoryLesson.findUnique.mockResolvedValue({ id: 1, skillId: 8 });
    db.question.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    service = new TheoryService(db as unknown as PrismaService, queue as unknown as MasteryQueueService);
  });

  it.each([[1, 1], [1, 999], [1], []])('rejects invalid quiz membership %j', async (...ids) => {
    await expect(service.submitQuiz(1, {
      answers: ids.map((questionId) => ({ questionId, selectedAnswer: 'A' })),
    }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.enqueueBulkMasteryUpdate).not.toHaveBeenCalled();
    expect(db.question.findMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a nonexistent lesson', async () => {
    db.theoryLesson.findUnique.mockResolvedValue(null);
    await expect(service.submitQuiz(99, { answers: [] }, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grades all quiz questions and queues only server-derived skills', async () => {
    db.question.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]).mockResolvedValueOnce([
      { id: 1, correctAnswer: 'A', explanation: 'first', skills: [{ skillId: 8 }] },
      { id: 2, correctAnswer: 'B', explanation: 'second', skills: [{ skillId: 8 }, { skillId: 9 }] },
    ]);
    const result = await service.submitQuiz(1, {
      answers: [1, 2].map((questionId) => ({ questionId, selectedAnswer: 'A' })),
    }, 5);
    expect(result.scorePercentage).toBe(50);
    expect(result.correctCount).toBe(1);
    expect(result.details).toHaveLength(2);
    expect(queue.enqueueBulkMasteryUpdate).toHaveBeenCalledWith([
      { userId: 5, questionId: 1, isCorrect: true, skillIds: [8] },
      { userId: 5, questionId: 2, isCorrect: false, skillIds: [8, 9] },
    ]);
  });
});