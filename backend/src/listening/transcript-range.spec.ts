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
