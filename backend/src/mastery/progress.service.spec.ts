import { aggregateProgress, ProgressService } from './progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { jest } from '@jest/globals';
const now = new Date('2026-11-06T16:00:00Z');
const question = { id: 1, part: 5, difficulty: 'EASY' };
const row = (date: string, correct: boolean, skillId = 1) => ({ questionId: 1, skillId, isCorrect: correct, createdAt: new Date(date) });
describe('Observed learning progress', () => {
  it('counts multi-tag answers once and separates first answers from revisits', () => {
    const first = row('2026-11-05T01:00:00Z', false), repeat = row('2026-11-06T01:00:00Z', true);
    const result = aggregateProgress([first, { ...first, skillId: 2 }, repeat, { ...repeat, skillId: 2 }], [first, { ...first, skillId: 2 }], [question], now, 7);
    expect(result.points.at(-2)).toMatchObject({ attempts: 1, newQuestions: 1, newCorrect: 0, revisits: 0 });
    expect(result.points.at(-1)).toMatchObject({ attempts: 1, newQuestions: 0, revisits: 1, corrected: 1, repeatedErrors: 0 });
  });
  it('uses Vietnam dates, filters, empty dates and mistakes before the window', () => {
    const first = row('2026-10-01T00:00:00Z', true), repeat = row('2026-11-05T18:00:00Z', false);
    const result = aggregateProgress([repeat], [first], [question], now, 7, 5, 'EASY', [{ questionId: 1, skillId: 1 }]);
    expect(result.points).toHaveLength(7);
    expect(result.points.at(-1)).toMatchObject({ date: '2026-11-06', newQuestions: 0, revisits: 1, repeatedErrors: 1 });
    expect(result.points[0].attempts).toBe(0);
    expect(aggregateProgress([repeat], [first], [question], now, 7, 2).points.every(p => p.attempts === 0)).toBe(true);
    expect(aggregateProgress([repeat], [first], [question], now, 7, 0, 'HARD').points.every(p => p.attempts === 0)).toBe(true);
  });
  it('does not seed later mistakes into earlier answers', () => {
    const first = row('2026-10-01T00:00:00Z', true);
    const result = aggregateProgress([row('2026-11-04T00:00:00Z', true), row('2026-11-05T00:00:00Z', false), row('2026-11-06T00:00:00Z', true)], [first], [question], now, 7);
    expect(result.points.reduce((n, p) => n + p.revisits, 0)).toBe(1);
  });
  it('isolates user data and validates filters', async () => {
    const findMany = jest.fn<() => Promise<never[]>>().mockResolvedValue([]);
    const service = new ProgressService({ studentSkillHistory: { findMany } } as unknown as PrismaService);
    await service.forUser(7);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) }));
    await expect(service.forUser(7, '999')).rejects.toThrow();
  });
});
