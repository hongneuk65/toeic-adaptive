const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { classifyVocabulary, summarizeVocabulary, importVocabulary } = require('./santa-vocabulary-topics.cjs');
const root = path.resolve(__dirname, '../../ednet_santa_mapping_clean');
function vocabularySource() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/source_manifest.json'), 'utf8'));
  const rows = new Map();
  for (const entry of manifest.files.filter(file => file.path.includes('/supplemental/') && file.path.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(root, entry.path), 'utf8'));
    const typed = raw.oneOfDomainContent?.toeicContent?.oneOfType;
    if (typed?.oneOfCase !== 'VOCABULARY') continue;
    const value = typed.vocabulary;
    if (!value?.id || !value.word?.trim() || !value.meaning?.trim()) continue;
    rows.set(value.id, { key: `santa-vocabulary:${value.id}`, word: value.word.trim(), sourcePos: value.pos, meaning: value.meaning.trim(), phonetic: value.phonemes || null, example: value.examples?.[0]?.text || null, notes: `Nguồn Santa: ${raw.baseContent.contentId}; ${entry.path}. Nghĩa và ví dụ từ bản crawl.` });
  }
  return [...rows.values()];
}
async function main() {
  const data = vocabularySource();
  console.log(JSON.stringify({ total: data.length, topics: summarizeVocabulary(data), note: 'Phân loại tự động từ từ/ví dụ; metadata nguồn không có nhãn chủ đề ngữ nghĩa. Giữ nguyên ID, ghi chú và lịch sử học; không xóa thư mục cũ.' }, null, 2));
  if (!process.argv.includes('--apply')) return;
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(573107)::text`;
      const owner = await tx.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { id: 'asc' } }) || await tx.user.findFirst({ orderBy: { id: 'asc' } });
      if (!owner) throw new Error('Cần tài khoản sở hữu thư mục');
      return importVocabulary(tx, data, owner.id);
    }, { timeout: 300000 });
    console.log(JSON.stringify(result));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { vocabularySource };
