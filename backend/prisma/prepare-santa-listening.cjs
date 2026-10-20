const path = require('node:path');
const { createHash } = require('node:crypto');
const { prepare } = require('./import-mapped-questions.cjs');

function sourceTranscript(question) {
  // P1 reads every alternative; P2 reads the question followed by all three responses.
  // P3/4 passage.body may contain a GRAPHIC, not the spoken dialogue. Never use it as a script.
  if (question.part === 1) return question.choices.join('\n');
  if (question.part === 2) return [question.content, ...question.choices.slice(0, 3)].join('\n');
  return null;
}
function prepareListening() {
  const { rows } = prepare({ parts: [1, 2, 3, 4] });
  const groups = new Map();
  for (const question of rows) {
    if (!question.audioUrl || groups.has(question.audioUrl)) continue;
    const text = sourceTranscript(question);
    const duration = question.stimulus?.audioDurationSeconds;
    const reason = !text ? 'needs-spoken-transcript-ASR' : !Number.isFinite(duration) || duration <= 0 ? 'missing-measured-duration' : duration > 300 ? 'audio-over-maximum-segment' : null;
    const version = text && !reason ? createHash('sha256').update(JSON.stringify({ provider: 'santa-source-segment-v1', url: question.audioUrl, duration, text })).digest('hex') : null;
    groups.set(question.audioUrl, { url: question.audioUrl, part: question.part, text, duration, version, reason });
  }
  return [...groups.values()];
}
async function importListening(prisma, rows) {
  const result = { created: 0, existing: 0, protected: 0, missingSource: 0, pendingASR: 0 };
  for (const row of rows) {
    if (row.reason) { result.pendingASR++; continue; }
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(573108)::text`;
      const source = await tx.listeningSource.findFirst({ where: { url: row.url, ownerId: null, deletedAt: null } });
      if (!source) { result.missingSource++; return; }
      const existing = await tx.listeningTranscript.findFirst({ where: { sourceId: source.id, status: 'READY' }, orderBy: { createdAt: 'desc' } });
      if (existing) { result[existing.version === row.version ? 'existing' : 'protected']++; return; }
      await tx.listeningTranscript.create({ data: { sourceId: source.id, version: row.version, provider: 'santa-source-segment', status: 'READY', segmentStart: null, segmentEnd: null,
        units: { create: [{ position: 0, start: 0, end: row.duration, text: row.text }] } } });
      result.created++;
    });
  }
  return result;
}
async function main() {
  const rows = prepareListening();
  const report = { sources: rows.length, ready: rows.filter(row => !row.reason).length, byPart: Object.fromEntries([1, 2, 3, 4].map(part => [part, rows.filter(row => row.part === part).length])), pending: rows.filter(row => row.reason).reduce((counts, row) => ({ ...counts, [row.reason]: (counts[row.reason] || 0) + 1 }), {}), mode: 'One whole measured audio segment; no invented sentence timestamps. P3/4 graphics are never treated as spoken scripts.' };
  console.log(JSON.stringify(report));
  if (!process.argv.includes('--apply')) return;
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try { console.log(JSON.stringify(await importListening(prisma, rows))); } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { sourceTranscript, prepareListening, importListening };
