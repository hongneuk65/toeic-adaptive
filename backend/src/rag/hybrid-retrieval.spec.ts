import { cosine, splitKnowledge, rankHybrid, normalizeText } from './hybrid-retrieval';
describe('Hybrid retrieval invariants', () => {
  const docs = [{ id: 1, title: 'Although', content: 'Contrast clauses', keywords: ['although'], skillCode: 'CONTRAST' }, { id: 2, title: 'Passive', content: 'be plus participle', keywords: ['passive'], skillCode: 'PASSIVE' }];
  it('preserves Vietnamese accent-insensitive matching', () => {
    expect(normalizeText('Động từ')).toBe('dong tu');
    expect(rankHybrid([{ ...docs[0], title: 'Tính từ', keywords: ['tính từ'] }], 'tinh tu', [])[0].row.id).toBe(1);
  });
  it('abstains for empty/out-of-domain queries rather than returning arbitrary rows', () => {
    expect(rankHybrid(docs, '', [])).toEqual([]);
    expect(rankHybrid(docs, 'weather tomorrow', [])).toEqual([]);
    expect(rankHybrid(docs, 'weather tomorrow', [], new Map([[1, 0.3]]))).toEqual([]);
  });
  it('combines semantic paraphrases and lexical hits, with stable ties', () => {
    expect(rankHybrid(docs, 'although', [], new Map([[1, 0.8], [2, 0.7]]))[0].row.id).toBe(1);
    expect(rankHybrid(docs, 'hai ý trái ngược', [], new Map([[1, 0.9]]))[0].row.id).toBe(1);
  });
  it('rejects malformed and zero cosine vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1], [1, 0])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
    expect(cosine([NaN], [1])).toBe(0);
  });
  it('splits overlong paragraphs without losing content and adds document context', () => {
    const content = 'a'.repeat(4000);
    const chunks = splitKnowledge('Title', content);
    expect(chunks).toHaveLength(3);
    expect(chunks.map(chunk => chunk.slice(6)).join('')).toBe(content);
    expect(chunks.every(chunk => chunk.length <= 1606)).toBe(true);
  });
});
