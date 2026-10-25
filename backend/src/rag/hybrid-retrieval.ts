/** Shared by indexing, serving and evaluation. No model-generated or learner content. */
export const CHUNK_CONTRACT = 'reviewed-paragraphs-v1';
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
const stopWords = new Set('the a an is are to of in on for and or i you it this that what how why la cua va mot cac em toi tai sao gi nao dung cau tu giup giai thich cho hoi ve hay the thi co khong voi trong khi sau truoc de duoc can nen lam qua bo ban'.split(' '));
export function queryTokens(text: string): string[] {
  return [...new Set(normalizeText(text).match(/[a-z0-9]+/g) || [])].filter(token => token.length > 1 && !stopWords.has(token)).slice(0, 80);
}
export function splitKnowledge(title: string, content: string, maxChars = 1600): string[] {
  const blocks = content.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const block of blocks) {
    // Hard bound also handles unpunctuated imported paragraphs, preserving all text.
    for (let offset = 0; offset < block.length; offset += maxChars) {
      const piece = block.slice(offset, offset + maxChars);
      if (current && current.length + piece.length + 2 > maxChars) { chunks.push(current); current = ''; }
      current += (current ? '\n\n' : '') + piece;
    }
  }
  if (current) chunks.push(current);
  return chunks.map(chunk => `${title}\n${chunk}`);
}
export function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || !a.every(Number.isFinite) || !b.every(Number.isFinite)) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export interface SearchDocument { id: number; title: string; content: string; keywords: string[]; skillCode: string | null; }
export function lexicalScore(row: SearchDocument, query: string, skillCodes: string[]): number {
  const tokens = queryTokens(query);
  const title = new Set(normalizeText(row.title).match(/[a-z0-9]+/g) || []);
  const content = new Set(normalizeText(row.content).match(/[a-z0-9]+/g) || []);
  const keywords = new Set(row.keywords.flatMap(keyword => normalizeText(keyword).match(/[a-z0-9]+/g) || []));
  let score = row.skillCode && skillCodes.includes(row.skillCode) ? 5 : 0;
  let matched = 0;
  for (const token of tokens) {
    if (title.has(token) || content.has(token) || keywords.has(token)) matched++;
    if (title.has(token)) score += 4;
    if (content.has(token)) score += 1;
    if (keywords.has(token)) score += 3;
  }
  // A single Vietnamese syllable (e.g. 'nối'/'thành') is not a useful concept match.
  const normalizedQuery = ` ${normalizeText(query).replace(/[^a-z0-9]+/g, ' ')} `;
  const phrase = row.keywords.some(keyword => {
    const normalized = normalizeText(keyword).trim();
    return (normalized.includes(' ') || /^[a-z]{3,}$/.test(keyword)) && normalizedQuery.includes(` ${normalized} `);
  });
  return matched >= 2 || phrase || (row.skillCode && skillCodes.includes(row.skillCode)) ? score : 0;
}
export function rankHybrid(rows: SearchDocument[], query: string, skills: string[], semantic = new Map<number, number>(), topK = 3) {
  const lexical = rows.map(row => ({ row, score: lexicalScore(row, query, skills) })).filter(item => item.score >= 3).sort((a, b) => b.score - a.score || a.row.id - b.row.id);
  const dense = rows.filter(row => (semantic.get(row.id) ?? 0) >= 0.65).sort((a, b) => semantic.get(b.id)! - semantic.get(a.id)! || a.id - b.id);
  const scores = new Map<number, number>();
  for (const list of [lexical.map(item => item.row), dense]) list.forEach((row, index) => scores.set(row.id, (scores.get(row.id) || 0) + 1 / (60 + index + 1)));
  return rows.filter(row => scores.has(row.id)).map(row => ({ row, score: scores.get(row.id)! }))
    .sort((a, b) => b.score - a.score || a.row.id - b.row.id).slice(0, topK);
}
