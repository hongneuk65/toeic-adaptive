import { jest } from '@jest/globals';
import { ListeningService } from './listening.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { Queue } from 'bullmq';
import type { LocalAsrProvider } from './local-asr.provider';

it('requires audio range coverage and looks up pending jobs by exact range', async () => {
  const findFirst = jest.fn<(value: unknown) => Promise<unknown>>().mockResolvedValue(null);
  const service = new ListeningService({ listeningTranscript: { findFirst } } as unknown as PrismaService, {} as Queue, {} as LocalAsrProvider);
  await service.transcriptFor(5, 'dQw4w9WgXcQ', { start: 180, end: 240 });
  expect(findFirst.mock.calls[0][0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ OR: [{ segmentStart: null }, { segmentStart: { lte: 180 }, segmentEnd: { gte: 240 } }] }) }));
  expect(findFirst.mock.calls[2][0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ cacheKey: 'youtube:dQw4w9WgXcQ:en:v2:180:240' }]) }) }));
});

describe('retrying failed transcripts', () => {
  function fixture(expired: boolean) {
    const transcript = { id: 7, status: 'FAILED', attempts: 3, expiresAt: null };
    const updateMany = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>()
      .mockResolvedValueOnce({ count: expired ? 1 : 0 })
      .mockResolvedValueOnce({ count: expired ? 1 : 0 });
    const add = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({});
    const service = new ListeningService({ listeningTranscript: { findUnique: async () => transcript, updateMany } } as unknown as PrismaService, { add } as unknown as Queue, {} as LocalAsrProvider);
    jest.spyOn(service, 'source').mockResolvedValue({ videoId: 'dQw4w9WgXcQ' } as Awaited<ReturnType<ListeningService['source']>>);
    jest.spyOn(service, 'settings').mockResolvedValue({ defaultSegmentSeconds: 180, maxSegmentSeconds: 300, transcriptTtlHours: 24 } as Awaited<ReturnType<ListeningService['settings']>>);
    jest.spyOn(service, 'transcriptFor').mockResolvedValue(null);
    jest.spyOn(service, 'limit').mockResolvedValue();
    return { service, add, updateMany };
  }
  it('reopens old failed lessons without bypassing rate limiting or atomic claiming', async () => {
    const f = fixture(true);
    await expect(f.service.requestTranscript(1, 5)).resolves.toEqual({ id: 7, status: 'PENDING' });
    expect(f.service.limit).toHaveBeenCalledWith(1, 'transcript');
    expect(f.updateMany.mock.calls[0][0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ status: 'FAILED', attempts: { gte: 3 }, OR: expect.any(Array) }), data: { attempts: 0 } }));
    expect(f.add).toHaveBeenCalledTimes(1);
  });
  it('keeps the cooldown for three recent failures', async () => {
    const f = fixture(false);
    await expect(f.service.requestTranscript(1, 5)).rejects.toThrow('một giờ');
    expect(f.add).not.toHaveBeenCalled();
  });
});
