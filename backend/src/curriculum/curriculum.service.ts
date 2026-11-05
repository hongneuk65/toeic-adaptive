import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CURRICULUM_TRACKS } from './catalog';
import type { EnrollCurriculumDto, SubmitCurriculumDto } from './curriculum.dto';
import { advanceReview, chooseToday, dailyStudySummary, studyDayWindow, CURRICULUM_VERSION, gradeCheckpoint, PASS_PERCENT, REVIEW_DAYS, safeCheckpoint, unitSummary } from './policy';
import type { UnitState } from './policy';

const RESEARCH_SOURCES = [
 { title: 'ETS: Năng lực nghe–đọc ở mức nâng cao', url: 'https://www.ets.org/pdfs/toeic/toeic-listening-reading-score-descriptors.pdf' },
 { title: 'ETS: Khóa học nâng cao Module 3', url: 'https://www.etsglobal.org/ps/en/preparation-tool/toeic-official-learning-and-preparation-course-module-3' },
 { title: 'IES: Ôn cách quãng, ví dụ mẫu và kiểm tra nhớ lại', url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/1' },
 { title: 'ETS: Cấu trúc khóa học TOEIC chính thức', url: 'https://www.etsglobal.org/nc/en/content/toeic-official-learning-and-preparation-course' },
 { title: 'Settles & Meeder (2016): Lịch ôn từ vựng HLR', url: 'https://aclanthology.org/P16-1174/' },
 { title: 'ETS: Tham chiếu điểm TOEIC với CEFR', url: 'https://www.ets.org/pdfs/toeic/toeic-mapping-cefr-reference.pdf' },
];
const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Original curriculum evidence stays separate from calibrated DAS3H observations. */
@Injectable()
export class CurriculumService {
 constructor(private readonly prisma: PrismaService) {}
 private locate(id: string) {
  for (const track of CURRICULUM_TRACKS) {
   const unit = track.units.find(u => u.id === id);
   if (unit) return { track, unit };
  }
  throw new NotFoundException('Không tìm thấy bài học trong lộ trình.');
 }
 private async lock(db: Prisma.TransactionClient, userId: number) {
  // Serialize enrollment changes and submissions for this learner, including distinct request IDs.
  await db.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::bigint)`;
 }
 async overview(userId: number) {
  const now = new Date();
  const window = studyDayWindow(now);
  const [enrollment, states, attempts] = await Promise.all([
   this.prisma.curriculumEnrollment.findUnique({ where: { userId } }),
   this.prisma.curriculumProgress.findMany({ where: { userId } }),
   this.prisma.curriculumAttempt.findMany({ where: { userId, createdAt: { gte: window.start, lt: window.end },
    result: { path: ['passed'], equals: true } }, select: { unitId: true, result: true } }),
  ]);
  const tracks = CURRICULUM_TRACKS.map(track => ({
   id: track.id, title: track.title, band: track.band, description: track.description,
   units: track.units.map(unit => unitSummary(unit, states, enrollment?.trackId === track.id)),
  }));
  const active = tracks.find(track => track.id === enrollment?.trackId);
  const all = tracks.flatMap(track => track.units.map(unit => ({ ...unit, trackId: track.id })));
  const daySummary = dailyStudySummary(all, attempts, enrollment?.minutesPerDay ?? 0, now);
  const passedToday = new Set(attempts.filter(a => a.result && typeof a.result === 'object' &&
   !Array.isArray(a.result) && a.result.passed === true).map(a => a.unitId));
  return {
   version: CURRICULUM_VERSION, tracks,
   enrollment: enrollment ? { trackId: enrollment.trackId, minutesPerDay: enrollment.minutesPerDay,
    startedAt: enrollment.startedAt.toISOString(), updatedAt: enrollment.updatedAt.toISOString() } : null,
   progress: { completed: active?.units.filter(u => u.completed).length ?? 0, total: active?.units.length ?? 0,
    reviewDue: all.filter(u => u.completed && u.nextReviewAt && new Date(u.nextReviewAt) <= now).length },
   daySummary,
   today: enrollment ? chooseToday(all.filter(u => !passedToday.has(u.id)), enrollment.trackId, daySummary.remainingMinutes, now) : [],
   researchSources: RESEARCH_SOURCES,
   policy: { passPercent: PASS_PERCENT, reviewDays: REVIEW_DAYS, scoreType: 'curriculum-checkpoint-percent',
    note: 'Khoảng điểm là mục tiêu thiết kế, không phải dự đoán hay cam kết điểm TOEIC. Lịch ôn và ngưỡng đạt là chính sách thử nghiệm.' },
  };
 }
 async enroll(userId: number, dto: EnrollCurriculumDto) {
  if (!CURRICULUM_TRACKS.some(t => t.id === dto.trackId) || ![15,30,45,60].includes(dto.minutesPerDay)) {
   throw new BadRequestException('Chọn lộ trình và thời lượng học hợp lệ.');
  }
  await this.prisma.$transaction(async db => {
   await this.lock(db, userId);
   await db.curriculumEnrollment.upsert({ where: { userId },
    create: { userId, trackId: dto.trackId, minutesPerDay: dto.minutesPerDay, catalogVersion: CURRICULUM_VERSION },
    update: { trackId: dto.trackId, minutesPerDay: dto.minutesPerDay, catalogVersion: CURRICULUM_VERSION },
   });
  });
  return this.overview(userId);
 }
 async unit(userId: number, id: string) {
  const { track, unit } = this.locate(id);
  const [enrollment, states] = await Promise.all([
   this.prisma.curriculumEnrollment.findUnique({ where: { userId } }),
   this.prisma.curriculumProgress.findMany({ where: { userId } }),
  ]);
  const access = unitSummary(unit, states, enrollment?.trackId === track.id);
  if (!access.unlocked) throw new ConflictException('Chọn lộ trình và hoàn thành bài kiến thức nền trước khi mở bài này.');
  return { ...unit, checkpoint: unit.checkpoint.map(safeCheckpoint), trackId: track.id, access };
 }
 async submit(userId: number, id: string, dto: SubmitCurriculumDto) {
  const { track, unit } = this.locate(id);
  if (typeof dto.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(dto.requestId)) {
   throw new BadRequestException('Mã gửi bài không hợp lệ.');
  }
  if (!dto.answers || typeof dto.answers !== 'object' || Array.isArray(dto.answers) || Object.keys(dto.answers).length > 100) {
   throw new BadRequestException('Câu trả lời không hợp lệ.');
  }
  const canonical = JSON.stringify({ unitId: id, answers: Object.keys(dto.answers).sort().map(key => [key, dto.answers[key]]) });
  const payloadHash = createHash('sha256').update(canonical).digest('hex');
  return this.prisma.$transaction(async db => {
   await this.lock(db, userId);
   const prior = await db.curriculumAttempt.findUnique({ where: { userId_requestId: { userId, requestId: dto.requestId } } });
   if (prior) {
    if (prior.unitId !== id || prior.payloadHash !== payloadHash) throw new ConflictException('Mã gửi bài đã được dùng cho câu trả lời khác.');
    return { ...(prior.result as object), attemptId: prior.id };
   }
   const grade = gradeCheckpoint(unit.checkpoint, dto.answers);
   const [enrollment, states] = await Promise.all([
    db.curriculumEnrollment.findUnique({ where: { userId } }),
    db.curriculumProgress.findMany({ where: { userId } }),
   ]);
   const access = unitSummary(unit, states, enrollment?.trackId === track.id);
   if (!access.unlocked) throw new ConflictException('Bài học chưa được mở trong lộ trình của bạn.');
   const previous = states.find(state => state.unitId === id);
   const state = advanceReview(previous, grade.passed, grade.score, new Date());
   const { unitId: unused, ...data } = state;
   void unused;
   const saved = await db.curriculumProgress.upsert({ where: { userId_unitId: { userId, unitId: id } },
    create: { userId, unitId: id, ...data }, update: { ...data, revision: { increment: 1 } },
   });
   const progress = unitSummary(unit, [...states.filter(s => s.unitId !== id), saved] as UnitState[], true);
   const result = { unitId: id, ...grade, progress };
   const attempt = await db.curriculumAttempt.create({ data: {
    userId, unitId: id, requestId: dto.requestId, catalogVersion: CURRICULUM_VERSION, payloadHash,
    answers: json(dto.answers), result: json(result),
   } });
   return { ...result, attemptId: attempt.id };
  });
 }
}
