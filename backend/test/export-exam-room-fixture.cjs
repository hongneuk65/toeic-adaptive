// Local-only browser fixture: real public question data, no credentials, answers or learner records.
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { ExamService } = require('../dist/exam/exam.service');
async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const service = new ExamService(prisma, {});
    const questions = await service.selectQuestions('FULL');
    const file = path.resolve(__dirname, '../../frontend/test/fixtures/exam-room.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(service.toExamResponse({ id: -1, examType: 'FULL', startedAt: new Date() }, questions)));
    console.log('Exported 200 real public questions for local browser QA. No attempt or answer was created.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
