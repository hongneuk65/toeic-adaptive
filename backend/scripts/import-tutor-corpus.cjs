require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const { knowledgeHash } = require('../dist/rag/tutor-knowledge.service');
const corpus = require('../prisma/tutor-reviewed-corpus.cjs');
const db = new PrismaClient();
(async () => {
  const write = process.argv.includes('--write');
  // Editorial source check is explicitly labelled; never impersonates a human reviewer.
  for (const { key, queries, ...item } of corpus) {
    const sourceVersion = `editorial-2026-10-23-v1:${key}`;
    const existing = await db.knowledgeChunk.findFirst({ where: { sourceVersion } });
    if (existing) { console.log(`${key}: exists, left unchanged`); continue; }
    const data = { ...item, lessonId: null, sourceVersion };
    const approvedContentHash = knowledgeHash(data);
    console.log(JSON.stringify({ key, title: item.title, sourceUri: item.sourceUri, dryRun: !write }));
    if (write) await db.knowledgeChunk.create({ data: { ...data, approvedContentHash, reviewStatus: 'APPROVED', reviewedAt: new Date(), reviewedBy: 'codex-editorial:primary-source-checked (not expert certification)' } });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
