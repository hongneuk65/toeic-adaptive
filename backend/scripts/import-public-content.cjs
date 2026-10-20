const { PrismaClient, Prisma } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const { gunzipSync } = require('node:zlib');
const { randomBytes } = require('node:crypto');
const db = new PrismaClient();
const tables = { skill: 'Skill', question: 'Question', questionSkill: 'QuestionSkill', theoryLesson: 'TheoryLesson', knowledgeChunk: 'KnowledgeChunk', readingArticle: 'ReadingArticle', readingVersion: 'ReadingVersion', flashcardFolder: 'FlashcardFolder', flashcard: 'Flashcard', listeningSource: 'ListeningSource', listeningTranscript: 'ListeningTranscript', listeningUnit: 'ListeningUnit' };
(async () => {
  if (await db.question.count() || await db.skill.count()) {
    if (process.argv.includes('--if-empty')) return console.log('Existing content retained; initial import skipped.');
    throw new Error('Only run on an empty content database');
  }
  const input = readFileSync(process.argv[2]);
  const data = JSON.parse((process.argv[2].endsWith('.gz') ? gunzipSync(input) : input).toString('utf8'));
  await db.$transaction(async tx => {
    const owner = await tx.user.create({ data: { email: 'library@toeic-compass.invalid', passwordHash: `!disabled:${randomBytes(32).toString('hex')}` } });
    for (const key of Object.keys(tables)) {
      const rows = data[key].map(row => {
        if (key === 'flashcardFolder') return { ...row, userId: owner.id };
        if (key === 'question') return { ...row, stimulus: row.stimulus ?? Prisma.DbNull };
        return row;
      });
      for (let i = 0; i < rows.length; i += 100) await tx[key].createMany({ data: rows.slice(i,i+100) });
      if (key !== 'questionSkill') await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${tables[key]}"','id'), GREATEST(COALESCE((SELECT MAX(id) FROM "${tables[key]}"),0),1), true)`);
    }
  }, { timeout: 240000 });
  console.log('Imported public learning library; no local accounts, attempts or review history copied.');
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
