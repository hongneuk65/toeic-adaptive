import { examCounts } from './exam-counts';

describe('custom exam part counts', () => {
  it('selects any combination in standard part order with original group counts', () => {
    expect(examCounts('CUSTOM', [7, 1, 3])).toEqual([6, 0, 39, 0, 0, 0, 54]);
    expect(examCounts('CUSTOM', [2])).toEqual([0, 25, 0, 0, 0, 0, 0]);
    expect(examCounts('CUSTOM', [1, 2, 3, 4, 5, 6, 7])).toEqual(examCounts('FULL'));
  });
  it.each([undefined, [], [1, 1], [0], [8], [1.5], [NaN]])('rejects invalid selections %s', parts => {
    expect(() => examCounts('CUSTOM', parts)).toThrow();
  });
  it('keeps existing modes and disallows silently ignored parts', () => {
    expect(examCounts('MINI').reduce((a, b) => a + b, 0)).toBe(100);
    expect(examCounts('PART_5')).toEqual([0, 0, 0, 0, 30, 0, 0]);
    expect(() => examCounts('FULL', [1])).toThrow();
  });
});
