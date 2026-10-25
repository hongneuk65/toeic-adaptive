import { buildLearningPlan, type LearningPlanSkill } from './recommendation-policy';

describe('learning plan policy', () => {
  const now = new Date('2026-10-22T00:00:00.000Z');
  const skill = (id: number, overrides: Partial<LearningPlanSkill> = {}): LearningPlanSkill => ({
    skillId: id, skillCode: `SKILL_${id}`, skillName: `Kỹ năng ${id}`, part: 5,
    masteryScore: .8, practiceCount: 10, lastPracticed: '2026-10-21T00:00:00.000Z', ...overrides,
  });

  it('does not interpret cold-start model estimates as observed weakness', () => {
    const plan = buildLearningPlan([skill(2, { masteryScore: .01, practiceCount: 0 }), skill(1, { masteryScore: .99, practiceCount: 0 })], [], now);
    expect(plan.items.map(item => item.skillId)).toEqual([1, 2]);
    for (const item of plan.items) {
      expect(item.priority).toBe('diagnostic');
      expect(item.reviewDueAt).toBeNull();
      expect(item.reasons.join(' ')).not.toContain('còn thấp');
    }
  });

  it('moves an overdue strong skill ahead of recently practiced equally strong skill', () => {
    const plan = buildLearningPlan([skill(1), skill(2, { lastPracticed: '2026-10-01T00:00:00.000Z' })], [], now);
    expect(plan.items.map(item => item.skillId)).toEqual([2, 1]);
    expect(plan.items[0].priority).toBe('review');
    expect(plan.items[1].priority).toBe('maintain');
  });

  it('prioritizes observed weakness when recency and evidence match', () => {
    const plan = buildLearningPlan([skill(1), skill(2, { masteryScore: .3 })], [], now);
    expect(plan.items[0]).toMatchObject({ skillId: 2, priority: 'focus' });
    expect(plan.items[0].reasons).toHaveLength(2);
  });

  it('uses inclusive due boundaries and leaves the probability unchanged', () => {
    const input = skill(1, { masteryScore: .8, lastPracticed: '2026-10-19T00:00:00.000Z' });
    expect(buildLearningPlan([input], [], new Date(now.getTime() - 1)).items[0].priority).toBe('maintain');
    expect(buildLearningPlan([input], [], now).items[0]).toMatchObject({ priority: 'review', reviewDueAt: now.toISOString() });
    expect(input.masteryScore).toBe(.8);
  });

  it.each([[.4, 1], [.65, 3], [.85, 7]])('uses documented intervals for probability %s', (masteryScore, days) => {
    const result = buildLearningPlan([skill(1, { masteryScore, lastPracticed: now })], [], now).items[0];
    expect(result.reviewDueAt).toBe(new Date(now.getTime() + days * 86_400_000).toISOString());
  });

  it('bounds future timestamps and avoids invalid review dates', () => {
    const plan = buildLearningPlan([skill(1, { lastPracticed: '2040-01-01' }), skill(2, { lastPracticed: 'invalid' }), skill(3, { lastPracticed: null })], [], now);
    expect(plan.items.find(item => item.skillId === 1)?.reviewDueAt).toBe('2026-10-25T00:00:00.000Z');
    expect(plan.items.find(item => item.skillId === 2)?.reviewDueAt).toBeNull();
    expect(plan.items.find(item => item.skillId === 3)?.reviewDueAt).toBeNull();
  });

  it('keeps advanced practice available with an explicit soft foundation suggestion', () => {
    const advanced = skill(1, { skillCode: 'P5_SUBJECT_VERB_AGREE' });
    const base = skill(2, { skillCode: 'P5_PARTS_OF_SPEECH', practiceCount: 0 });
    const result = buildLearningPlan([advanced, base], [], now);
    const item = result.items.find(item => item.skillId === 1)!;
    expect(item.foundations).toEqual([{ skillId: 2, skillName: 'Kỹ năng 2', status: 'unassessed' }]);
    expect(item.reasons.join(' ')).toContain('vẫn có thể luyện');
    expect(item.score).toBeLessThan(buildLearningPlan([advanced], [], now).items[0].score);
    expect(result.items).toHaveLength(2);
  });

  it('ignores unavailable foundation codes and does not manufacture mastery', () => {
    expect(buildLearningPlan([skill(1, { skillCode: 'P7B_MULTI_INFERENCE' })], [], now).items[0].foundations).toEqual([]);
  });

  it('increases priority when evidence is limited without calling an untested skill weak', () => {
    const plan = buildLearningPlan([skill(1), skill(2, { practiceCount: 2 })], [], now);
    expect(plan.items.map(item => item.skillId)).toEqual([2, 1]);
    expect(plan.items[0].priority).toBe('diagnostic');
    expect(plan.items[0].reasons.join(' ')).toContain('Dữ liệu còn ít');
  });

  it('removes the foundation penalty after observed foundation performance improves', () => {
    const advanced = skill(1, { skillCode: 'P5_SUBJECT_VERB_AGREE' });
    const base = skill(2, { skillCode: 'P5_PARTS_OF_SPEECH', masteryScore: .4 });
    const before = buildLearningPlan([advanced, base], [], now).items.find(item => item.skillId === 1)!;
    const after = buildLearningPlan([advanced, { ...base, masteryScore: .8 }], [], now).items.find(item => item.skillId === 1)!;
    expect(before.foundations[0].status).toBe('needs-practice');
    expect(after.foundations).toEqual([]);
    expect(after.score).toBeGreaterThan(before.score);
  });

  it('sorts ties and picks exact-skill lessons deterministically without mutating inputs', () => {
    const skills = [skill(2), skill(1)];
    const lessons = [{ id: 5, skillId: 1, title: 'Lesson 5', part: 5 }, { id: 3, skillId: 1, title: 'Lesson 3', part: 5 }, { id: 1, skillId: 9, title: 'Other skill', part: 5 }];
    const plan = buildLearningPlan(skills, lessons, now);
    expect(plan.items.map(item => item.skillId)).toEqual([1, 2]);
    expect(plan.items[0].lesson?.id).toBe(3);
    expect(plan.items[1].lesson).toBeNull();
    expect(skills.map(item => item.skillId)).toEqual([2, 1]);
    expect(lessons.map(item => item.id)).toEqual([5, 3, 1]);
  });

  it('handles empty input and rejects invalid generation time', () => {
    expect(buildLearningPlan([], [], now)).toEqual({ version: 'learning-plan-v1', generatedAt: now.toISOString(), items: [] });
    expect(() => buildLearningPlan([], [], new Date('invalid'))).toThrow(RangeError);
  });

  it('reserves a visible review slot even with a large unassessed curriculum', () => {
    const skills = [1, 2, 3, 4].map(id => skill(id, { practiceCount: 0 }));
    skills.push(skill(5, { masteryScore: .95, lastPracticed: '2026-10-01T00:00:00Z' }));
    const plan = buildLearningPlan(skills, [], now);
    expect(plan.items.slice(0, 3).map(item => item.skillId)).toEqual([1, 2, 5]);
    expect(plan.items[2].priority).toBe('review');
    expect(new Set(plan.items.map(item => item.skillId)).size).toBe(5);
  });

  it('does not link a legacy verb lesson assigned to the word-form skill', () => {
    const plan = buildLearningPlan([skill(1, { skillCode: 'P5_PARTS_OF_SPEECH' })], [
      { id: 1, skillId: 1, title: 'Thì động từ & thể chủ động', part: 5 },
      { id: 2, skillId: 1, title: 'Từ loại trong câu', part: 5 },
    ], now);
    expect(plan.items[0].lesson?.id).toBe(2);
  });
});
