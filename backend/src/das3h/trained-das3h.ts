import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { Prisma } from '@prisma/client';

export interface TrainedQuestion { bias: number; tags: string[]; part: number; correctAnswer: string }
export interface TrainedSkill { bias: number; wins: number[]; attempts: number[] }
export interface TrainedModel {
  schemaVersion: number; featureContract: string; version: string; intercept: number;
  windowsMs: (number | null)[]; questions: Record<string, TrainedQuestion>; skills: Record<string, TrainedSkill>;
  applicationBridge: Record<string, string>; releaseGatePassed: boolean;
  sourceHashes: Record<string, string>; metrics: unknown; cohort: unknown; mappingStatus: string;
}
export interface ModelQuestion {
  id: number; part: number; content: string; optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: string; explanation: string | null;
  stimulus?: unknown;
}
export const modelQuestionSelect = { id: true, part: true, content: true, optionA: true, optionB: true, optionC: true, optionD: true, correctAnswer: true, explanation: true, stimulus: true } as const;
export const WINDOWS_MS = [null, 2592000000, 604800000, 86400000, 3600000];
const cache = new Map<string, { mtime: number; model: TrainedModel }>();

export function questionFingerprint(q: ModelQuestion): string {
  return createHash('sha256').update(JSON.stringify([q.part, q.content, q.optionA, q.optionB, q.optionC, q.optionD, q.correctAnswer])).digest('hex');
}
export function sourceQuestionId(q: ModelQuestion): string | undefined {
  return q.explanation?.match(/^\[santa-ednet:(q\d+)\]/)?.[1];
}
export function validateModel(model: TrainedModel): void {
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (model.schemaVersion !== 1 || model.featureContract !== 'own-das3h-d0-cumulative-v1'
    || !/^own-das3h-[a-f0-9]{16}$/.test(model.version) || !model.releaseGatePassed
    || !finite(model.intercept) || JSON.stringify(model.windowsMs) !== JSON.stringify(WINDOWS_MS)
    || !model.applicationBridge || !model.skills || !model.questions) throw new Error('Unsupported or unapproved DAS3H model artifact');
  for (const s of Object.values(model.skills)) {
    if (!finite(s.bias) || s.wins.length !== 5 || s.attempts.length !== 5 || !s.wins.every(finite) || !s.attempts.every(finite)) throw new Error('Invalid DAS3H skill weights');
  }
  for (const q of Object.values(model.questions)) {
    if (!finite(q.bias) || !q.tags.every(t => model.skills[t]) || !Number.isInteger(q.part) || q.part < 1 || q.part > 7 || !/^[ABCD]$/.test(q.correctAnswer)) throw new Error('Invalid DAS3H question weights');
  }
}
export function loadModel(): TrainedModel | null {
  const configured = process.env.DAS3H_MODEL_PATH;
  if (!configured) return null;
  const backendRoot = typeof __dirname === 'string' ? resolve(__dirname, '../../') : process.cwd();
  const path = isAbsolute(configured) ? configured : resolve(backendRoot, configured);
  const mtime = statSync(path).mtimeMs;
  const existing = cache.get(path);
  if (existing?.mtime === mtime) return existing.model;
  const model = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as TrainedModel;
  validateModel(model);
  cache.set(path, { mtime, model });
  return model;
}
export function modelProbability(model: TrainedModel, questionId: string, features: Map<string, { wins: number[]; attempts: number[] }>, ability = 0): number {
  const q = model.questions[questionId];
  let z = model.intercept + q.bias + ability;
  for (const tag of q.tags) {
    const s = model.skills[tag];
    const f = features.get(tag);
    z += s.bias;
    if (f) for (let i = 0; i < 5; i++) z += s.wins[i] * f.wins[i] + s.attempts[i] * f.attempts[i];
  }
  return 1 / (1 + Math.exp(-z));
}

/** Portable fitted OWN features. The legacy 42 micro-skills are not relabeled as OWN. */
export class TrainedDas3h {
  constructor(private readonly db: Prisma.TransactionClient) {}
  status() {
    const m = loadModel();
    return m ? { mode: 'trained-own-das3h', version: m.version, featureContract: m.featureContract,
      mappedQuestions: Object.keys(m.applicationBridge).length, ownTags: Object.keys(m.skills).length,
      mappingStatus: m.mappingStatus, abilityMode: 'fixed-zero-d0', metrics: m.metrics, cohort: m.cohort, sourceHashes: m.sourceHashes }
      : { mode: 'legacy-heuristic', version: null };
  }
  private eligible(model: TrainedModel, q: ModelQuestion): string | undefined {
    if (q.stimulus && typeof q.stimulus === 'object' && '_trainedItemInvalidated' in q.stimulus && q.stimulus._trainedItemInvalidated === true) return undefined;
    const id = sourceQuestionId(q);
    if (!id || !model.questions[id] || model.applicationBridge[id] !== questionFingerprint(q)) return undefined;
    return id;
  }
  async predictMany(userId: number, ids: number[], now = new Date(), db = this.db): Promise<Map<number, number>> {
    const model = loadModel();
    if (!model || !ids.length) return new Map();
    const questions = await db.question.findMany({ where: { id: { in: ids } }, select: modelQuestionSelect });
    const targets = questions.map(q => ({ q, source: this.eligible(model, q) })).filter(t => t.source);
    if (!targets.length) return new Map();
    const history = await db.trainedDas3hObservation.findMany({ where: { userId, catalogHash: model.sourceHashes.catalog, occurredAt: { lt: now } },
      select: { sourceQuestionId: true, isCorrect: true, occurredAt: true } });
    const counts = new Map<string, { wins: number[]; attempts: number[] }>();
    for (const h of history) {
      const source = h.sourceQuestionId;
      if (!model.questions[source]) continue;
      const elapsed = now.getTime() - h.occurredAt.getTime();
      // Same timestamp outcomes are invisible, and the lower window bound is strict.
      for (const tag of model.questions[source].tags) {
        let c = counts.get(tag);
        if (!c) { c = { wins: Array(5).fill(0), attempts: Array(5).fill(0) }; counts.set(tag, c); }
        model.windowsMs.forEach((bound, i) => {
          if (elapsed > 0 && (bound === null || elapsed < bound)) { c!.attempts[i]++; c!.wins[i] += Number(h.isCorrect); }
        });
      }
    }
    const features = new Map([...counts].map(([tag, c]) => [tag, { wins: c.wins.map(Math.log1p), attempts: c.attempts.map(Math.log1p) }]));
    // The released artifact is d=0: no learner intercept was fitted or validated.
    // An online intercept also leaks sibling/future outcomes into historical calls.
    return new Map(targets.map(({ q, source }) => [q.id, modelProbability(model, source!, features)]));
  }
  async recordAbility(userId: number, questionId: number, correct: boolean, now: Date, eventId: string, db = this.db): Promise<void> {
    const model = loadModel();
    if (!model) return;
    // Method name retained for callers; only causal skill observations are written.
    // Old versioned ability rows remain recoverable but are not used by d=0.
    const question = await db.question.findUnique({ where: { id: questionId }, select: modelQuestionSelect });
    const source = question && this.eligible(model, question);
    if (source) await db.trainedDas3hObservation.create({ data: { id: eventId, userId, sourceQuestionId: source,
      catalogHash: model.sourceHashes.catalog, isCorrect: correct, occurredAt: now } });
  }
}
