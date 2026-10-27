import {
  buildPlacementPool,
  desiredDifficulty,
  formFingerprint,
  PlacementGroup,
  PlacementQuestion,
  PlacementResponse,
  placementResult,
  QUOTAS,
  selectPlacementGroup,
  snapshotFingerprint,
} from './placement-policy';
import {
  questionFingerprint,
  TrainedModel,
  WINDOWS_MS,
} from '../das3h/trained-das3h';

function bank() {
  let id = 0;
  const rows: PlacementQuestion[] = [];
  for (let part = 1; part <= 7; part++)
    for (let g = 0; g < 18; g++) {
      const size =
        part === 3 || part === 4 ? 3 : part === 6 ? 4 : part === 7 ? 3 : 1;
      for (let position = 1; position <= size; position++)
        rows.push({
          id: ++id,
          part,
          difficulty: ['EASY', 'MEDIUM', 'HARD'][g % 3],
          itemDifficulty: 0,
          content: 'Question',
          optionA: 'One',
          optionB: 'Two',
          optionC: 'Three',
          optionD: 'Four',
          correctAnswer: 'A',
          explanation: null,
          passage: part >= 6 ? `passage-${part}-${g}` : null,
          audioUrl: part <= 4 ? `/audio-${part}-${g}.mp3` : null,
          imageUrl: part === 1 ? '/photo.jpg' : null,
          stimulus: {
            groupId: `${part}-${g}`,
            questionPosition: position,
            audioDurationSeconds: 10,
          },
          skills: [{ skillId: part, skill: { name: `Skill ${part}` } }],
        });
    }
  return buildPlacementPool(rows);
}
function answer(group: PlacementGroup, correct = true): PlacementResponse[] {
  return group.questions.map((q) => ({
    questionId: q.id,
    part: q.part,
    groupKey: group.key,
    selectedAnswer: correct ? 'A' : 'B',
    isCorrect: correct,
    occurredAt: new Date(0).toISOString(),
  }));
}
function simulate(seed: string, previous: PlacementGroup[][] = []) {
  const pool = bank(),
    issued: PlacementGroup[] = [],
    responses: PlacementResponse[] = [];
  for (let i = 0; i < 43; i++) {
    const next = selectPlacementGroup(pool, issued, responses, seed, previous);
    if (!next) break;
    issued.push(next);
    responses.push(...answer(next));
  }
  return { issued, responses };
}
describe('placement rules: scope and causal selection', () => {
  it('starts neutral, raises difficulty after corroborating success, lowers after errors', () => {
    expect(desiredDifficulty([], 5)).toBe(1);
    const group = bank().find((g) => g.part === 5)!;
    expect(desiredDifficulty([...answer(group), ...answer(group)], 5)).toBe(2);
    expect(
      desiredDifficulty([...answer(group, false), ...answer(group, false)], 5),
    ).toBe(0);
    expect(desiredDifficulty(answer(group, false), 3)).toBe(1);
  });
  it('preserves complete stimulus groups and all Part quotas without repeated questions', () => {
    const { issued, responses } = simulate('one');
    expect(responses.length).toBeGreaterThanOrEqual(40);
    expect(responses.length).toBeLessThanOrEqual(42);
    expect(new Set(responses.map((r) => r.questionId)).size).toBe(
      responses.length,
    );
    for (const [part, count] of Object.entries(QUOTAS))
      expect(
        responses.filter((r) => r.part === Number(part)).length,
      ).toBeGreaterThanOrEqual(count);
    expect(
      issued
        .filter((g) => g.part === 3 || g.part === 4)
        .every((g) => g.questions.length === 3),
    ).toBe(true);
  });
  it('is reproducible per seed, produces varied forms, and avoids recent complete forms', () => {
    const a = simulate('a');
    expect(formFingerprint(a.issued)).toBe(
      formFingerprint(simulate('a').issued),
    );
    expect(formFingerprint(a.issued)).not.toBe(
      formFingerprint(simulate('b').issued),
    );
    const next = simulate('a', [a.issued]);
    expect(formFingerprint(next.issued)).not.toBe(formFingerprint(a.issued));
    expect(next.responses.length).toBeGreaterThanOrEqual(40);
    const seen = new Set(a.responses.map((r) => r.questionId));
    expect(next.responses.every((r) => !seen.has(r.questionId))).toBe(true);
  });
  it('does not drop an entire Part just because other Parts still have unseen items', () => {
    const pool = bank(),
      recent = pool.filter((g) => g.part === 1);
    expect(selectPlacementGroup(pool, [], [], 'one', [recent])?.part).toBe(1);
  });
  it('does not diagnose mastery from three answers on one shared passage', () => {
    const g = bank().find((g) => g.part === 3)!;
    const result = placementResult([g], answer(g));
    expect(result.topics[0].status).toBe('insufficient');
    expect(result.topics[0].independentGroups).toBe(1);
    expect(result).not.toHaveProperty('toeicScore');
    expect(result).not.toHaveProperty('cefr');
  });
  it('rejects incomplete groups, unlabeled questions and nonmeasured listening clips', () => {
    const g = bank().find((g) => g.part === 3)!;
    expect(buildPlacementPool(g.questions.slice(0, 2))).toEqual([]);
    expect(
      buildPlacementPool([{ ...bank()[0].questions[0], skills: [] }]),
    ).toEqual([]);
    expect(
      buildPlacementPool([
        { ...bank()[0].questions[0], stimulus: { audioDurationSeconds: 0 } },
      ]),
    ).toEqual([]);
  });
  it('bank edit fingerprint is insensitive to PostgreSQL JSONB property ordering', () => {
    expect(snapshotFingerprint({ a: { x: 1, y: 2 }, b: [3, 4] })).toBe(
      snapshotFingerprint({ b: [3, 4], a: { y: 2, x: 1 } }),
    );
    expect(snapshotFingerprint({ a: 1 })).not.toBe(
      snapshotFingerprint({ a: 2 }),
    );
  });
  it('uses verified fitted variation even when every source label is MEDIUM and delta is constant', () => {
    const rows = bank()
      .filter((g) => g.part === 5)
      .flatMap((g) => g.questions)
      .map((q) => ({
        ...q,
        difficulty: 'MEDIUM',
        itemDifficulty: 11.5,
        explanation: `[santa-ednet:q${q.id}] Fixture`,
      }));
    const model: TrainedModel = {
      schemaVersion: 1,
      featureContract: 'own-das3h-d0-cumulative-v1',
      version: 'own-das3h-1234567890abcdef',
      intercept: 0,
      windowsMs: WINDOWS_MS,
      questions: {},
      skills: {},
      applicationBridge: {},
      releaseGatePassed: true,
      sourceHashes: {},
      metrics: {},
      cohort: {},
      mappingStatus: 'fixture',
    };
    rows.forEach((q, i) => {
      model.questions[`q${q.id}`] = {
        bias: (i - 9) / 3,
        tags: [],
        part: 5,
        correctAnswer: 'A',
      };
      model.applicationBridge[`q${q.id}`] = questionFingerprint(q);
    });
    const pool = buildPlacementPool(rows, model);
    expect(new Set(pool.map((g) => g.difficultyLevel))).toEqual(
      new Set([0, 1, 2]),
    );
    expect(pool[0].difficultyLevel).toBe(2);
    expect(pool.at(-1)!.difficultyLevel).toBe(0);
    expect(pool.every((g) => g.difficultySource === 'trained-baseline')).toBe(
      true,
    );
    const invalid = buildPlacementPool(
      [{ ...rows[0], content: 'Edited' }],
      model,
    );
    expect(invalid[0].difficultySource).toBe('catalog-label');
  });
  it('looks ahead for unequal Reading groups [5,2,5] instead of silently stopping at 39', () => {
    const full = bank(),
      rows: PlacementQuestion[] = [];
    for (let part = 1; part <= 6; part++)
      rows.push(
        ...full
          .filter((g) => g.part === part)
          .slice(
            0,
            part === 3 || part === 4 ? 2 : part === 6 ? 1 : QUOTAS[part],
          )
          .flatMap((g) => g.questions),
      );
    const base = full.find((g) => g.part === 7)!.questions[0];
    let id = 10000;
    [5, 2, 5].forEach((size, g) => {
      for (let i = 1; i <= size; i++)
        rows.push({
          ...base,
          id: ++id,
          passage: `mixed-${g}`,
          stimulus: { groupId: `mixed-${g}`, questionPosition: i },
        });
    });
    const pool = buildPlacementPool(rows),
      issued: PlacementGroup[] = [],
      responses: PlacementResponse[] = [];
    for (let i = 0; i < 43; i++) {
      const next = selectPlacementGroup(pool, issued, responses, '3', []);
      if (!next) break;
      issued.push(next);
      responses.push(...answer(next));
    }
    expect(responses).toHaveLength(42);
    expect(responses.filter((r) => r.part === 7)).toHaveLength(10);
  });
});
