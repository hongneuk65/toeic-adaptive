import { HLR_PRIOR, halfLife, hlrSchedule, normalizeRecall, recallProbability } from './hlr';

describe('HLR recall scheduling', () => {
  const now = new Date('2026-10-19T00:00:00Z');
  it('has 50% recall at one half-life and handles elapsed time monotonically', () => {
    const h = halfLife(HLR_PRIOR, 4, 1);
    expect(recallProbability(HLR_PRIOR, 4, 1, h)).toBeCloseTo(0.5);
    expect(recallProbability(HLR_PRIOR, 4, 1, 2 * h)).toBeCloseTo(0.25);
    expect(recallProbability(HLR_PRIOR, 4, 1, 0)).toBe(1);
  });
  it('spaces successful recall by evidence and keeps failures and extremes bounded', () => {
    expect(hlrSchedule(HLR_PRIOR, 4, 0, true, now).dueAt.getTime()).toBeGreaterThan(hlrSchedule(HLR_PRIOR, 1, 0, true, now).dueAt.getTime());
    expect(hlrSchedule(HLR_PRIOR, 1, 4, false, now).dueAt.getTime() - now.getTime()).toBe(600000);
    expect(hlrSchedule(HLR_PRIOR, 1e6, 0, true, now).intervalDays).toBe(30);
    expect(Number.isFinite(halfLife(HLR_PRIOR, 1e9, 0))).toBe(true);
  });
  it('normalizes case, spaces, unicode and apostrophes without accepting different vocabulary', () => {
    expect(normalizeRecall('  Purchase   Order ')).toBe('purchase order');
    expect(normalizeRecall('DON’T')).toBe("don't");
    expect(normalizeRecall('invoice')).not.toBe(normalizeRecall('invoices'));
  });
});
