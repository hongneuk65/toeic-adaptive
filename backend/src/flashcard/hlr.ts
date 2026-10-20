import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface HlrModel { version: string; weights: number[]; }
export const HLR_PRIOR: HlrModel = { version: 'hlr-prior-v1', weights: [1, 1, -1] };
export function recallFeatures(wins: number, losses: number) { return [1, Math.sqrt(wins), Math.sqrt(losses)]; }
export function halfLife(model: HlrModel, wins: number, losses: number) {
  const x = recallFeatures(wins, losses);
  const exponent = model.weights.reduce((sum, weight, i) => sum + weight * x[i], 0);
  return 2 ** Math.max(-10, Math.min(10, exponent));
}
export function recallProbability(model: HlrModel, wins: number, losses: number, lagDays: number) {
  return 2 ** (-Math.max(0, lagDays) / halfLife(model, wins, losses));
}
/** Prior weights are engineering defaults, NOT published or fitted coefficients. */
export function hlrSchedule(model: HlrModel, wins: number, losses: number, correct: boolean, now: Date) {
  const days = correct ? Math.max(10 / 1440, Math.min(30, -halfLife(model, wins, losses) * Math.log2(0.8))) : 10 / 1440;
  return { intervalDays: Math.floor(days), dueAt: new Date(now.getTime() + days * 86400000) };
}
export function loadHlrModel(): HlrModel | null {
  const path = process.env.HLR_MODEL_PATH?.trim();
  if (!path) return null;
  const model = JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
  if (model.contract !== 'hlr-sqrt-counts-v1' || typeof model.version !== 'string' || !model.version ||
      !Array.isArray(model.weights) || model.weights.length !== 3 || !model.weights.every((w: unknown) => typeof w === 'number' && Number.isFinite(w) && Math.abs(w) <= 20) ||
      model.releaseGate !== true) throw new Error('HLR artifact failed validation');
  return model;
}
export function normalizeRecall(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}
