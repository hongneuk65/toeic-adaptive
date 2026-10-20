const assert = require('node:assert/strict');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { ExamService } = require('../dist/exam/exam.service');
const { prepareLibraries, importLibraries } = require('../prisma/import-learning-content.cjs');

async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const service = new ExamService(prisma, {});
    const catalog = await service.catalog();
    assert.equal(catalog.totalQuestions, 5049);
    assert.ok(catalog.modes.every(m => m.available));
    const all = await prisma.question.findMany({ where: { explanation: { startsWith: '[santa-ednet:' } } });
    const importedIds = new Set(all.map(q => q.id));
    const exams = {};
    for (const [mode, size] of [['FULL',200], ['MINI',100], ['PART_5',30]]) {
      const questions = await service.selectQuestions(mode);
      assert.equal(questions.length, size);
      assert.equal(new Set(questions.map(q => q.id)).size, size);
      for (const q of questions) {
        assert.ok(importedIds.has(q.id));
        assert.ok(!q.content.includes('bulk testing'));
        assert.equal(q.correctAnswer, undefined);
        assert.equal(q.explanation, undefined);
        if ([3,4,6,7].includes(q.part)) {
          const key = q.part <= 4 ? 'audioUrl' : 'passage';
          assert.equal(questions.filter(c => c.part === q.part && c[key] === q[key]).length,
            all.filter(c => c.part === q.part && c[key] === q[key]).length, `Split group in ${mode} Part ${q.part}`);
        }
      }
      const response = service.toExamResponse({ id: -1, examType: mode, startedAt: new Date() }, questions);
      for (const q of response.questions.filter(q => q.part <= 2)) {
        assert.equal(q.content, '');
        assert.equal(q.passage, null);
        assert.deepEqual([q.optionA, q.optionB, q.optionC, q.optionD], q.part === 2 ? ['A','B','C',''] : ['A','B','C','D']);
      }
      exams[mode] = size;
    }
    const data = prepareLibraries();
    const again = await importLibraries(prisma, data);
    assert.deepEqual([again.vocabulary, again.reading, again.listening, again.lessons], [0,0,0,0]);
    const topicFolders = await prisma.flashcardFolder.findMany({ where: { readingKey: { startsWith: 'santa-vocabulary-topic-v1:' } }, include: { _count: { select: { flashcards: true } } } });
    assert.ok(topicFolders.length >= 10);
    assert.ok(topicFolders.every(folder => folder.private === false));
    assert.equal(topicFolders.reduce((sum, folder) => sum + folder._count.flashcards, 0), data.vocabulary.length);
    const sourceCards = await prisma.flashcard.findMany({ where: { readingKey: { startsWith: 'santa-vocabulary:' } }, select: { id: true, folderId: true, readingKey: true } });
    assert.equal(sourceCards.length, data.vocabulary.length);
    assert.ok(sourceCards.every(card => topicFolders.some(folder => folder.id === card.folderId)));
    for (const book of data.reading) {
      const article = await prisma.readingArticle.findUnique({ where: { key: book.key }, include: { versions: true } });
      assert.ok(article.publishedVersionId);
      const version = article.versions.find(v => v.id === article.publishedVersionId);
      assert.equal(version.text, book.text);
      assert.deepEqual(version.questions, book.questions);
    }
    console.log(JSON.stringify({ catalogQuestions: catalog.totalQuestions, realExams: exams,
      libraries: Object.fromEntries(Object.entries(data).map(([k,v]) => [k,v.length])),
      repeatedLibraryImportCreated: 0, completeQuestionGroups: true, noAnswerLeakage: true }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
