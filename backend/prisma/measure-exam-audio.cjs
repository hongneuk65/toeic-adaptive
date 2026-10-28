const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { measureAudio } = require('./audio-measurement.cjs');
const directory = path.resolve(process.env.EXAM_MEDIA_DIR || path.resolve(__dirname, '../storage/exam'));
const apply = process.argv.includes('--apply');

async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const allQuestions = await prisma.question.findMany({ where: { part: { gte: 1, lte: 4 }, audioUrl: { not: null } }, select: { id: true, audioUrl: true, stimulus: true, updatedAt: true } });
    // External/demo media must be audited separately; never download arbitrary URLs.
    const questions = allQuestions.filter(q => /\/(?:api\/)?exam\/media\/[a-f0-9]{64}\.(mp3|wav)$/.test(q.audioUrl));
    if (!questions.length) throw new Error('No supported local exam audio found');
    const urls = [...new Set(questions.map(q => q.audioUrl).filter(Boolean))];
    const durations = {};
    let cursor = 0, measured = 0;
    async function worker() {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        const name = url.split('/').at(-1);
        if (!/^[a-f0-9]{64}\.(mp3|wav)$/.test(name)) throw new Error('Unsupported exam audio path');
        durations[url] = await measureAudio(path.join(directory, name));
        measured++;
        if (measured % 100 === 0) {
          console.log(`Measured ${measured} / ${urls.length} audio files`);
        }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    const reportArg = process.argv.find(arg => arg.startsWith('--report='));
    if (reportArg) fs.writeFileSync(path.resolve(reportArg.slice('--report='.length)), JSON.stringify(durations, null, 2));
    let updated = 0;
    for (const q of questions) {
      const timing = durations[q.audioUrl];
      if (!timing || !q.stimulus || typeof q.stimulus !== 'object' || Array.isArray(q.stimulus)) throw new Error(`Missing source duration for question ${q.id}`);
      if (q.stimulus.audioDurationSeconds === timing.audioDurationSeconds && q.stimulus.audioTrailingSilenceSeconds === timing.audioTrailingSilenceSeconds) continue;
      if (apply) {
        const saved = await prisma.question.updateMany({ where: { id: q.id, updatedAt: q.updatedAt, audioUrl: q.audioUrl }, data: { stimulus: { ...q.stimulus, ...timing } } });
        if (!saved.count) throw new Error(`Question changed during audit: ${q.id}. Rerun the audit.`);
      }
      updated++;
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', uniqueAudio: urls.length, measured, changedQuestions: updated, skippedExternalQuestions: allQuestions.length - questions.length }));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
