import { nextReview } from './review-schedule';
describe('flashcard review spacing', () => {
  const now = new Date('2026-10-18T00:00:00Z');
  it('extends successful recall and caps at thirty days', () => {
    for (const [old, days] of [[0, 1], [1, 3], [3, 7], [7, 14], [14, 30], [30, 30]]) {
      expect(nextReview(true, old, now)).toEqual({ intervalDays: days, dueAt: new Date(now.getTime() + days * 86400000) });
    }
  });
  it('resets forgotten cards to ten minutes', () => {
    expect(nextReview(false, 30, now)).toEqual({ intervalDays: 0, dueAt: new Date(now.getTime() + 600000) });
  });
});
