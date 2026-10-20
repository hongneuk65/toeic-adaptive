import { jest } from '@jest/globals';
import { TranscriptProcessor } from './transcript.processor';
import { AsrError, LocalAsrProvider } from './local-asr.provider';
import { TranscriptProvider } from './transcript.provider';
import { PrismaService } from '../prisma/prisma.service';
import type { Job } from 'bullmq';

describe('caption to local ASR fallback', () => {
  const cues = [{ start: 120, end: 123, text: 'Please listen carefully.' }];
  function fixture() {
    const update = jest.fn<(data: unknown) => Promise<unknown>>().mockResolvedValue({});
    const createMany = jest.fn<(data: unknown) => Promise<unknown>>().mockResolvedValue({ count: 1 });
    const db = { listeningTranscript: { update }, listeningUnit: { createMany } };
    const prisma = { ...db, $transaction: async (callback: (value: typeof db) => Promise<void>) => callback(db) } as unknown as PrismaService;
    const fetchCaptions = jest.fn<TranscriptProvider['fetch']>();
    const fetchAudio = jest.fn<LocalAsrProvider['fetch']>();
    const asr = { available: () => true, fetch: fetchAudio } as unknown as LocalAsrProvider;
    const processor = new TranscriptProcessor(prisma, { fetch: fetchCaptions }, asr);
    const job = { data: { transcriptId: 42, videoId: 'dQw4w9WgXcQ', start: 120, end: 180, ttlHours: 24 } } as Job;
    return { processor, job, update, createMany, fetchCaptions, fetchAudio };
  }
  it('keeps captions preferred and avoids unnecessary ASR work', async () => {
    const f = fixture(); f.fetchCaptions.mockResolvedValue({ cues, provider: 'youtube-manual' });
    await f.processor.process(f.job);
    expect(f.fetchAudio).not.toHaveBeenCalled();
    expect(f.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'READY', provider: 'youtube-manual', segmentStart: null }) }));
  });
  it('recognizes the selected audio segment when CC is unavailable, preserving timestamps', async () => {
    const f = fixture(); f.fetchCaptions.mockRejectedValue(new Error('HTTP 429'));
    f.fetchAudio.mockResolvedValue({ cues, provider: 'local-whisper', segmentStart: 120, segmentEnd: 180 });
    await f.processor.process(f.job);
    expect(f.fetchAudio).toHaveBeenCalledWith('dQw4w9WgXcQ', 120, 180);
    expect(f.createMany).toHaveBeenCalledWith({ data: [{ ...cues[0], position: 0, transcriptId: 42 }] });
    expect(f.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'READY', segmentStart: 120, segmentEnd: 180 }) }));
  });
  it('reports inaccessible audio without creating invented answers', async () => {
    const f = fixture(); f.fetchCaptions.mockRejectedValue(new Error('No CC')); f.fetchAudio.mockRejectedValue(new AsrError('AUDIO_UNAVAILABLE'));
    await f.processor.process(f.job);
    expect(f.createMany).not.toHaveBeenCalled();
    expect(f.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', error: expect.stringContaining('audio') }) }));
  });
  it('uses ASR when existing captions do not cover the selected segment', async () => {
    const f = fixture();
    f.fetchCaptions.mockResolvedValue({ cues: [{ start: 0, end: 3, text: 'Earlier caption.' }], provider: 'youtube-auto' });
    f.fetchAudio.mockResolvedValue({ cues, provider: 'local-whisper', segmentStart: 120, segmentEnd: 180 });
    await f.processor.process(f.job);
    expect(f.fetchAudio).toHaveBeenCalledWith('dQw4w9WgXcQ', 120, 180);
    expect(f.createMany).toHaveBeenCalledWith({ data: [{ ...cues[0], position: 0, transcriptId: 42 }] });
  });
});
