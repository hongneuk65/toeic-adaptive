// Read-only local PostgreSQL smoke check. Run after `npm run build` in backend.
const assert = require('node:assert/strict');
require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const { MasteryService } = require('../dist/mastery/mastery.service');
const { Das3hService } = require('../dist/das3h/das3h.service');
const { AdaptiveSchedulerService } = require('../dist/das3h/adaptive-scheduler.service');
const db = new PrismaClient();

async function main() {
  const user = await db.user.findFirst({ where: { role: 'USER' }, select: { id: true } });
  assert.ok(user, 'Provide a local learner fixture before running this check');
  const profile = await new MasteryService(db).getUserMasteryProfile(user.id);
  assert.equal(profile.learningPlan.version, 'learning-plan-v1');
  assert.ok(profile.learningPlan.items.length > 0, 'Provide imported questions mapped to skills');
  assert.ok(profile.learningPlan.items.every(item => item.reasons.length > 0));
  const scheduler = new AdaptiveSchedulerService(db, new Das3hService(db));
  for (const item of profile.learningPlan.items.slice(0, 3)) {
    const response = await scheduler.getNextAdaptiveQuestion(user.id, item.skillId);
    assert.ok(response.selectedQuestion.id > 0);
    assert.ok(response.predictedProb >= 0 && response.predictedProb <= 1);
    assert.equal(response.selectedQuestion.correctAnswer, undefined);
    assert.equal(response.selectedQuestion.explanation, undefined);
  }
  console.log(JSON.stringify({ status: 'passed', skills: profile.skills.length,
    plannedSkills: profile.learningPlan.items.length, openedQuestions: Math.min(3, profile.learningPlan.items.length) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
