import { jest } from '@jest/globals';
import { HttpException, ExecutionContext } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventEmitter } from 'node:events';
import { withRateLimitTimeout } from './rate-limit-timeout';
import { RequestBudgetGuard } from './request-budget.guard';
import { ReadingService } from '../reading/reading.service';
import { ListeningService } from '../listening/listening.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingAiService } from '../reading/reading-ai.service';
import { LocalAsrProvider } from '../listening/local-asr.provider';

describe('bounded distributed rate limit checks', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  const never = () => new Promise<never>(() => undefined);
  async function timesOut(promise: Promise<unknown>) {
    const rejected = expect(promise).rejects.toMatchObject({ status: 503 });
    await jest.advanceTimersByTimeAsync(3001);
    await rejected;
    expect(jest.getTimerCount()).toBe(0);
  }
  it('returns 503 for a never-ready Reading client without claiming generation', async () => {
    const updateMany = jest.fn();
    const db = { readingArticle: { updateMany } };
    const queue = { getBackend: () => ({ client: never() }) } as unknown as Queue;
    const service = new ReadingService(db as unknown as PrismaService, queue, {} as ReadingAiService);
    jest.spyOn(service, 'article').mockResolvedValue({ id: 5, ownerId: 7, generationAttempts: 0, status: 'FAILED' } as never);
    await timesOut(service.enqueue(7, 5));
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('returns 503 for a hung Listening command without creating a source', async () => {
    const create = jest.fn();
    const client = { defineCommand: jest.fn(), runCommand: never };
    const queue = { getBackend: () => ({ client: Promise.resolve(client) }) } as unknown as Queue;
    const service = new ListeningService({ listeningSource: { create } } as unknown as PrismaService, queue, {} as LocalAsrProvider);
    jest.spyOn(service, 'settings').mockResolvedValue({ requestsPerHour: 10 } as never);
    await timesOut(service.createSource(7, { title: 'Video', kind: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=abcdef12345' }));
    expect(create).not.toHaveBeenCalled();
  });
  it('bounds request-budget acquisition without attaching response listeners', async () => {
    const response = Object.assign(new EventEmitter(), { setHeader: jest.fn() });
    const context = { switchToHttp: () => ({ getRequest: () => ({ path: '/rag/chat', method: 'POST', user: { id: 7 } }), getResponse: () => response }) } as ExecutionContext;
    const queue = { getBackend: () => ({ client: never() }) } as unknown as Queue;
    await timesOut(new RequestBudgetGuard(queue).canActivate(context));
    expect(response.listenerCount('close')).toBe(0);
  });
  it('clears successful timers and preserves real quota rejection', async () => {
    expect(await withRateLimitTimeout(async () => 2)).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
    const rejection = new HttpException('Quota exceeded', 429);
    await expect(withRateLimitTimeout(async () => { throw rejection; })).rejects.toBe(rejection);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('does not send a command when a client resolves after the deadline', async () => {
    let ready!: (value: unknown) => void;
    const client = { runCommand: jest.fn() };
    const pending = new Promise(resolve => { ready = resolve; });
    await timesOut(withRateLimitTimeout(async signal => {
      await pending;
      signal.throwIfAborted();
      client.runCommand();
    }));
    ready(client);
    await Promise.resolve();
    expect(client.runCommand).not.toHaveBeenCalled();
  });
});
