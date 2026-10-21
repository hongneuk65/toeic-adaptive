// Explicit operator workflow after a human has reviewed the content; never run as a seed or boot step.
require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const { knowledgeHash } = require('../dist/rag/tutor-knowledge.service');
const db = new PrismaClient();
const args = process.argv.slice(2);
const option = key => { const index = args.indexOf(key); return index < 0 ? undefined : args[index + 1]; };
(async () => {
  const id = Number(option('--id'));
  if (!Number.isInteger(id) || id < 1) throw new Error('Provide --id <KnowledgeChunk ID>.');
  const row = await db.knowledgeChunk.findUniqueOrThrow({ where: { id } });
  if (args.includes('--revoke')) {
    await db.knowledgeChunk.update({ where: { id }, data: { reviewStatus: 'REVOKED' } });
    console.log(`Revoked knowledge ${id}.`); return;
  }
  const sourceUri = option('--source');
  const sourceVersion = option('--version');
  const reviewedBy = option('--reviewer');
  if (!sourceUri?.startsWith('https://') || !sourceVersion?.trim() || !reviewedBy?.trim()) throw new Error('Provide --source <https URL> --version <revision> --reviewer <human reviewer>.');
  const reviewed = { ...row, sourceUri, sourceVersion };
  const approvedContentHash = knowledgeHash(reviewed);
  console.log(JSON.stringify({ id, title: row.title, content: row.content, sourceUri, sourceVersion, reviewedBy, approvedContentHash, dryRun: !args.includes('--approve') }, null, 2));
  if (!args.includes('--approve')) return;
  const result = await db.knowledgeChunk.updateMany({ where: { id, updatedAt: row.updatedAt },
    data: { sourceUri, sourceVersion, reviewedBy, reviewedAt: new Date(), approvedContentHash, reviewStatus: 'APPROVED' } });
  if (result.count !== 1) throw new Error('Content changed while reviewing. Read it again before approval.');
  console.log('Recorded explicit approval. Re-review after any content or source metadata change.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
