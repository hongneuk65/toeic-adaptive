const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const execute = promisify(execFile);
const directory = path.resolve(__dirname, '../storage/exam');

async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const questions = await prisma.question.findMany({ where: { part: { lte: 4 }, explanation: { startsWith: '[santa-ednet:' } }, select: { id: true, audioUrl: true, stimulus: true } });
    const urls = [...new Set(questions.map(q => q.audioUrl).filter(Boolean))];
    const cacheFile = path.join(directory, 'durations.json');
    const durations = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
    let cursor = 0, measured = 0;
    async function worker() {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        if (Number.isFinite(durations[url]) && durations[url] > 0) continue;
        const name = url.split('/').at(-1);
        if (!/^[a-f0-9]{64}\.(mp3|wav)$/.test(name)) throw new Error('Unsupported exam audio path');
        const { stdout } = await execute('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', path.join(directory, name)], { windowsHide: true, timeout: 30000 });
        const duration = Number(JSON.parse(stdout).format?.duration);
        if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid duration: ${name}`);
        durations[url] = Math.round(duration * 1000) / 1000;
        measured++;
        if (measured % 100 === 0) {
          fs.writeFileSync(cacheFile, JSON.stringify(durations));
          console.log(`Measured ${measured} / ${urls.length} audio files`);
        }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    fs.writeFileSync(cacheFile, JSON.stringify(durations));
    let updated = 0;
    for (const q of questions) {
      const seconds = durations[q.audioUrl];
      if (!seconds || !q.stimulus || typeof q.stimulus !== 'object') throw new Error(`Missing source duration for question ${q.id}`);
      if (q.stimulus.audioDurationSeconds === seconds) continue;
      await prisma.question.update({ where: { id: q.id }, data: { stimulus: { ...q.stimulus, audioDurationSeconds: seconds } } });
      updated++;
    }
    console.log(JSON.stringify({ uniqueAudio: urls.length, measured, updatedQuestions: updated }));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
