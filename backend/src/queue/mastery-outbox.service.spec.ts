import { jest } from '@jest/globals';
import { MasteryOutboxService } from './mastery-outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from '../das3h/das3h.service';

describe('Durable mastery outbox', () => {
  const payload = { userId: 1, questionId: 2, isCorrect: true, skillIds: [3], occurredAt: '2026-01-01T00:00:00.000Z', itemDifficulty: 0.7 };
  const first = { id: 'exam-1-2', payload, attempts: 0, createdAt: new Date(payload.occurredAt), nextAttemptAt: new Date(0) };
  const tx = { $executeRaw: jest.fn<(...args: any[]) => Promise<any>>(), masteryOutbox: { findFirst: jest.fn<(...args: any[]) => Promise<any>>(), update: jest.fn<(...args: any[]) => Promise<any>>() } };
  const db = { $queryRaw: jest.fn<(...args: any[]) => Promise<any>>(), $transaction: jest.fn<(...args: any[]) => Promise<any>>(), masteryOutbox: { updateMany: jest.fn<(...args: any[]) => Promise<any>>() } };
  const das3h = { recordAndSync: jest.fn<(...args: any[]) => Promise<void>>() };
  let worker: MasteryOutboxService;
  beforeEach(() => {
    jest.resetAllMocks();
    db.$queryRaw.mockResolvedValue([first]);
    db.$transaction.mockImplementation(fn => fn(tx));
    tx.masteryOutbox.findFirst.mockResolvedValueOnce(first).mockResolvedValue(null);
    worker = new MasteryOutboxService(db as unknown as PrismaService, das3h as unknown as Das3hService);
  });
  it('preserves occurrence and difficulty and commits acknowledgement in the same locked transaction', async () => {
    await worker.flush();
    expect(das3h.recordAndSync).toHaveBeenCalledWith(1, 2, true, [3], first.id, { occurredAt: payload.occurredAt, itemDifficulty: 0.7 }, tx);
    expect(tx.masteryOutbox.update).toHaveBeenCalledWith({ where: { id: first.id }, data: { processedAt: expect.any(Date), lastError: null } });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.masteryOutbox.findFirst.mock.invocationCallOrder[0]);
  });
  it('keeps failed events pending with backoff', async () => {
    das3h.recordAndSync.mockRejectedValue(new Error('database disconnected'));
    await worker.flush();
    expect(db.masteryOutbox.updateMany).toHaveBeenCalledWith({ where: { id: first.id, processedAt: null }, data: { attempts: { increment: 1 }, lastError: 'Error: database disconnected', nextAttemptAt: expect.any(Date) } });
    expect(tx.masteryOutbox.update).not.toHaveBeenCalled();
  });
  it('does not overtake an earlier event waiting for retry', async () => {
    tx.masteryOutbox.findFirst.mockReset().mockResolvedValue({ ...first, id: 'earlier', nextAttemptAt: new Date(Date.now() + 60000) });
    await worker.flush();
    expect(das3h.recordAndSync).not.toHaveBeenCalled();
  });
  it('rechecks after the lock and does not deliver an acknowledged event twice', async () => {
    tx.masteryOutbox.findFirst.mockReset().mockResolvedValue(null);
    await worker.flush();
    expect(das3h.recordAndSync).not.toHaveBeenCalled();
  });
});
