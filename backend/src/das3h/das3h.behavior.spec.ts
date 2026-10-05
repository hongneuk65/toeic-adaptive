import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from './das3h.service';

describe('DAS3H learning events', () => {
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>(),
    processedMasteryJob: {
      findUnique: jest.fn<() => Promise<{ id: string } | null>>(),
      create: jest.fn<() => Promise<unknown>>(),
    },
    studentSkillHistory: { createMany: jest.fn<() => Promise<unknown>>() },
    question: { update: jest.fn<() => Promise<unknown>>() },
    userSkillMastery: { upsert: jest.fn<() => Promise<unknown>>() },
  };
  const db = {
    $transaction: jest.fn<(fn: (client: typeof tx) => Promise<void>) => Promise<void>>(),
    question: { findUnique: jest.fn<() => Promise<unknown>>() },
  };
  let service: Das3hService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new Das3hService(db as unknown as PrismaService);
    db.$transaction.mockImplementation((fn) => fn(tx));
    tx.processedMasteryJob.findUnique.mockResolvedValue(null);
    jest.spyOn(service, 'updateAbilityOnline').mockResolvedValue(0.015);
    jest.spyOn(service, 'getSkillMastery').mockResolvedValue(0.7);
  });

  it('updates ability before writing the observation and deduplicates skills', async () => {
    await service.recordAndSync(1, 2, true, [3, 3], 'job-1');
    expect(service.updateAbilityOnline).toHaveBeenCalledTimes(1);
    expect(tx.studentSkillHistory.createMany).toHaveBeenCalledWith({
      data: [{ userId: 1, questionId: 2, isCorrect: true, skillId: 3 }],
    });
    expect(jest.mocked(service.updateAbilityOnline).mock.invocationCallOrder[0])
      .toBeLessThan(tx.studentSkillHistory.createMany.mock.invocationCallOrder[0]);
    expect(tx.userSkillMastery.upsert).toHaveBeenCalledTimes(1);
    expect(tx.question.update).toHaveBeenCalledWith({
      where: { id: 2 }, data: { totalAttempts: { increment: 1 }, totalCorrect: { increment: 1 } },
    });
    expect(tx.processedMasteryJob.create).toHaveBeenCalledWith({ data: { id: 'job-1' } });
  });

  it('skips a job that was already committed', async () => {
    tx.processedMasteryJob.findUnique.mockResolvedValue({ id: 'job-1' });
    await service.recordAndSync(1, 2, true, [3], 'job-1');
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(service.updateAbilityOnline).not.toHaveBeenCalled();
    expect(tx.studentSkillHistory.createMany).not.toHaveBeenCalled();
    expect(tx.question.update).not.toHaveBeenCalled();
  });

  it('does not mark a failed update as processed', async () => {
    tx.userSkillMastery.upsert.mockRejectedValue(new Error('write failed'));
    await expect(service.recordAndSync(1, 2, true, [3], 'job-1')).rejects.toThrow('write failed');
    expect(tx.processedMasteryJob.create).not.toHaveBeenCalled();
  });

  it('handles questions without skills without attempting an empty insert', async () => {
    await service.recordAndSync(1, 2, false, []);
    expect(service.updateAbilityOnline).toHaveBeenCalled();
    expect(tx.studentSkillHistory.createMany).not.toHaveBeenCalled();
    expect(tx.userSkillMastery.upsert).not.toHaveBeenCalled();
    expect(tx.processedMasteryJob.create).not.toHaveBeenCalled();
  });

  it('rejects an unrelated practice skill before updating mastery', async () => {
    db.question.findUnique.mockResolvedValue({ correctAnswer: 'A', skills: [{ skillId: 3 }] });
    await expect(service.checkAndRecordAnswer(1, 2, 'A', 99)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid answer letters', async () => {
    db.question.findUnique.mockResolvedValue({ correctAnswer: 'A', skills: [{ skillId: 3 }] });
    await expect(service.checkAndRecordAnswer(1, 2, 'invalid', 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('grades normalized answers and uses question skills, not a client-supplied list', async () => {
    db.question.findUnique.mockResolvedValue({ correctAnswer: 'A', explanation: 'why', skills: [{ skillId: 3 }, { skillId: 4 }] });
    const record = jest.spyOn(service, 'recordAndSync').mockResolvedValue();
    expect(await service.checkAndRecordAnswer(1, 2, ' a ', 3)).toEqual({
      isCorrect: true, correctAnswer: 'A', explanation: 'why',
    });
    expect(record).toHaveBeenCalledWith(1, 2, true, [3, 4]);
  });
});