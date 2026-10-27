import { jest } from '@jest/globals';
import type { PlacementAttempt, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as trained from '../das3h/trained-das3h';
import { PlacementService } from './placement.service';

describe('historical placement reference', () => {
  const question = {
    id: 1,
    part: 5,
    content: 'Question',
    optionA: 'One',
    optionB: 'Two',
    optionC: 'Three',
    optionD: 'Four',
    correctAnswer: 'A',
    explanation: '[santa-ednet:q1]',
    stimulus: null,
  };
  const model: trained.TrainedModel = {
    schemaVersion: 1,
    featureContract: 'own-das3h-d0-cumulative-v1',
    version: 'own-das3h-1234567890abcdef',
    intercept: 0,
    windowsMs: trained.WINDOWS_MS,
    questions: { q1: { bias: 0, tags: [], part: 5, correctAnswer: 'A' } },
    skills: {},
    applicationBridge: { q1: trained.questionFingerprint(question) },
    releaseGatePassed: true,
    sourceHashes: {},
    metrics: {},
    cohort: {},
    mappingStatus: 'fixture',
  };
  const db = {
    masteryOutbox: { findMany: jest.fn<any>() },
    question: { findMany: jest.fn<any>() },
  };
  const service = new PlacementService(db as unknown as PrismaService);
  const completedAt = new Date('2026-01-01T00:00:00Z');
  const attempt = {
    id: 7,
    userId: 9,
    status: 'COMPLETED',
    completedAt,
    deadlineAt: completedAt,
  } as PlacementAttempt;
  beforeEach(() => {
    jest.restoreAllMocks();
    db.masteryOutbox.findMany.mockResolvedValue([]);
    db.question.findMany.mockResolvedValue([question]);
    jest
      .spyOn(
        service as unknown as { fittedModel(): trained.TrainedModel | null },
        'fittedModel',
      )
      .mockReturnValue(model);
  });
  afterEach(() => jest.restoreAllMocks());
  it('always predicts immediately after completion and excludes future practice', async () => {
    const predictor = jest
      .spyOn(trained.TrainedDas3h.prototype, 'predictMany')
      .mockResolvedValue(new Map([[1, 0.6]]));
    const first = await service['reference'](
      attempt,
      db as unknown as Prisma.TransactionClient,
    );
    db.masteryOutbox.findMany.mockResolvedValue([
      {
        payload: { occurredAt: '2027-01-01T00:00:00Z' },
        createdAt: new Date('2027-01-01'),
      },
    ]);
    const reopened = await service['reference'](
      attempt,
      db as unknown as Prisma.TransactionClient,
    );
    expect(first).toEqual(reopened);
    expect(first).toMatchObject({
      status: 'ready',
      observedAt: completedAt.toISOString(),
      expectedCorrect: 0.6,
      itemCount: 1,
    });
    expect(predictor).toHaveBeenCalledTimes(2);
    for (const call of predictor.mock.calls)
      expect(call[2]!.getTime()).toBe(completedAt.getTime() + 1);
  });
  it('waits for historical outbox events but does not fabricate a score', async () => {
    const predictor = jest.spyOn(trained.TrainedDas3h.prototype, 'predictMany');
    db.masteryOutbox.findMany.mockResolvedValue([
      {
        payload: { occurredAt: completedAt.toISOString() },
        createdAt: completedAt,
      },
    ]);
    expect(
      await service['reference'](
        attempt,
        db as unknown as Prisma.TransactionClient,
      ),
    ).toMatchObject({ status: 'pending' });
    expect(predictor).not.toHaveBeenCalled();
  });
});
