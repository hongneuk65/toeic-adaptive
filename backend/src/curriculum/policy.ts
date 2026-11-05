import { BadRequestException } from '@nestjs/common';
import type { Question, Unit } from './catalog';

export const CURRICULUM_VERSION = 'curriculum-v1';
export const PASS_PERCENT = 80;
// Product policy, not an empirically calibrated optimal spacing schedule.
export const REVIEW_DAYS = [1, 3, 7, 14] as const;
export interface UnitState {
 unitId: string; completedAt: Date | null; bestScore: number;
 reviewStage: number; nextReviewAt: Date | null; lastAttemptAt: Date;
}
export interface UnitSummary {
 id: string; title: string; minutes: number; objectives: string[]; prerequisites: string[];
 unlocked: boolean; completed: boolean; bestScore: number | null; reviewStage: number; nextReviewAt: string | null;
}
export function unitSummary(unit: Unit, states: UnitState[], eligible: boolean): UnitSummary {
 const state = states.find(s => s.unitId === unit.id);
 const completed = Boolean(state?.completedAt);
 return {
  id: unit.id, title: unit.title, minutes: unit.minutes, objectives: unit.objectives,
  prerequisites: unit.prerequisites,
  unlocked: completed || (eligible && unit.prerequisites.every(id => states.some(s => s.unitId === id && s.completedAt))),
  completed, bestScore: state ? state.bestScore : null,
  reviewStage: state?.reviewStage ?? 0, nextReviewAt: state?.nextReviewAt?.toISOString() ?? null,
 };
}
export function safeCheckpoint(question: Question) {
 return { id: question.id, kind: question.kind, prompt: question.prompt, options: question.options };
}
export function gradeCheckpoint(questions: Question[], answers: Record<string, number>) {
 if (!answers || typeof answers !== 'object' || Array.isArray(answers) || !questions.length ||
   Object.keys(answers).length !== questions.length || questions.some(q => !Object.hasOwn(answers, q.id) ||
   !Number.isInteger(answers[q.id]) || answers[q.id] < 0 || answers[q.id] >= q.options.length)) {
  throw new BadRequestException('Hãy trả lời đầy đủ từng câu bằng một phương án hợp lệ.');
 }
 const results = questions.map(q => ({ questionId: q.id, selectedAnswer: answers[q.id],
  correctAnswer: q.answer, isCorrect: answers[q.id] === q.answer, explanation: q.explanation }));
 const correct = results.filter(r => r.isCorrect).length;
 const score = Math.round(correct / questions.length * 100);
 return { score, correct, total: questions.length, passed: correct / questions.length >= PASS_PERCENT / 100, results };
}
export function advanceReview(previous: UnitState | undefined, passed: boolean, score: number, now: Date): UnitState {
 const day = (days: number) => new Date(now.getTime() + days * 86_400_000);
 const next: UnitState = previous ? { ...previous, lastAttemptAt: now, bestScore: Math.max(previous.bestScore, score) } : {
  unitId: '', completedAt: null, bestScore: score, reviewStage: 0, nextReviewAt: null, lastAttemptAt: now,
 };
 if (!next.completedAt) {
  if (passed) { next.completedAt = now; next.nextReviewAt = day(REVIEW_DAYS[0]); }
  return next;
 }
 // An early repeat cannot consume a delayed review or change its date.
 if (!next.nextReviewAt || now.getTime() < next.nextReviewAt.getTime()) return next;
 if (!passed) { next.nextReviewAt = day(1); return next; }
 next.reviewStage = Math.min(REVIEW_DAYS.length, next.reviewStage + 1);
 next.nextReviewAt = next.reviewStage < REVIEW_DAYS.length ? day(REVIEW_DAYS[next.reviewStage]) : null;
 return next;
}
/** Vietnam has a fixed UTC+7 offset and no daylight-saving transition. */
export function studyDayWindow(now: Date) {
 const offset = 7 * 60 * 60 * 1000;
 const local = new Date(now.getTime() + offset);
 const date = local.toISOString().slice(0, 10);
 const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset);
 return { date, start, end: new Date(start.getTime() + 86_400_000) };
}
export function dailyStudySummary(
 units: { id: string; minutes: number }[],
 attempts: { unitId: string; result: unknown }[],
 budgetMinutes: number,
 now: Date,
) {
 const passed = new Set(attempts.filter(a => a.result && typeof a.result === 'object' &&
  (a.result as { passed?: unknown }).passed === true).map(a => a.unitId));
 // This is lesson workload, not a measurement of time actually spent studying.
 const completedMinutes = units.filter(u => passed.has(u.id)).reduce((sum,u) => sum + u.minutes,0);
 return { date: studyDayWindow(now).date, budgetMinutes, completedMinutes,
  remainingMinutes: Math.max(0,budgetMinutes-completedMinutes) };
}
export function chooseToday<T extends UnitSummary & { trackId: string }>(units: T[], activeTrackId: string, budget: number, now: Date) {
 if (budget <= 0) return [];
 const due = units.filter(u => u.completed && u.nextReviewAt && new Date(u.nextReviewAt).getTime() <= now.getTime())
  .sort((a,b) => a.nextReviewAt!.localeCompare(b.nextReviewAt!) || a.id.localeCompare(b.id));
 const fresh = units.filter(u => u.trackId === activeTrackId && u.unlocked && !u.completed);
 const candidates = [...due.map(u => ({ ...u, reason: 'review' as const })), ...fresh.map(u => ({ ...u, reason: 'new' as const }))];
 const selected: (T & { reason: 'review' | 'new' })[] = [];
 let minutes = 0;
 for (const unit of candidates) {
  if (selected.length && minutes + unit.minutes > budget) break;
  selected.push(unit); minutes += unit.minutes;
  if (minutes >= budget) break;
 }
 return selected;
}
