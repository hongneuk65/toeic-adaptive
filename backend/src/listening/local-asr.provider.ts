import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { mergeCues, type Cue } from './listening-core';

const execute = promisify(execFile);
export class AsrError extends Error {
  constructor(public readonly code: string) { super(code); }
}

@Injectable()
export class LocalAsrProvider {
  private readonly audioMetadata = new Map<string, { until: number; result: Promise<{ url: string; duration: number }> }>();
  private resolveAudio(videoId: string) {
    const cached = this.audioMetadata.get(videoId);
    if (cached && cached.until > Date.now()) return cached.result;
    if (this.audioMetadata.size >= 32) this.audioMetadata.delete(this.audioMetadata.keys().next().value!);
    const result = this.python('resolve', ['--video', videoId, '--node', process.execPath], 45_000).then(metadata => {
      const url = new URL(metadata.url);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.googlevideo.com') || url.username || url.password) throw new AsrError('INVALID_AUDIO_SOURCE');
      if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) throw new AsrError('INVALID_SEGMENT');
      return metadata as { url: string; duration: number };
    });
    this.audioMetadata.set(videoId, { until: Date.now() + 120_000, result });
    void result.catch(() => { if (this.audioMetadata.get(videoId)?.result === result) this.audioMetadata.delete(videoId); });
    return result;
  }
  available() {
    return process.env.LISTENING_ASR_ENABLED === 'true' && !!process.env.LISTENING_ASR_MODEL_DIR
      && ['model.bin', 'config.json', 'tokenizer.json'].every(name => existsSync(join(process.env.LISTENING_ASR_MODEL_DIR!, name)));
  }
  private async python(command: string, args: string[], timeout: number) {
    try {
      const result = await execute(process.env.LISTENING_ASR_PYTHON || 'python', [resolve(__dirname, '../../scripts/listening-asr.py'), command,
        '--model', process.env.LISTENING_ASR_MODEL_DIR!, ...args], { timeout, maxBuffer: 500_000, windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', HF_HUB_OFFLINE: command === 'transcribe' ? '1' : '0' } });
      return JSON.parse(result.stdout);
    } catch (cause) {
      const error = cause as { stdout?: string; killed?: boolean };
      let code = error.killed ? 'ASR_TIMEOUT' : 'ASR_FAILED';
      try { code = JSON.parse(error.stdout || '{}').error || code; } catch { /* Never expose process stderr or signed URLs. */ }
      throw new AsrError(code);
    }
  }
  async transcribeFile(audio: string, start: number, end: number): Promise<Cue[]> {
    if (!this.available()) throw new AsrError('ASR_NOT_CONFIGURED');
    const result = await this.python('transcribe', ['--audio', audio], 240_000);
    if (!Array.isArray(result.cues)) throw new AsrError('ASR_FAILED');
    const cues = result.cues as Cue[];
    if (cues.some(cue => !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.end > end - start + 1 || typeof cue.text !== 'string')) throw new AsrError('ASR_FAILED');
    if (!cues.length) throw new AsrError('NO_SPEECH');
    const merged = mergeCues(cues.map(cue => ({ ...cue, start: cue.start + start, end: Math.min(cue.end + start, end) })));
    if (!merged.length) throw new AsrError('NO_SPEECH');
    return merged;
  }
  async fetch(videoId: string, start: number, end: number) {
    if (!this.available()) throw new AsrError('ASR_NOT_CONFIGURED');
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end - start > 300) throw new AsrError('INVALID_SEGMENT');
    const metadata = await this.resolveAudio(videoId);
    const url = new URL(metadata.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.googlevideo.com') || url.username || url.password) throw new AsrError('INVALID_AUDIO_SOURCE');
    if (!Number.isFinite(metadata.duration) || start >= metadata.duration) throw new AsrError('INVALID_SEGMENT');
    const segmentEnd = Math.min(end, metadata.duration);
    const directory = await mkdtemp(join(tmpdir(), 'toeic-asr-'));
    const audio = join(directory, 'segment.wav');
    try {
      try {
        // Audio-only HTTPS input, seek before decode, bounded output/time. No video or full lecture file.
        await execute(process.env.LISTENING_FFMPEG || 'ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error',
          '-protocol_whitelist', 'https,tls,tcp', '-rw_timeout', '15000000', '-ss', String(start), '-i', url.toString(),
          '-t', String(segmentEnd - start), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-fs', '10000000', '-y', audio],
        { timeout: 60_000, maxBuffer: 100_000, windowsHide: true });
      } catch { this.audioMetadata.delete(videoId); throw new AsrError('AUDIO_UNAVAILABLE'); }
      if ((await stat(audio)).size > 10_000_000) throw new AsrError('AUDIO_TOO_LARGE');
      return { cues: await this.transcribeFile(audio, start, segmentEnd), provider: 'local-whisper', segmentStart: start, segmentEnd: end };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async fromUpload(input: string, start: number, end: number) {
    if (!this.available()) throw new AsrError('ASR_NOT_CONFIGURED');
    const directory = await mkdtemp(join(tmpdir(), 'toeic-asr-'));
    const audio = join(directory, 'segment.wav');
    try {
      try {
        await execute(process.env.LISTENING_FFMPEG || 'ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error',
          '-protocol_whitelist', 'file', '-i', input, '-t', String(end - start), '-vn', '-ac', '1', '-ar', '16000',
          '-c:a', 'pcm_s16le', '-fs', '10000000', '-y', audio], { timeout: 60_000, maxBuffer: 100_000, windowsHide: true });
      } catch { throw new AsrError('AUDIO_UNAVAILABLE'); }
      return { cues: await this.transcribeFile(audio, start, end), provider: 'local-audio', segmentStart: start, segmentEnd: end };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}
