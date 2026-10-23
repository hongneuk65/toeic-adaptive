import { createHash } from 'node:crypto';
import { halfLife, HlrModel, HLR_PRIOR, recallProbability } from './hlr';

interface RecallState {
  schedulingSource: string; recallWins: number; recallLosses: number;
  lastPracticedAt: Date | null; contentHash: string | null;
}

/** Never infer retrieval strength from a self-report or an edited card. */
export function memoryState(review: RecallState, card: { word: string; meaning: string }, model: HlrModel | null, now = new Date()) {
  const hash = createHash('sha256').update(JSON.stringify([card.word, card.meaning])).digest('hex');
  const valid = review.contentHash === hash && review.schedulingSource.startsWith('hlr-') &&
    review.lastPracticedAt !== null && Number.isFinite(review.lastPracticedAt.getTime()) &&
    review.lastPracticedAt.getTime() <= now.getTime() &&
    [review.recallWins, review.recallLosses].every(n => Number.isInteger(n) && n >= 0) &&
    review.recallWins + review.recallLosses > 0;
  if (!valid) return { probability: null, halfLifeDays: null, source: 'unavailable', lastPracticedAt: null, estimated: true };
  const active = model ?? HLR_PRIOR;
  const lag = (now.getTime() - review.lastPracticedAt!.getTime()) / 86400000;
  return {
    probability: recallProbability(active, review.recallWins, review.recallLosses, lag),
    halfLifeDays: halfLife(active, review.recallWins, review.recallLosses),
    source: model ? `hlr-trained:${model.version}` : 'hlr-prior-experimental',
    lastPracticedAt: review.lastPracticedAt!.toISOString(), estimated: true,
  };
}
