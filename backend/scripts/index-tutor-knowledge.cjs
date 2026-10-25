// Explicit local/operator command. Never called during boot or a learner request.
require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const { KnowledgeEmbeddingService } = require('../dist/rag/knowledge-embedding.service');
const { isApprovedKnowledge } = require('../dist/rag/tutor-knowledge.service');
const db = new PrismaClient();
(async () => {
  const service = new KnowledgeEmbeddingService(db);
  const rows = (await db.knowledgeChunk.findMany({ orderBy: { id: 'asc' } })).filter(isApprovedKnowledge);
  const vectors = await db.knowledgeEmbedding.findMany({ where: { model: service.identity }, select: { knowledgeId: true, sourceHash: true } });
  const pending = rows.filter(row => !vectors.some(vector => vector.knowledgeId === row.id && vector.sourceHash === row.approvedContentHash));
  console.log(JSON.stringify({ model: service.identity, enabled: service.enabled, eligibleSources: rows.length, pendingSources: pending.length, dryRun: !process.argv.includes('--write') }));
  if (!process.argv.includes('--write')) return;
  if (!service.enabled) throw new Error('Set RAG_EMBEDDING_ENABLED=true and GEMINI_API_KEY to index.');
  // Bounded sequential requests; valid existing indexes are retained on any failure.
  for (const row of pending) console.log(JSON.stringify({ knowledgeId: row.id, chunks: await service.index(row) }));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
