export interface Cue { start: number; end: number; text: string }

export function youtubeId(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Link YouTube không hợp lệ.'); }
  const host = url.hostname.toLowerCase();
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host) || !['https:', 'http:'].includes(url.protocol)) throw new Error('Chỉ chấp nhận link YouTube.');
  const id = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Không tìm thấy video ID hợp lệ.');
  return id;
}

export function cleanText(text: string) {
  return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
function seconds(stamp: string) { return stamp.replace(',', '.').split(':').reduce((n, v) => n * 60 + Number(v), 0); }
export function parseSubtitles(input: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of input.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const index = lines.findIndex(line => line.includes('-->'));
    if (index < 0) continue;
    const match = lines[index].match(/((?:\d{1,3}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,3}:)?\d{2}:\d{2}[.,]\d{3})/);
    if (!match) throw new Error('Mốc thời gian SRT/VTT không hợp lệ.');
    const start = seconds(match[1]); const end = seconds(match[2]);
    if (end <= start || start < 0 || end > 86400) throw new Error('Mốc phụ đề phải tăng và nằm trong 24 giờ.');
    const text = cleanText(lines.slice(index + 1).join(' '));
    if (text) cues.push({ start, end, text });
  }
  if (!cues.length) throw new Error('File cần có phụ đề SRT/VTT kèm mốc thời gian.');
  return cues;
}

// Keep cue boundaries: without word-level timings, splitting a cue invents timestamps.
export function mergeCues(cues: Cue[]): Cue[] {
  const result: Cue[] = []; let pending: Cue | undefined; let previous: Cue | undefined;
  for (const raw of [...cues].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (!Number.isFinite(raw.start) || !Number.isFinite(raw.end) || raw.start < 0 || raw.end <= raw.start) continue;
    let text = cleanText(raw.text);
    if (!text || /^\[(?:music|applause|laughter)\]$/i.test(text)) continue;
    if (previous && raw.start < previous.end + .5) {
      const old = previous.text.split(' '); const next = text.split(' ');
      let overlap = Math.min(old.length, next.length);
      while (overlap > 0 && old.slice(-overlap).join(' ').toLowerCase() !== next.slice(0, overlap).join(' ').toLowerCase()) overlap--;
      text = next.slice(overlap).join(' ');
      if (!text) { if (pending) pending.end = Math.max(pending.end, raw.end); continue; }
    }
    const cue = { ...raw, text };
    if (pending && (cue.start - pending.end > 1.5 || pending.end - pending.start > 15 || pending.text.split(' ').length > 45)) { result.push(pending); pending = undefined; }
    pending = pending ? { start: pending.start, end: Math.max(pending.end, cue.end), text: `${pending.text} ${text}` } : cue;
    previous = { ...raw, text: cleanText(raw.text) };
    if (/[.!?]["']?$/.test(text)) { result.push(pending); pending = undefined; }
  }
  if (pending) result.push(pending);
  if (!result.length) throw new Error('Không có lời thoại có thời gian để tạo bài.');
  return result;
}

export function normalize(text: string): string[] {
  const contractions: Record<string, string> = { "can't": 'cannot', "won't": 'will not', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not', "wouldn't": 'would not', "shouldn't": 'should not', "couldn't": 'could not', "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "it's": 'it is', "that's": 'that is', "i've": 'i have', "we've": 'we have', "they've": 'they have', "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "they'll": 'they will' };
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[a-z]+(?:'[a-z]+)?/g, word => contractions[word] || word).replace(/[^a-z0-9'\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
}
function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1])); row = next; }
  return row[b.length];
}
export function gradeText(expected: string, submitted: string) {
  const a = normalize(expected), b = normalize(submitted);
  if (a.length > 200 || b.length > 400) throw new Error('Câu trả lời quá dài.');
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0) as number[]);
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
  const words: { kind: string; expected?: string; actual?: string }[] = [];
  let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && dp[i][j] === dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])) {
      const same = a[i - 1] === b[j - 1]; const spelling = !same && Math.min(a[i - 1].length, b[j - 1].length) >= 4 && editDistance(a[i - 1], b[j - 1]) <= 1;
      words.push({ kind: same ? 'correct' : spelling ? 'spelling' : 'wrong', expected: a[--i], actual: b[--j] });
    } else if (i && dp[i][j] === dp[i - 1][j] + 1) words.push({ kind: 'missing', expected: a[--i] });
    else words.push({ kind: 'extra', actual: b[--j] });
  }
  return { score: Math.max(0, 1 - dp[a.length][b.length] / Math.max(a.length, b.length, 1)), words: words.reverse() };
}
export function cloze(text: string, difficulty: string) {
  const tokens = text.split(/\s+/); const candidates = tokens.map((word, index) => ({ word, index })).filter(t => /[a-z]/i.test(t.word));
  const count = Math.min(Math.max(1, Math.round(candidates.length * ({ EASY: .15, MEDIUM: .25, HARD: .4 }[difficulty] || .25))), Math.max(0, candidates.length - 1));
  const selected = [...candidates].sort((a, b) => b.word.length - a.word.length || a.index - b.index).slice(0, count).sort((a, b) => a.index - b.index);
  return { tokens: tokens.map((word, index) => selected.some(t => t.index === index) ? '____' : word), answers: selected.map(t => t.word), hint: selected.map(t => t.word.replace(/[^a-z0-9]/gi, '').slice(0, 1)).join(' · ') };
}
