import { createHash } from 'node:crypto';
import { memoryState } from './memory-state';

describe('typed vocabulary forgetting estimates', () => {
  const card = { word: 'meeting', meaning: 'cuộc họp' };
  const now = new Date('2026-10-23T00:00:00Z');
  const state = { contentHash: createHash('sha256').update(JSON.stringify([card.word, card.meaning])).digest('hex'),
    schedulingSource: 'hlr-prior-experimental', recallWins: 1, recallLosses: 0,
    lastPracticedAt: new Date('2026-10-19T00:00:00Z') };

  it('uses the same half-life curve as the existing typed review scheduler', () => {
    expect(memoryState(state, card, null, now)).toMatchObject({ probability: .5, halfLifeDays: 4, estimated: true, source: 'hlr-prior-experimental' });
    expect(memoryState(state, card, null, new Date('2026-10-21T00:00:00Z')).probability).toBeGreaterThan(.5);
  });

  it('does not claim retention for self-report, edited content, empty or future evidence', () => {
    for (const overrides of [{ schedulingSource: 'fixed-interval' }, { contentHash: 'edited' },
      { recallWins: 0, recallLosses: 0 }, { lastPracticedAt: new Date('2030-01-01') }, { lastPracticedAt: null }]) {
      expect(memoryState({ ...state, ...overrides }, card, null, now).probability).toBeNull();
    }
  });

  it('identifies the active fitted model without claiming a measured probability', () => {
    expect(memoryState(state, card, { version: 'test', weights: [2, 0, 0] }, now)).toMatchObject({ source: 'hlr-trained:test', estimated: true, probability: .5 });
  });
});
