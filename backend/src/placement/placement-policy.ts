import { createHash } from 'node:crypto';
import {
  modelProbability,
  questionFingerprint,
  sourceQuestionId,
  TrainedModel,
} from '../das3h/trained-das3h';

export const POLICY_VERSION = 'placement-rules-v1';
export const MIN_QUESTIONS = 30;
export const MAX_QUESTIONS = 42;
export const QUOTAS: Record<number, number> = {
  1: 3,
  2: 5,
  3: 6,
  4: 6,
  5: 8,
  6: 4,
  7: 8,
};
export interface PlacementQuestion {
  id: number;
  part: number;
  difficulty: string;
  itemDifficulty: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  passage: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  explanation: string | null;
  stimulus: unknown;
  skills: { skillId: number; skill: { name: string } }[];
}
export interface PlacementGroup {
  key: string;
  part: number;
  questions: PlacementQuestion[];
  difficultyLevel?: number;
  difficultySource?: string;
  baselineProbability?: number;
}
export interface PlacementResponse {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  groupKey: string;
  part: number;
  occurredAt: string;
}
export function snapshotFingerprint(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonical(x)]),
          )
        : v;
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
export const LIMITATIONS = [
  'Đánh giá thích ứng theo quy tắc; chưa phải CAT dùng IRT đã hiệu chỉnh.',
  'Kết quả sơ bộ theo kỹ năng; không quy đổi điểm TOEIC hoặc CEFR.',
  'Nhóm câu chung tư liệu không được xem là các bằng chứng hoàn toàn độc lập.',
];

export function buildPlacementPool(
  questions: PlacementQuestion[],
  model: TrainedModel | null = null,
): PlacementGroup[] {
  const groups = new Map<string, PlacementGroup>();
  for (const q of questions) {
    const s = q.stimulus as {
      groupId?: string;
      questionPosition?: number;
    } | null;
    const shared =
      q.part === 3 || q.part === 4
        ? q.audioUrl
        : q.part >= 6
          ? s?.groupId || q.passage
          : String(q.id);
    if (!shared) continue;
    const key = `${q.part}:${shared}`;
    const group = groups.get(key) || { key, part: q.part, questions: [] };
    group.questions.push(q);
    groups.set(key, group);
  }
  const pool: PlacementGroup[] = [...groups.values()]
    .filter((g) => {
      const expected =
        g.part === 3 || g.part === 4 ? 3 : g.part === 6 ? 4 : null;
      if (expected !== null && g.questions.length !== expected) return false;
      if (g.part === 7 && (g.questions.length < 2 || g.questions.length > 5))
        return false;
      if (g.part <= 2 && g.questions.length !== 1) return false;
      return g.questions.every(
        (q) =>
          q.skills.length > 0 &&
          q.content &&
          q.optionA &&
          q.optionB &&
          q.optionC &&
          (q.part !== 1 || q.imageUrl) &&
          (q.part === 2
            ? /^[ABC]$/.test(q.correctAnswer)
            : !!q.optionD && /^[ABCD]$/.test(q.correctAnswer)),
      );
    })
    .filter(
      (g) =>
        g.part >= 5 ||
        g.questions.every(
          (q) =>
            !!q.audioUrl &&
            Number.isFinite(
              (q.stimulus as { audioDurationSeconds?: number })
                ?.audioDurationSeconds,
            ) &&
            Number(
              (q.stimulus as { audioDurationSeconds?: number })
                ?.audioDurationSeconds,
            ) > 0,
        ),
    )
    .map((g) => ({
      ...g,
      questions: g.questions.sort(
        (a, b) =>
          Number(
            (a.stimulus as { questionPosition?: number })?.questionPosition ??
              a.id,
          ) -
          Number(
            (b.stimulus as { questionPosition?: number })?.questionPosition ??
              b.id,
          ),
      ),
    }));
  const levels: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
  for (const group of pool) {
    group.difficultyLevel =
      group.questions.reduce((n, q) => n + (levels[q.difficulty] ?? 1), 0) /
      group.questions.length;
    group.difficultySource = 'catalog-label';
    if (!model) continue;
    const probabilities = group.questions.map((q) => {
      const source = sourceQuestionId(q);
      if (
        !source ||
        !model.questions[source] ||
        model.applicationBridge[source] !== questionFingerprint(q) ||
        (q.stimulus as { _trainedItemInvalidated?: boolean })
          ?._trainedItemInvalidated === true
      )
        return undefined;
      return modelProbability(model, source, new Map());
    });
    if (probabilities.every((p): p is number => p !== undefined)) {
      group.baselineProbability =
        probabilities.reduce((n, p) => n + p, 0) / probabilities.length;
      group.difficultySource = 'trained-baseline';
    }
  }
  // Relative tiers within each Part from fitted population baseline probabilities,
  // not IRT ability or an arbitrary conversion of constant catalog labels.
  for (const part of Object.keys(QUOTAS).map(Number)) {
    const trained = pool
      .filter((g) => g.part === part && g.baselineProbability !== undefined)
      .sort((a, b) => a.baselineProbability! - b.baselineProbability!);
    if (!trained.length) continue;
    const low =
      trained[Math.floor((trained.length - 1) / 3)].baselineProbability!;
    const high =
      trained[Math.floor((2 * (trained.length - 1)) / 3)].baselineProbability!;
    for (const group of trained)
      group.difficultyLevel =
        high - low < 1e-6
          ? 1
          : group.baselineProbability! <= low
            ? 2
            : group.baselineProbability! >= high
              ? 0
              : 1;
  }
  return pool;
}

export function canCompleteBlueprint(
  pool: PlacementGroup[],
  issued: PlacementGroup[],
  responses: PlacementResponse[],
  extra?: PlacementGroup,
): boolean {
  const used = new Set(
    [...issued, ...(extra ? [extra] : [])].map((g) => g.key),
  );
  const usedIds = new Set(
    [...issued, ...(extra ? [extra] : [])].flatMap((g) =>
      g.questions.map((q) => q.id),
    ),
  );
  let minimum = 0;
  for (const [p, quota] of Object.entries(QUOTAS)) {
    const part = Number(p),
      done =
        responses.filter((r) => r.part === part).length +
        (extra?.part === part ? extra.questions.length : 0),
      need = Math.max(0, quota - done);
    if (!need) continue;
    const sums = new Set([0]);
    // Snapshot sums: iterating the growing Set would reuse one group repeatedly.
    for (const group of pool.filter(
      (g) =>
        g.part === part &&
        !used.has(g.key) &&
        g.questions.every((q) => !usedIds.has(q.id)),
    ))
      for (const value of Array.from(sums))
        if (value + group.questions.length <= MAX_QUESTIONS)
          sums.add(value + group.questions.length);
    const sizes = [...sums].filter((n) => n >= need);
    if (!sizes.length) return false;
    minimum += Math.min(...sizes);
  }
  return (
    responses.length + (extra?.questions.length ?? 0) + minimum <= MAX_QUESTIONS
  );
}

export function formFingerprint(groups: PlacementGroup[]): string {
  return createHash('sha256')
    .update(
      groups
        .flatMap((g) => g.questions.map((q) => q.id))
        .sort((a, b) => a - b)
        .join(','),
    )
    .digest('hex');
}

export function desiredDifficulty(
  responses: PlacementResponse[],
  part: number,
): number {
  const recent = responses.filter((r) => r.part === part).slice(-6);
  const rate =
    (1 + recent.filter((r) => r.isCorrect).length) / (2 + recent.length);
  return rate >= 0.7 ? 2 : rate <= 0.4 ? 0 : 1;
}

/** Deterministic seeded choice among eligible candidates; no correctness from the current group is an input until submitted. */
export function selectPlacementGroup(
  pool: PlacementGroup[],
  issued: PlacementGroup[],
  responses: PlacementResponse[],
  seed: string,
  previousForms: PlacementGroup[][],
): PlacementGroup | undefined {
  const used = new Set(issued.flatMap((g) => g.questions.map((q) => q.id)));
  const usedKeys = new Set(issued.map((g) => g.key));
  const count = responses.length;
  if (
    count >= MIN_QUESTIONS &&
    Object.entries(QUOTAS).every(
      ([p, n]) => responses.filter((r) => r.part === Number(p)).length >= n,
    )
  )
    return undefined;
  let eligible = pool.filter(
    (g) =>
      !usedKeys.has(g.key) &&
      g.questions.every((q) => !used.has(q.id)) &&
      count + g.questions.length <= MAX_QUESTIONS,
  );
  // Prefer wholly unseen groups from recent attempts; relax only when the bank is too small.
  const recentIds = new Set(
    previousForms.flat(2).flatMap((g) => g.questions.map((q) => q.id)),
  );
  const orderedParts = Object.keys(QUOTAS)
    .map(Number)
    .sort((a, b) => {
      const ac = responses.filter((r) => r.part === a).length / QUOTAS[a];
      const bc = responses.filter((r) => r.part === b).length / QUOTAS[b];
      return ac - bc || a - b;
    });
  for (const part of orderedParts) {
    const partPool = eligible.filter((g) => g.part === part);
    const candidates = partPool;
    if (!candidates.length) continue;
    const target = desiredDifficulty(responses, part);
    const difficulty = (g: PlacementGroup) => g.difficultyLevel ?? 1;
    const rank = (g: PlacementGroup) =>
      createHash('sha256')
        .update(`${seed}:${issued.length}:${g.key}`)
        .digest()
        .readUInt32BE(0);
    const seen = (g: PlacementGroup) =>
      Number(g.questions.some((q) => recentIds.has(q.id)));
    candidates.sort(
      (a, b) =>
        seen(a) - seen(b) ||
        Math.abs(difficulty(a) - target) - Math.abs(difficulty(b) - target) ||
        rank(a) - rank(b),
    );
    // A candidate which would finish a duplicate form is excluded. Do not silently claim uniqueness if the pool is exhausted.
    const previousHashes = new Set(previousForms.map(formFingerprint));
    const choice = candidates.find(
      (g) =>
        !previousHashes.has(formFingerprint([...issued, g])) &&
        canCompleteBlueprint(pool, issued, responses, g),
    );
    if (choice) return choice;
  }
  return undefined;
}

export function placementResult(
  issued: PlacementGroup[],
  responses: PlacementResponse[],
) {
  const topics = new Map<
    number,
    {
      skillId: number;
      skillName: string;
      part: number;
      attempts: number;
      correct: number;
      groups: Set<string>;
    }
  >();
  const byId = new Map(
    issued.flatMap((g) => g.questions).map((q) => [q.id, q]),
  );
  for (const r of responses)
    for (const { skillId, skill } of byId.get(r.questionId)?.skills ?? []) {
      const t = topics.get(skillId) || {
        skillId,
        skillName: skill.name,
        part: r.part,
        attempts: 0,
        correct: 0,
        groups: new Set<string>(),
      };
      t.attempts++;
      t.correct += Number(r.isCorrect);
      t.groups.add(r.groupKey);
      topics.set(skillId, t);
    }
  const rows = [...topics.values()].map(({ groups, ...t }) => ({
    ...t,
    independentGroups: groups.size,
    status:
      groups.size < 3
        ? 'insufficient'
        : t.correct / t.attempts < 0.6
          ? 'needs-practice'
          : t.correct / t.attempts >= 0.8
            ? 'promising'
            : 'insufficient',
  }));
  rows.sort(
    (a, b) =>
      Number(b.status === 'needs-practice') -
        Number(a.status === 'needs-practice') || a.skillId - b.skillId,
  );
  const missingParts = Object.entries(QUOTAS)
    .filter(
      ([p, n]) => responses.filter((r) => r.part === Number(p)).length < n,
    )
    .map(([p]) => p);
  return {
    answered: responses.length,
    correct: responses.filter((r) => r.isCorrect).length,
    topics: rows,
    recommendations: [
      { label: 'Lộ trình học theo kỹ năng', href: '/recommendations' },
      { label: 'Kiến thức TOEIC', href: '/theory' },
      { label: 'Luyện nghe', href: '/listening' },
      { label: 'Luyện đọc', href: '/reading' },
    ],
    note: `Đây là bằng chứng ban đầu từ các câu đã trả lời, không phải xác suất thành thạo hay điểm TOEIC. Kỹ năng chưa xuất hiện chưa được đánh giá. Các ngưỡng phân nhóm là quy tắc nội bộ chưa được kiểm định.${missingParts.length ? ` Bài chưa đạt độ phủ dự kiến ở Part ${missingParts.join(', ')}; cần đánh giá bổ sung.` : ''}`,
  };
}
