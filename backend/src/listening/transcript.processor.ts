import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TranscriptProvider, transcriptError } from './transcript.provider';
import { LocalAsrProvider, AsrError } from './local-asr.provider';
import { rm } from 'node:fs/promises';

@Processor('listening-transcript', { concurrency: 1 })
export class TranscriptProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService, private readonly provider: TranscriptProvider, private readonly asr: LocalAsrProvider) { super(); }
  async process(job: Job<{ transcriptId: number; videoId: string; ttlHours: number; start?: number; end?: number; audioPath?: string }>) {
    const { transcriptId, videoId, ttlHours } = job.data;
    await this.prisma.listeningTranscript.update({ where: { id: transcriptId }, data: { status: 'PROCESSING' } });
    try {
      let result: { cues: { start: number; end: number; text: string }[]; provider: string; segmentStart?: number; segmentEnd?: number };
      try {
        result = job.data.audioPath ? await this.asr.fromUpload(job.data.audioPath, job.data.start!, job.data.end!) : await this.provider.fetch(videoId);
        // A caption track can exist but contain no usable cue in the selected segment.
        if (!job.data.audioPath && job.data.start !== undefined && job.data.end !== undefined
          && !result.cues.some(cue => cue.start >= job.data.start! && cue.end <= job.data.end!)) {
          throw new AsrError('NO_SEGMENT_CAPTIONS');
        }
      }
      catch (captionError) {
        if (job.data.audioPath) throw captionError;
        if (!this.asr.available()) throw captionError;
        result = await this.asr.fetch(videoId, job.data.start ?? 0, job.data.end ?? 180);
      }
      await this.prisma.$transaction(async db => {
        await db.listeningUnit.createMany({ data: result.cues.map((cue, position) => ({ ...cue, position, transcriptId })) });
        await db.listeningTranscript.update({ where: { id: transcriptId }, data: { status: 'READY', error: null, provider: result.provider, segmentStart: result.segmentStart ?? null, segmentEnd: result.segmentEnd ?? null, expiresAt: new Date(Date.now() + ttlHours * 3600000) } });
      });
    } catch (error) {
      const message = error instanceof AsrError
        ? error.code === 'NO_SPEECH' ? 'Không nhận ra lời nói tiếng Anh trong đoạn này. Hãy chọn đoạn khác.'
          : error.code === 'ASR_TIMEOUT' ? 'Nhận dạng quá lâu. Hãy chọn đoạn ngắn hơn và thử lại.'
          : error.code === 'ASR_FAILED' || error.code === 'ASR_NOT_CONFIGURED' ? 'Bộ nhận dạng audio chưa sẵn sàng. Vui lòng thử lại sau.'
          : 'YouTube chưa cho phép truy cập audio của video này. Không thể tạo script; hãy thử video khác hoặc bổ sung file audio của đoạn.'
        : transcriptError(error);
      await this.prisma.listeningTranscript.update({ where: { id: transcriptId }, data: { status: 'FAILED', error: message } });
    } finally {
      if (job.data.audioPath) await rm(job.data.audioPath, { force: true });
    }
  }
}
