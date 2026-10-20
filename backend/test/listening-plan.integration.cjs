const assert = require('node:assert/strict');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { ExamService } = require('../dist/exam/exam.service');
const { buildListeningPlan } = require('../dist/exam/listening-plan');

async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(__dirname, '../.env'));
  const prisma = new PrismaClient();
  try {
    const service = new ExamService(prisma, {});
    const summaries = [];
    for (const mode of ['FULL', 'MINI']) {
      const qs = await service.selectQuestions(mode);
      const plan = buildListeningPlan(mode, qs);
      assert.ok(plan, 'Every selected clip must have a measured duration');
      const listening = qs.filter(q => q.part <= 4);
      assert.equal(plan.targetSeconds, mode === 'FULL' ? 2700 : 1377);
      assert.equal(Math.round(plan.groups.reduce((n,g) => n + g.audioSeconds + g.restSeconds,0)*1000), Math.round(plan.targetSeconds*1000));
      assert.equal(plan.groups.reduce((n,g) => n+g.questionCount,0), listening.length);
      assert.ok(plan.groups.every(g => g.restSeconds >= g.questionCount*5), 'Dataset has enough room for at least five seconds per question');
      summaries.push({ mode, targetSeconds:plan.targetSeconds, audioSeconds:plan.audioSeconds, restSeconds:plan.restSeconds,
        singleQuestionRest:plan.groups.find(g => g.questionCount===1)?.restSeconds,
        threeQuestionRest:plan.groups.find(g => g.questionCount===3)?.restSeconds });
    }
    const attempt = await prisma.examAttempt.findUnique({where:{id:863}});
    if (attempt) {
      const stored = await prisma.question.findMany({where:{id:{in:attempt.questionIds}}});
      const byId = new Map(stored.map(q=>[q.id,q]));
      const plan = buildListeningPlan(attempt.examType,attempt.questionIds.map(id=>byId.get(id)));
      if (plan) summaries.push({currentAttempt:863,examType:attempt.examType,...plan,groups:plan.groups.length});
    }
    console.log(JSON.stringify(summaries,null,2));
  } finally {await prisma.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
