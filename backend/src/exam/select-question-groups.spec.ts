import { selectQuestionGroups } from './select-question-groups';

const group = (part: number, sizes: number[]) => sizes.flatMap((size, index) => Array.from({ length: size }, (_, i) => ({
  id: index * 10 + i, part, content: `[${i + 1}]`, audioUrl: `audio-${index}`, passage: `passage-${index}`,
})));

describe('source exam groups', () => {
  it('keeps complete conversations together', () => {
    const result = selectQuestionGroups(group(3, [3,3,3,3]), 9, 3);
    expect(result).toHaveLength(9);
    for (const key of new Set(result.map(q => q.audioUrl))) expect(result.filter(q => q.audioUrl === key)).toHaveLength(3);
  });
  it('does not silently split a conversation to fill an invalid quota', () => {
    expect(selectQuestionGroups(group(3, [3,3,3]), 8, 3)).toEqual([]);
  });
  it('fills a reading quota with complete passages of different sizes', () => {
    expect(selectQuestionGroups(group(7, [5,3,2]), 7, 7)).toHaveLength(7);
  });
  it('orders Part 6 blanks within the selected passage', () => {
    const rows = group(6, [4]).reverse();
    expect(selectQuestionGroups(rows, 4, 6).map(q => q.content)).toEqual(['[1]', '[2]', '[3]', '[4]']);
  });
  it('uses source question order instead of database insertion IDs for shared passages', () => {
    const rows = group(7, [3]).map((q, i) => ({ ...q, stimulus: { questionPosition: 3 - i } }));
    expect(selectQuestionGroups(rows, 3, 7).map(q => q.stimulus.questionPosition)).toEqual([1,2,3]);
  });
});
