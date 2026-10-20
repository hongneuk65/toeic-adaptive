import { jest } from '@jest/globals';
import { ListeningService } from './listening.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { Queue } from 'bullmq';
import type { LocalAsrProvider } from './local-asr.provider';

it('clamps default range to measured imported audio before looking up timed ASR', async () => {
  const service = new ListeningService({ question: { findMany: async () => [{ stimulus: { audioDurationSeconds: 42 } }] }, listeningUnit: { aggregate: async () => ({ _max: { end: 41 } }) } } as unknown as PrismaService, {} as Queue, {} as LocalAsrProvider);
  jest.spyOn(service, 'source').mockResolvedValue({ id: 2, url: '/api/exam/media/source.mp3', ownerId: null, videoId: null } as Awaited<ReturnType<ListeningService['source']>>);
  const lookup = jest.spyOn(service, 'transcriptFor').mockResolvedValue(null);
  await service.sourceStatus(1, 2, false, { start: 0, end: 180 });
  expect(lookup).toHaveBeenCalledWith(2, null, { start: 0, end: 42 });
});

it('does not allow library ASR to fetch arbitrary remote media or private files', async () => {
  const service = new ListeningService({} as PrismaService, {} as Queue, {} as LocalAsrProvider);
  const source = jest.spyOn(service, 'source');
  for (const url of ['https://example.com/audio.mp3', '/api/exam/media/../../secret.mp3']) {
    source.mockResolvedValue({ id: 2, url, ownerId: null, videoId: null } as Awaited<ReturnType<ListeningService['source']>>);
    await expect(service.requestTranscript(1, 2)).rejects.toThrow('người biên soạn');
  }
});
