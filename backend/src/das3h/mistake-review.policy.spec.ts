import { MISTAKE_REVIEW_LIMITS, planMistakeReview, summarizeQuestions } from './mistake-review.policy';

const now = new Date('2026-11-24T12:00:00Z');
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000);
const row = (questionId: number, skillId: number, isCorrect: boolean, hoursAgo: number) => ({ questionId, skillId, isCorrect, createdAt: at(hoursAgo) });
const skill = (skillId: number, masteryScore: number | null = 0.4, part = 5) => ({ skillId, skillName: `Kỹ năng ${skillId}`, part, masteryScore });

describe('mistake review policy', () => {
  it('counts one answer once even when the question carries several skills', () => {
    const q = summarizeQuestions([row(1, 10, false, 5), row(1, 11, false, 5), row(1, 10, true, 2), row(1, 11, true, 2)], now).get(1)!;
    expect(q).toMatchObject({ attempts: 2, wrongCount: 1, correctStreak: 1, skillIds: [10, 11], open: true, due: false });
  });

  it('rests a question for a day after one correct retry and resolves it after two', () => {
    expect(summarizeQuestions([row(1, 10, false, 50), row(1, 10, true, 30)], now).get(1)).toMatchObject({ open: true, due: true });
    expect(summarizeQuestions([row(1, 10, false, 50), row(1, 10, true, 3)], now).get(1)).toMatchObject({ open: true, due: false });
    expect(summarizeQuestions([row(1, 10, false, 50), row(1, 10, true, 30), row(1, 10, true, 2)], now).get(1)).toMatchObject({ open: false, due: false });
    expect(summarizeQuestions([row(1, 10, true, 50), row(1, 10, true, 30)], now).get(1)).toMatchObject({ open: false, wrongCount: 0 });
  });

  it('does not count an answer remembered right after seeing the solution', () => {
    const quick = summarizeQuestions([row(1, 10, false, 48), { ...row(1, 10, true, 48), createdAt: new Date(at(48).getTime() + 60000) }], now).get(1)!;
    expect(quick).toMatchObject({ correctStreak: 0, open: true, due: true });
    const sameDay = summarizeQuestions([row(1, 10, false, 50), row(1, 10, true, 30), row(1, 10, true, 29)], now).get(1)!;
    expect(sameDay).toMatchObject({ correctStreak: 1, open: true, due: true });
  });

  it('shows only a few weak skills and a few questions each, reporting what is hidden', () => {
    const rows = [1, 2, 3, 4, 5].flatMap(s => [1, 2, 3, 4, 5].map(q => row(s * 100 + q, s, false, q)));
    const plan = planMistakeReview(rows, [1, 2, 3, 4, 5].map(id => skill(id)), now);
    expect(plan.skills).toHaveLength(MISTAKE_REVIEW_LIMITS.skills);
    expect(plan.skills.every(s => s.questions.length === MISTAKE_REVIEW_LIMITS.questionsPerSkill)).toBe(true);
    expect(plan).toMatchObject({ openMistakes: 25, dueMistakes: 25, hiddenDueMistakes: 16 });
  });

  it('does not recommend a strong skill for one isolated slip', () => {
    const rows = [row(1, 10, false, 1), ...[2, 3, 4, 5, 6, 7].map(q => row(q, 10, true, q))];
    expect(planMistakeReview(rows, [skill(10, 0.85)], now).skills).toEqual([]);
    expect(planMistakeReview(rows, [skill(10, 0.45)], now).skills[0].questions.map(q => q.questionId)).toEqual([1]);
  });

  it('ranks repeated mistakes first, then questions the model still expects to be missed', () => {
    const rows = [row(1, 10, false, 9), row(1, 10, false, 8), row(2, 10, false, 7), row(3, 10, false, 6), row(4, 10, false, 5)];
    const plan = planMistakeReview(rows, [skill(10)], now, new Map([[2, 0.8], [3, 0.3], [4, 0.6], [1, 0.9]]));
    expect(plan.skills[0].questions.map(q => q.questionId)).toEqual([1, 3, 4]);
    expect(plan.skills[0].questions[1].predictedProbability).toBe(0.3);
  });

  it('prioritises the weaker skill and never repeats a shared question', () => {
    const rows = [row(1, 10, false, 3), row(1, 11, false, 3), row(2, 11, false, 2), row(3, 10, false, 1)];
    const plan = planMistakeReview(rows, [skill(10, 0.55), skill(11, 0.2)], now);
    expect(plan.skills.map(s => s.skillId)).toEqual([11, 10]);
    const ids = plan.skills.flatMap(s => s.questions.map(q => q.questionId));
    expect(new Set(ids).size).toBe(ids.length);
    expect(plan.skills[0].reason).toContain('mức nắm vững 20%');
  });

  it('leaves out excluded questions such as live-exam or unpublished items', () => {
    const rows = [row(1, 10, false, 2), row(2, 10, false, 1)];
    const plan = planMistakeReview(rows, [skill(10)], now, new Map(), new Set([2]));
    expect(plan.skills[0].questions.map(q => q.questionId)).toEqual([1]);
    expect(plan.openMistakes).toBe(1);
  });
});
