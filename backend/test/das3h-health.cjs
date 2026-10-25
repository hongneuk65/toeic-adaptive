// Read-only local runtime audit: aggregate output only, no learner identities/content.
const assert = require('node:assert/strict');
require('../dist/config/environment');
const { PrismaClient } = require('@prisma/client');
const { Das3hService } = require('../dist/das3h/das3h.service');
const { MasteryService } = require('../dist/mastery/mastery.service');
const { ActivitiesService } = require('../dist/mastery/activities.service');
const { loadModel, modelQuestionSelect, questionFingerprint, sourceQuestionId } = require('../dist/das3h/trained-das3h');
const { importedQuestions } = require('../dist/common/imported-questions');
const db = new PrismaClient();

async function main() {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const model = loadModel();
    const questions = await tx.question.findMany({ where: importedQuestions, select: modelQuestionSelect });
    const eligible = questions.filter(q => {
      const id = sourceQuestionId(q);
      return model && id && model.questions[id] && model.applicationBridge[id] === questionFingerprint(q) && q.stimulus?._trainedItemInvalidated !== true;
    });
    const recent = await tx.studentSkillHistory.findFirst({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { userId: true } });
    const learner = recent ? { id: recent.userId } : await tx.user.findFirst({ where: { role: 'USER' }, select: { id: true } });
    assert.ok(learner, 'No local learner fixture available');
    const mastery = new MasteryService(tx);
    const profile = await mastery.getUserMasteryProfile(learner.id);
    assert.ok(profile.skills.every(s => Number.isFinite(s.masteryScore) && s.masteryScore >= 0 && s.masteryScore <= 1));
    const activities = await new ActivitiesService(tx, mastery).forUser(learner.id);
    const sectionCounts = Object.fromEntries(Object.entries(activities.sections).map(([section, rows]) => [section,
      { total: rows.length, byEvidence: rows.reduce((counts, r) => ({ ...counts, [r.evidence]: (counts[r.evidence] || 0) + 1 }), {}) }]));
    const scores = await new Das3hService(tx).getTrainedSkillScores(learner.id, profile.skills.map(s => s.skillId));
    assert.ok([...scores.values()].every(p => Number.isFinite(p) && p >= 0 && p <= 1));
    const pending = await tx.masteryOutbox.count({ where: { processedAt: null } });
    const retried = await tx.masteryOutbox.count({ where: { processedAt: null, attempts: { gt: 0 } } });
    return { status: 'passed', scope: 'local-config-and-read-only-database; not production or learning-effect validation',
      model: { mode: profile.model.mode, version: profile.model.version, abilityMode: profile.model.abilityMode ?? null },
      bank: { total: questions.length, trainedEligible: eligible.length, trainedCoverage: questions.length ? eligible.length / questions.length : 0 },
      sampledProfile: { skills: profile.skills.length, practicedSkills: profile.skills.filter(s => s.practiceCount > 0).length,
        trainedSkills: scores.size, legacySkills: profile.skills.length - scores.size },
      outbox: { pending, pendingWithRetries: retried }, sections: sectionCounts };
  }, { timeout: 60000 });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
