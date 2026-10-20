process.loadEnvFile('.env');
const { PrismaClient } = require('@prisma/client');
const { writeFileSync } = require('node:fs');
const db = new PrismaClient();
(async () => {
  const skills = await db.skill.findMany({ where: { code: { startsWith: 'P' } } });
  const ids = skills.map(s => s.id);
  const questions = await db.question.findMany({ where: { explanation: { contains: '[santa-ednet:' } } });
  const questionIds = questions.map(q => q.id);
  const folders = await db.flashcardFolder.findMany({ where: { private: false, readingKey: { startsWith: 'santa-' } } });
  const articles = await db.readingArticle.findMany({ where: { ownerId: null, archived: false } });
  const sources = await db.listeningSource.findMany({ where: { ownerId: null, published: true, deletedAt: null } });
  const transcripts = await db.listeningTranscript.findMany({ where: { sourceId: { in: sources.map(s => s.id) }, status: 'READY' } });
  const data = {
    skill: skills,
    question: questions.map(q => ({ ...q, totalAttempts: 0, totalCorrect: 0 })),
    questionSkill: await db.questionSkill.findMany({ where: { questionId: { in: questionIds }, skillId: { in: ids } } }),
    theoryLesson: await db.theoryLesson.findMany({ where: { skillId: { in: ids } } }),
    knowledgeChunk: await db.knowledgeChunk.findMany(),
    readingArticle: articles,
    readingVersion: await db.readingVersion.findMany({ where: { articleId: { in: articles.map(a => a.id) } } }),
    flashcardFolder: folders.map(f => ({ ...f, userId: null })),
    flashcard: (await db.flashcard.findMany({ where: { folderId: { in: folders.map(f => f.id) } } })).map(c => ({ ...c, userId: null })),
    listeningSource: sources,
    listeningTranscript: transcripts,
    listeningUnit: await db.listeningUnit.findMany({ where: { transcriptId: { in: transcripts.map(t => t.id) } } }),
  };
  writeFileSync(process.argv[2], JSON.stringify(data));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(data).map(([k,v]) => [k,v.length]))));
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
