const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { prepareLibraries } = require('./import-learning-content.cjs');
// Compare by content, not JSON key order. A different source set or any admin edit is skipped.
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function sameQuestionsIgnoringOrder(left, right) {
  return Array.isArray(left) && Array.isArray(right) && stable(left.map(stable).sort()) === stable(right.map(stable).sort());
}
function matchesSource(version, book) {
  return version?.origin === 'CRAWL' && version.text === book.text && version.title === book.title && version.topic === 'Santa TOEIC Part 7' && version.kind === 'ARTICLE' && version.difficulty === 'MEDIUM' && sameQuestionsIgnoringOrder(version.questions, book.questions);
}
async function repairReadingOrder(tx, books, apply = false) {
  const result = { candidates: 0, created: 0, updatedPointers: 0, skippedEdited: 0, alreadyOrdered: 0 };
  for (const book of books) {
    const article = await tx.readingArticle.findUnique({ where: { key: book.key }, include: { versions: true } });
    if (!article || article.ownerId !== null) continue;
    const pointerIds = [...new Set([article.currentVersionId, article.publishedVersionId].filter(Boolean))];
    for (const id of pointerIds) {
      const version = article.versions.find(value => value.id === id);
      if (!matchesSource(version, book)) { result.skippedEdited++; continue; }
      if (stable(version.questions) === stable(book.questions)) { result.alreadyOrdered++; continue; }
      result.candidates++;
      if (!apply) continue;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(0, ${article.id}::integer)`;
      const last = await tx.readingVersion.aggregate({ where: { articleId: article.id }, _max: { revision: true } });
      const replacement = await tx.readingVersion.create({ data: { articleId: article.id, revision: (last._max.revision || 0) + 1, title: version.title, text: version.text, topic: version.topic, kind: version.kind, difficulty: version.difficulty, origin: version.origin, reviewed: version.reviewed, questions: book.questions } });
      result.created++;
      // Conditional pointer updates protect admin publication changes; attempts keep their old versionId.
      if (article.currentVersionId === id) { const changed = await tx.readingArticle.updateMany({ where: { id: article.id, currentVersionId: id }, data: { currentVersionId: replacement.id } }); result.updatedPointers += changed.count; }
      if (article.publishedVersionId === id) { const changed = await tx.readingArticle.updateMany({ where: { id: article.id, publishedVersionId: id }, data: { publishedVersionId: replacement.id } }); result.updatedPointers += changed.count; }
    }
  }
  return result;
}
async function main() {
  const data = prepareLibraries();
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const apply = process.argv.includes('--apply');
    const result = await prisma.$transaction(async tx => { await tx.$queryRaw`SELECT pg_advisory_xact_lock(573107)::text`; return repairReadingOrder(tx, data.reading, apply); }, { timeout: 300000 });
    console.log(JSON.stringify({ apply, ...result }));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { repairReadingOrder, sameQuestionsIgnoringOrder, matchesSource };
