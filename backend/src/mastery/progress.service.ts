import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86400000;
const dateKey = (date: Date) => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
export interface ProgressRow { questionId: number; skillId: number; isCorrect: boolean; createdAt: Date; }
export interface ProgressQuestion { id: number; part: number; difficulty: string; }
export function aggregateProgress(rows: ProgressRow[], first: ProgressRow[], questions: ProgressQuestion[], now: Date, days: number, part = 0, difficulty = 'ALL', priorMistakes: { questionId: number; skillId: number }[] = []) {
  const catalog = new Map(questions.map(q => [q.id, q]));
  const initial = new Map(first.map(r => [`${r.questionId}:${r.skillId}`, r]));
  const buckets = new Map(Array.from({ length: days }, (_, i) => [dateKey(new Date(now.getTime() - (days - 1 - i) * DAY)), { date: dateKey(new Date(now.getTime() - (days - 1 - i) * DAY)), attempts: 0, newQuestions: 0, newCorrect: 0, revisits: 0, repeatedErrors: 0, corrected: 0 }]));
  // One answer can generate several skill rows. Count the answer once.
  const events = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const q = catalog.get(row.questionId);
    if (!q || (part && q.part !== part) || (difficulty !== 'ALL' && q.difficulty !== difficulty)) continue;
    const key = `${row.questionId}:${row.createdAt.toISOString()}`;
    events.set(key, [...(events.get(key) || []), row]);
  }
  const missed = new Set(priorMistakes.map(r => `${r.questionId}:${r.skillId}`));
  for (const [key, row] of initial) if (!row.isCorrect) missed.add(key);
  for (const event of [...events.values()].sort((a,b) => a[0].createdAt.getTime() - b[0].createdAt.getTime())) {
    const row = event[0], bucket = buckets.get(dateKey(row.createdAt));
    if (!bucket || row.createdAt > now) continue;
    bucket.attempts++;
    const isFirst = event.every(r => initial.get(`${r.questionId}:${r.skillId}`)?.createdAt.getTime() === r.createdAt.getTime());
    if (isFirst) { bucket.newQuestions++; bucket.newCorrect += Number(row.isCorrect); }
    else if (event.some(r => missed.has(`${r.questionId}:${r.skillId}`))) {
      bucket.revisits++; bucket.repeatedErrors += Number(!row.isCorrect); bucket.corrected += Number(row.isCorrect);
    }
    for (const r of event) if (!r.isCorrect) missed.add(`${r.questionId}:${r.skillId}`);
  }
  return { days, timezone: 'Asia/Ho_Chi_Minh', points: [...buckets.values()], truncated: false };
}
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}
  async forUser(userId: number, daysText = '30', partText = '0', difficulty = 'ALL') {
    const days = Number(daysText), part = Number(partText);
    if (![7,30,90].includes(days) || !Number.isInteger(part) || part < 0 || part > 7 || !['ALL','EASY','MEDIUM','HARD'].includes(difficulty)) throw new BadRequestException('Bộ lọc tiến bộ không hợp lệ.');
    const now = new Date();
    const start = new Date(`${dateKey(new Date(now.getTime() - (days-1)*DAY))}T00:00:00+07:00`);
    const rows = await this.prisma.studentSkillHistory.findMany({ where: { userId, createdAt: { gte: start, lte: now } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 20001, select: { questionId: true, skillId: true, isCorrect: true, createdAt: true } });
    const ids = [...new Set(rows.map(r => r.questionId))];
    if (!ids.length) return aggregateProgress([], [], [], now, days, part, difficulty);
    const [first, questions, priorMistakes] = await Promise.all([
      this.prisma.studentSkillHistory.findMany({ where: { userId, questionId: { in: ids } }, distinct: ['questionId','skillId'], orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { questionId: true, skillId: true, isCorrect: true, createdAt: true } }),
      this.prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, part: true, difficulty: true } }),
      this.prisma.studentSkillHistory.groupBy({ by: ['questionId','skillId'], where: { userId, questionId: { in: ids }, isCorrect: false, createdAt: { lt: start } } }),
    ]);
    const result = aggregateProgress(rows.slice(0,20000), first, questions, now, days, part, difficulty, priorMistakes);
    return { ...result, truncated: rows.length > 20000 };
  }
}
