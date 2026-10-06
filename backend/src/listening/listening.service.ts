import { BadRequestException, ForbiddenException, Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerDto, ProgressDto, SegmentDto, SettingsDto, SourceDto, SubtitleDto } from './listening.dto';
import { cloze, gradeText, mergeCues, parseSubtitles, youtubeId } from './listening-core';
import { LocalAsrProvider } from './local-asr.provider';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

@Injectable()
export class ListeningService {
  constructor(private readonly prisma: PrismaService, @InjectQueue('listening-transcript') private readonly queue: Queue, private readonly asr: LocalAsrProvider) {}
  settings() { return this.prisma.listeningSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }); }
  async limit(userId: number, action: string, maximum?: number) {
    const settings = await this.settings(); const redis = await this.queue.getBackend().client;
    const key = `listening-limit:${userId}:${action}:${Math.floor(Date.now() / 3600000)}`;
    redis.defineCommand('listeningRateLimit', { numberOfKeys: 1, lua: "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 3600) end; return n" });
    const count = Number(await redis.runCommand('listeningRateLimit', [key]));
    if (count > (maximum ?? settings.requestsPerHour)) throw new HttpException('Bạn đã đạt giới hạn yêu cầu trong giờ này. Hãy tiếp tục bài đã lưu.', 429);
  }
  async source(userId: number, id: number, admin = false) {
    const source = await this.prisma.listeningSource.findUnique({ where: { id } });
    if (!source || source.deletedAt || (!admin && source.ownerId !== userId && !(source.ownerId === null && source.published))) throw new NotFoundException('Không tìm thấy nguồn học.');
    return source;
  }
  async removeSource(userId: number, id: number) {
    const source = await this.prisma.listeningSource.findFirst({ where: { id, ownerId: userId } });
    if (!source) throw new NotFoundException('Không tìm thấy bài cá nhân.');
    await this.prisma.listeningSource.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, removed: true };
  }
  async restoreSource(userId: number, id: number) {
    const source = await this.prisma.listeningSource.findFirst({ where: { id, ownerId: userId } });
    if (!source) throw new NotFoundException('Không tìm thấy bài cá nhân.');
    return this.prisma.listeningSource.update({ where: { id }, data: { deletedAt: null } });
  }
  async list(userId: number) {
    const [sources, sessions, settings] = await Promise.all([
      this.prisma.listeningSource.findMany({ where: { deletedAt: null, OR: [{ ownerId: userId }, { ownerId: null, published: true }] }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.listeningSession.findMany({ where: { userId, source: { deletedAt: null } }, include: { source: { select: { title: true, kind: true } } }, orderBy: { updatedAt: 'desc' }, take: 30 }), this.settings(),
    ]);
    return { sources, sessions, settings, asrAvailable: this.asr.available() };
  }
  async createSource(userId: number, dto: SourceDto, admin = false) {
    await this.limit(userId, 'source');
    if (!admin && dto.kind !== 'YOUTUBE') throw new ForbiddenException('Học viên có thể thêm link YouTube cá nhân. Nguồn audio/video do admin quản lý.');
    let videoId: string | undefined;
    try {
      if (dto.kind === 'YOUTUBE') videoId = youtubeId(dto.url);
      else if (!/^\/api\/listening\/media\/[\w.-]+$/.test(dto.url) && !/^\/listening-demo\.wav$/.test(dto.url)) {
        const url = new URL(dto.url); if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Nguồn media cần là URL HTTPS hoặc file hệ thống.');
      }
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'URL không hợp lệ.'); }
    const source = await this.prisma.listeningSource.create({ data: { title: dto.title.trim() || 'Bài Listening', kind: dto.kind, url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : dto.url, videoId, ownerId: admin ? null : userId, published: admin && !!dto.published } });
    if (videoId) await this.requestTranscript(userId, source.id, admin);
    return source;
  }
  async requestTranscript(userId: number, sourceId: number, admin = false, range?: { start?: number; end?: number }) {
    const source = await this.source(userId, sourceId, admin);
    if (!source.videoId) throw new BadRequestException('Nguồn thư viện do người biên soạn chuẩn bị lời thoại.');
    const settings = await this.settings();
    const start = range?.start ?? 0; const end = range?.end ?? start + settings.defaultSegmentSeconds;
    if (end <= start || end - start > settings.maxSegmentSeconds || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 86400) throw new BadRequestException('Đoạn nhận dạng không hợp lệ.');
    const cached = await this.transcriptFor(sourceId, source.videoId, { start, end });
    if (cached?.status === 'READY' && (!cached.expiresAt || cached.expiresAt > new Date())) return { id: cached.id, status: cached.status };
    const cacheKey = `youtube:${source.videoId}:en:v2:${start}:${end}`;
    let transcript = await this.prisma.listeningTranscript.findUnique({ where: { cacheKey } });
    if (transcript?.status === 'READY' && transcript.expiresAt && transcript.expiresAt > new Date()) return { id: transcript.id, status: transcript.status };
    if (transcript && ['PENDING', 'PROCESSING'].includes(transcript.status)) return { id: transcript.id, status: transcript.status };
    await this.limit(userId, 'transcript');
    if (transcript?.status === 'READY') {
      await this.prisma.listeningTranscript.updateMany({ where: { id: transcript.id, cacheKey }, data: { cacheKey: null } }); transcript = null;
    }
    if (!transcript) {
      // Unique cache key coalesces concurrent requests from different users.
      transcript = await this.prisma.listeningTranscript.upsert({ where: { cacheKey }, update: {}, create: { sourceId, cacheKey, version: randomUUID(), provider: 'youtube', status: 'FAILED' } });
    }
    const claimed = await this.prisma.listeningTranscript.updateMany({ where: { id: transcript.id, status: 'FAILED', attempts: { lt: 3 } }, data: { attempts: { increment: 1 }, status: 'PENDING', error: null } });
    if (!claimed.count) { if (transcript.attempts >= 3) throw new BadRequestException('Đã thử lấy phụ đề 3 lần. Bạn có thể nghe tự do hoặc chọn bài khác.'); return { id: transcript.id, status: 'PENDING' }; }
    try { await this.queue.add('fetch', { transcriptId: transcript.id, videoId: source.videoId, ttlHours: settings.transcriptTtlHours, start, end }, { jobId: `transcript-${transcript.id}`, removeOnComplete: true, removeOnFail: 100 }); }
    catch { await this.prisma.listeningTranscript.update({ where: { id: transcript.id }, data: { status: 'FAILED', error: 'Hàng đợi chưa sẵn sàng. Vui lòng thử lại.' } }); throw new BadRequestException('Hàng đợi chưa sẵn sàng.'); }
    return { id: transcript.id, status: 'PENDING' };
  }
  async transcriptFor(sourceId: number, videoId: string | null, range?: { start: number; end: number }) {
    const coverage = range ? { OR: [{ segmentStart: null }, { segmentStart: { lte: range.start }, segmentEnd: { gte: range.end } }] } : {};
    const local = await this.prisma.listeningTranscript.findFirst({ where: { sourceId, provider: { in: ['uploaded-subtitles', 'user-text', 'demo', 'local-audio'] }, status: 'READY', cacheKey: null, ...coverage }, orderBy: { createdAt: 'desc' } });
    if (local) return local;
    if (!videoId) return this.prisma.listeningTranscript.findFirst({ where: { sourceId, ...coverage }, orderBy: { createdAt: 'desc' } });
    const ready = await this.prisma.listeningTranscript.findFirst({ where: { cacheKey: { startsWith: `youtube:${videoId}:en:` }, status: 'READY', ...coverage }, orderBy: { createdAt: 'desc' } });
    if (ready) return ready;
    // Unfinished range jobs must be looked up by the exact requested range.
    return this.prisma.listeningTranscript.findFirst({ where: { OR: [{ sourceId, provider: 'local-audio', status: { in: ['PENDING', 'PROCESSING', 'FAILED'] }, ...(range ? { segmentStart: range.start, segmentEnd: range.end } : {}) }, { cacheKey: range ? `youtube:${videoId}:en:v2:${range.start}:${range.end}` : { startsWith: `youtube:${videoId}:en:` } }] }, orderBy: { createdAt: 'desc' } });
  }
  async uploadAudio(userId: number, id: number, data: Buffer, start: number, end: number) {
    const source = await this.source(userId, id);
    if (source.ownerId !== userId) throw new ForbiddenException('Chỉ bổ sung audio cho bài cá nhân.');
    if (!this.asr.available()) throw new BadRequestException('Bộ nhận dạng audio chưa sẵn sàng.');
    const settings = await this.settings();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 86400 || end <= start || end - start > settings.maxSegmentSeconds) throw new BadRequestException('Chọn đoạn audio tối đa 5 phút.');
    if (!data.length || data.length > 10_000_000) throw new BadRequestException('Audio tối đa 10 MB.');
    const wav = data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WAVE';
    const mp3 = data.subarray(0, 3).toString() === 'ID3' || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0);
    const mp4 = data.subarray(4, 8).toString() === 'ftyp';
    const webm = data.subarray(0, 4).toString('hex') === '1a45dfa3';
    if (!(wav || mp3 || mp4 || webm)) throw new BadRequestException('Chọn audio WAV, MP3, M4A hoặc WebM hợp lệ.');
    await this.limit(userId, 'asr-upload', 3);
    const active = await this.prisma.listeningTranscript.findFirst({ where: { sourceId: id, provider: 'local-audio', status: { in: ['PENDING', 'PROCESSING'] } } });
    if (active) return { id: active.id, status: active.status };
    const directory = resolve('storage/asr-input'); await mkdir(directory, { recursive: true });
    const audioPath = resolve(directory, `${randomUUID()}.${wav ? 'wav' : mp3 ? 'mp3' : mp4 ? 'm4a' : 'webm'}`);
    await writeFile(audioPath, data);
    const transcript = await this.prisma.listeningTranscript.create({ data: { sourceId: id, version: randomUUID(), provider: 'local-audio', segmentStart: start, segmentEnd: end, status: 'PENDING' } });
    try {
      await this.queue.add('audio', { transcriptId: transcript.id, videoId: source.videoId, ttlHours: settings.transcriptTtlHours, start, end, audioPath }, { jobId: `transcript-${transcript.id}`, removeOnComplete: true, removeOnFail: 100 });
    } catch {
      await rm(audioPath, { force: true });
      await this.prisma.listeningTranscript.update({ where: { id: transcript.id }, data: { status: 'FAILED', error: 'Hàng đợi chưa sẵn sàng.' } });
      throw new BadRequestException('Hàng đợi chưa sẵn sàng.');
    }
    return { id: transcript.id, status: 'PENDING' };
  }
  async sourceStatus(userId: number, id: number, admin = false, range?: { start: number; end: number }) {
    const source = await this.source(userId, id, admin); const transcript = await this.transcriptFor(id, source.videoId, range);
    const duration = transcript?.status === 'READY' ? (await this.prisma.listeningUnit.aggregate({ where: { transcriptId: transcript.id }, _max: { end: true } }))._max.end : null;
    return { source, transcript: transcript ? { id: transcript.id, status: transcript.status, error: transcript.error, attempts: transcript.attempts, version: transcript.version, provider: transcript.provider, duration, segmentStart: transcript.segmentStart, segmentEnd: transcript.segmentEnd } : null };
  }
  async importTranscript(userId: number, id: number, dto: SubtitleDto, admin = false) {
    await this.source(userId, id, admin);
    if (!admin) throw new ForbiddenException('Lời thoại do người biên soạn quản lý.');
    await this.limit(userId, 'import'); const settings = await this.settings();
    if (Buffer.byteLength(dto.text) > settings.maxSubtitleBytes) throw new BadRequestException('File phụ đề vượt giới hạn dung lượng.');
    let units;
    try {
      if (dto.format === 'TEXT') {
        if (dto.start === undefined || dto.end === undefined || dto.end <= dto.start || dto.end - dto.start > settings.maxSegmentSeconds) throw new Error('Lời thoại thuần cần mốc bắt đầu/kết thúc cho một đoạn tối đa 5 phút.');
        if (dto.text.trim().split(/\s+/).length > 200) throw new Error('Nhập tối đa 200 từ cho một đơn vị lời thoại thuần.');
        units = [{ start: dto.start, end: dto.end, text: dto.text.trim() }];
        if (!units[0].text) throw new Error('Lời thoại không được để trống.');
      } else units = mergeCues(parseSubtitles(dto.text));
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Phụ đề không hợp lệ.'); }
    if (units.length > 5000) throw new BadRequestException('Quá nhiều câu phụ đề.');
    const version = createHash('sha256').update(JSON.stringify({ text: dto.text, format: dto.format, ...(dto.format === 'TEXT' ? { start: dto.start, end: dto.end } : {}) })).digest('hex');
    const existing = await this.prisma.listeningTranscript.findFirst({ where: { sourceId: id, language: 'en', version, status: 'READY' } });
    if (existing) return this.prisma.listeningTranscript.update({ where: { id: existing.id }, data: { createdAt: new Date() }, select: { id: true, status: true, version: true } });
    return this.prisma.listeningTranscript.create({ data: { sourceId: id, version, provider: dto.format === 'TEXT' ? 'user-text' : 'uploaded-subtitles', status: 'READY', units: { create: units.map((cue, position) => ({ ...cue, position })) } }, select: { id: true, status: true, version: true } });
  }
  async start(userId: number, dto: SegmentDto) {
    const source = await this.source(userId, dto.sourceId); const settings = await this.settings();
    if (dto.end <= dto.start || dto.end - dto.start > settings.maxSegmentSeconds) throw new BadRequestException(`Chọn đoạn từ 1 đến ${settings.maxSegmentSeconds} giây.`);
    await this.limit(userId, 'session', 60);
    const transcript = await this.transcriptFor(source.id, source.videoId, dto);
    if (source.videoId && transcript?.status !== 'READY') await this.requestTranscript(userId, source.id, false, dto);
    const session = await this.prisma.listeningSession.create({ data: { userId, sourceId: source.id, transcriptId: transcript?.status === 'READY' ? transcript.id : null, start: dto.start, end: dto.end } });
    return this.session(userId, session.id);
  }
  async ownedSession(userId: number, id: number) {
    const session = await this.prisma.listeningSession.findFirst({ where: { id, userId }, include: { source: true, transcript: { select: { provider: true } } } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên học.');
    await this.source(userId, session.sourceId);
    return session;
  }
  units(session: { transcriptId: number | null; start: number; end: number }) {
    return this.prisma.listeningUnit.findMany({ where: { transcriptId: session.transcriptId ?? -1, start: { gte: session.start }, end: { lte: session.end } }, orderBy: { position: 'asc' } });
  }
  async session(userId: number, id: number) {
    let session = await this.ownedSession(userId, id);
    if (!session.transcriptId) {
      const transcript = await this.transcriptFor(session.sourceId, session.source.videoId, session);
      if (transcript?.status === 'READY') { await this.prisma.listeningSession.update({ where: { id }, data: { transcriptId: transcript.id } }); session = { ...session, transcriptId: transcript.id, transcript: { provider: transcript.provider } }; }
    }
    const units = await this.units(session); const index = Math.min(session.currentIndex, Math.max(0, units.length - 1));
    const unit = units[index]; const exercise = unit ? cloze(unit.text, session.difficulty) : null;
    const answered = unit ? await this.prisma.listeningAnswer.findFirst({ where: { sessionId: id, unitId: unit.id, mode: session.mode, difficulty: session.difficulty }, orderBy: { createdAt: 'desc' }, select: { feedback: true } }) : null;
    return { ...session, currentIndex: index, totalUnits: units.length, feedback: answered?.feedback ?? null, settings: await this.settings(), unit: unit ? { id: unit.id, start: unit.start, end: unit.end, ...(session.mode === 'CLOZE' ? { tokens: exercise!.tokens } : {}), wordCount: unit.text.split(/\s+/).length } : null };
  }
  async progress(userId: number, id: number, dto: ProgressDto) {
    const session = await this.ownedSession(userId, id); const units = await this.units(session);
    if (dto.currentIndex !== undefined && dto.currentIndex >= Math.max(1, units.length)) throw new BadRequestException('Vị trí câu không hợp lệ.');
    await this.prisma.listeningSession.update({ where: { id }, data: dto });
    return this.session(userId, id);
  }
  async answer(userId: number, id: number, dto: AnswerDto) {
    await this.limit(userId, 'answer', 240);
    const session = await this.ownedSession(userId, id); const units = await this.units(session); const unit = units[session.currentIndex];
    if (!unit || dto.unitId !== unit.id || dto.mode !== session.mode || dto.difficulty !== session.difficulty) throw new BadRequestException('Câu hoặc chế độ đã thay đổi. Hãy tải lại bài.');
    const exercise = cloze(unit.text, dto.difficulty);
    let result;
    try { result = dto.mode === 'SPEAK' ? { score: 0, words: [], selfReview: true } : gradeText(dto.mode === 'CLOZE' ? exercise.answers.join(' ') : unit.text, dto.answer); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Đáp án không hợp lệ.'); }
    const automatic = ['local-whisper', 'local-audio', 'youtube-auto'].includes(session.transcript?.provider || '');
    const feedback = { ...result, expected: unit.text, blankAnswers: dto.mode === 'CLOZE' ? exercise.answers : [], note: dto.mode === 'SPEAK' ? 'Tự đối chiếu bản ghi; không chấm phát âm.' : automatic ? 'So khớp với lời thoại tự động, có thể có lỗi nhận dạng. Điểm này chỉ dùng để luyện tập.' : 'So khớp văn bản, không suy đoán nguyên nhân nghe sai.' };
    await this.prisma.listeningAnswer.create({ data: { sessionId: id, unitId: unit.id, mode: dto.mode, difficulty: dto.difficulty, submitted: dto.answer, score: result.score, feedback } });
    return feedback;
  }
  async hint(userId: number, id: number) {
    const session = await this.ownedSession(userId, id); const unit = (await this.units(session))[session.currentIndex];
    if (!unit) throw new BadRequestException('Chưa có câu luyện.');
    return { hint: session.mode === 'CLOZE' ? `Chữ đầu các từ: ${cloze(unit.text, session.difficulty).hint}` : `Câu có khoảng ${unit.text.split(/\s+/).length} từ. Hãy nghe lại ở tốc độ chậm hơn.` };
  }
  async report(userId: number, sourceId: number, reason: string) {
    await this.source(userId, sourceId); await this.limit(userId, 'report', 10);
    return this.prisma.listeningReport.create({ data: { userId, sourceId, reason } });
  }
  async adminOverview() {
    return { sources: await this.prisma.listeningSource.findMany({ where: { ownerId: null }, orderBy: { createdAt: 'desc' } }), reports: await this.prisma.listeningReport.findMany({ where: { resolved: false }, take: 100, include: { source: { select: { title: true } } } }), failed: await this.prisma.listeningTranscript.findMany({ where: { status: 'FAILED' }, take: 100, select: { id: true, sourceId: true, error: true, attempts: true } }), settings: await this.settings() };
  }
  async publish(id: number, published: boolean) {
    const source = await this.prisma.listeningSource.findUnique({ where: { id } });
    if (!source || source.ownerId !== null) throw new ForbiddenException('Không xuất bản bài cá nhân của học viên.');
    return this.prisma.listeningSource.update({ where: { id }, data: { published } });
  }
  async updateSettings(dto: SettingsDto) {
    if (dto.defaultSegmentSeconds > dto.maxSegmentSeconds) throw new BadRequestException('Đoạn mặc định phải ngắn hơn giới hạn phiên.');
    return this.prisma.listeningSettings.upsert({ where: { id: 1 }, create: { id: 1, ...dto }, update: dto });
  }
}
