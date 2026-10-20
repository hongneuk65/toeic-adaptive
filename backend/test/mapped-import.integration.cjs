const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { prepare, apply } = require('../prisma/import-mapped-questions.cjs');

async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  let app;
  try {
    const { rows } = prepare({ parts: [1, 2, 3, 4, 5, 6, 7] });
    const stored = await prisma.question.findMany({ where: { explanation: { startsWith: '[santa-ednet:' } }, include: { skills: { include: { skill: true } } } });
    const byId = new Map(stored.map(q => [q.explanation.split(']')[0].slice('[santa-ednet:'.length), q]));
    assert.equal(stored.length, rows.length);
    assert.equal(byId.size, rows.length);
    for (const row of rows) {
      const q = byId.get(row.id);
      assert.ok(q, row.id);
      assert.equal(q.part, row.part);
      assert.equal(q.content, row.content);
      assert.equal(q.correctAnswer, row.correctAnswer);
      assert.deepEqual([q.optionA, q.optionB, q.optionC, q.optionD], [...row.choices, ...(row.part === 2 ? [''] : [])]);
      assert.equal(q.passage, row.passage);
      assert.equal(q.audioUrl, row.audioUrl);
      assert.equal(q.imageUrl, row.imageUrl);
      assert.deepEqual(q.skills.map(s => s.skill.code).sort(), [...row.skillCodes].sort());
      for (const media of row.media) assert.ok(fs.existsSync(path.resolve(__dirname, '../storage/exam', media.name)));
    }
    const before = await prisma.question.aggregate({ _count: true, _sum: { totalAttempts: true, totalCorrect: true } });
    const repeated = await apply(prisma, rows);
    assert.equal(repeated.created, 0);
    assert.equal(repeated.skipped, rows.length);
    assert.deepEqual(await prisma.question.aggregate({ _count: true, _sum: { totalAttempts: true, totalCorrect: true } }), before);
    const presentations = await prisma.question.findMany({ where: { id: { in: repeated.questionIds } }, select: { stimulus: true } });
    assert.ok(presentations.every(q => q.stimulus?.version === 1));
    // Exercise the actual media controller over HTTP without starting Redis/workers.
    const { Module } = require('@nestjs/common');
    const { NestFactory } = require('@nestjs/core');
    const { ExamMediaController } = require('../dist/exam/exam-media.controller');
    class MediaTestModule {}
    Module({ controllers: [ExamMediaController] })(MediaTestModule);
    app = await NestFactory.create(MediaTestModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    for (const part of [1, 2, 3, 4]) {
      const row = rows.find(r => r.part === part);
      const response = await fetch(base + row.audioUrl.replace(/^\/api/, ''), { headers: { Range: 'bytes=0-31' } });
      assert.equal(response.status, 206);
      assert.equal((await response.arrayBuffer()).byteLength, 32);
      assert.match(response.headers.get('content-type'), /audio/);
    }
    const image = rows.find(r => r.part === 1).imageUrl;
    const response = await fetch(base + image.replace(/^\/api/, ''), { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /image/);
    const invalid = await fetch(base + '/exam/media/invalid.mp3');
    assert.equal(invalid.status, 400);
    console.log(JSON.stringify({ verifiedDatabaseQuestions: stored.length,
      byPart: rows.reduce((acc, q) => { acc[q.part] = (acc[q.part] || 0) + 1; return acc; }, {}),
      repeatCreated: repeated.created, repeatSkipped: repeated.skipped,
      learningStatisticsPreserved: true, audioRangeRequests: 4, photoRequests: 1, invalidPathRejected: true }, null, 2));
  } finally { if (app) await app.close(); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
