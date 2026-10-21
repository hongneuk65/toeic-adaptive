// Opt-in live PostgreSQL test. Creates and drops only randomly named test schemas.
// Run after building: node test/learning.integration.cjs
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { ExamService } = require('../dist/exam/exam.service');
const { Das3hService } = require('../dist/das3h/das3h.service');
require('../dist/config/environment');

assert.ok(process.env.DATABASE_URL, 'Set DATABASE_URL or provide backend/.env');
const root = resolve(__dirname, '..');
const migrations = resolve(root, 'prisma/migrations');
const admin = new PrismaClient();
const created = [];
const clients = [];

function runPrisma(args, url) {
  return execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), ...args], {
    cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 60000,
  });
}

async function isolatedDatabase() {
  const schema = `learning_test_${randomUUID().replaceAll('-', '')}`;
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created.push(schema);
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('schema', schema);
  url.searchParams.set('connection_limit', '5');
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  clients.push(db);
  return { db, url: url.toString() };
}

function statements(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '')
    .split(';').map((s) => s.trim()).filter(Boolean);
}

async function applySql(db, sql) {
  await db.$transaction(async (tx) => {
    for (const statement of statements(sql)) await tx.$executeRawUnsafe(statement);
  });
}

async function checkSchema(url) {
  const diff = runPrisma(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma',
    '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], url);
  assert.match(diff, /empty migration/i, diff);
}

async function testFreshInstall() {
  const { db, url } = await isolatedDatabase();
  runPrisma(['migrate', 'deploy'], url);
  await checkSchema(url);
  const user = await db.user.create({ data: {
    id: 1500000000 + randomInt(500000000), email: 'integration@example.test', passwordHash: 'not-a-login',
  } });
  const skill = await db.skill.create({ data: { code: 'TEST', name: 'Test', category: 'Grammar', part: 5 } });
  const questions = [];
  for (let i = 0; i < 30; i++) {
    questions.push(await db.question.create({ data: {
      part: 5, content: `Test ${i}`, optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd',
      correctAnswer: 'A', explanation: '[santa-ednet:integration] Frozen explanation', itemDifficulty: 0, skills: { create: { skillId: skill.id } },
    } }));
  }
  const queued = [];
  const queue = { enqueueBulkMasteryUpdate: async (jobs) => { queued.push(...jobs); } };
  const exams = new ExamService(db, queue);
  const session = await exams.startExam(user.id, { examType: 'PART_5' });
  assert.equal(session.questions.length, 30);
  assert.equal('correctAnswer' in session.questions[0], false);
  assert.equal((await exams.getExam(user.id, session.attemptId)).startedAt.getTime(), session.startedAt.getTime());
  await assert.rejects(exams.getReview(user.id, session.attemptId));
  await assert.rejects(exams.getExam(user.id + 1, session.attemptId));
  const answers = [{ questionId: questions[0].id, selectedAnswer: 'A' }];
  const submissions = await Promise.allSettled([1, 2].map(() => exams.submitExam(user.id, { attemptId: session.attemptId, answers })));
  assert.equal(submissions.filter((r) => r.status === 'fulfilled').length, 2);
  assert.deepEqual(submissions[0].value, submissions[1].value);
  const review = await exams.getReview(user.id, session.attemptId);
  assert.equal(review.answers.length, 30);
  assert.equal(review.answers.filter((a) => a.selectedAnswer === '').length, 29);
  assert.equal(review.totalScore, 17);
  assert.equal(await db.masteryOutbox.count(), 1);

  const blank = await exams.startExam(user.id, { examType: 'PART_5' });
  assert.equal((await exams.submitExam(user.id, { attemptId: blank.attemptId, answers: [] })).totalScore, 0);
  assert.equal(await db.masteryOutbox.count(), 1);

  const rollback = await exams.startExam(user.id, { examType: 'PART_5' });
  const failingExams = new ExamService({
    examAttempt: db.examAttempt, question: db.question,
    $transaction: (callback) => db.$transaction(async (tx) => {
      await callback(tx);
      throw new Error('forced rollback');
    }),
  }, queue);
  await assert.rejects(failingExams.submitExam(user.id, { attemptId: rollback.attemptId, answers }), /forced rollback/);
  assert.equal((await db.examAttempt.findUnique({ where: { id: rollback.attemptId } })).submittedAt, null);
  assert.equal(await db.examAnswer.count({ where: { attemptId: rollback.attemptId } }), 0);
  assert.equal(await db.masteryOutbox.count(), 1);

  await testExamReliability(db, user, questions, exams);

  const das3h = new Das3hService(db);
  await Promise.all([1, 2].map(() => das3h.recordAndSync(user.id, questions[0].id, true, [skill.id], 'retry-test')));
  assert.equal(await db.studentSkillHistory.count(), 1);
  assert.equal(await db.processedMasteryJob.count(), 1);
  assert.equal((await db.userSkillMastery.findFirst()).practiceCount, 1);
  assert.equal((await db.question.findUnique({ where: { id: questions[0].id } })).totalAttempts, 1);
  const ability = (await db.user.findUnique({ where: { id: user.id } })).ability;
  assert.ok(Math.abs(ability - 0.015) < 1e-10, 'SGD must predict before recording the answer');
  await assert.rejects(das3h.recordAndSync(user.id, questions[1].id, true, [999999], 'failed-event'));
  assert.equal((await db.user.findUnique({ where: { id: user.id } })).ability, ability);
  assert.equal(await db.processedMasteryJob.count(), 1);
  assert.equal(await db.studentSkillHistory.count(), 1);
  assert.equal((await db.question.findUnique({ where: { id: questions[1].id } })).totalAttempts, 0);
  assert.equal((await db.userSkillMastery.findFirst()).practiceCount, 1);
  await testUserSerialization(db, skill.id, questions[2].id, questions[3].id);
  console.log('PASS: fresh migration chain, exam resume/concurrency/blank/review/rollback, DAS3H retry/rollback');
}

async function testExamReliability(db, user, questions, exams) {
  const { MasteryOutboxService } = require('../dist/queue/mastery-outbox.service');
  const session = await exams.startExam(user.id, {examType: 'PART_5'});
  const answer = {questionId: questions[4].id, selectedAnswer: 'A'};
  const saved = await exams.saveDraft(user.id, session.attemptId, {revision: 1, answers: [answer]});
  assert.equal(saved.draftRevision, 1);
  await assert.rejects(exams.saveDraft(user.id, session.attemptId, {revision: 1, answers: []}), /Bản nháp/);
  assert.deepEqual((await exams.getExam(user.id, session.attemptId)).draftAnswers, [answer]);
  await db.question.update({where: {id: answer.questionId}, data: {correctAnswer: 'B', content: 'edited after start'}});
  const frozen = (await exams.getExam(user.id, session.attemptId)).questions.find(q => q.id === answer.questionId);
  assert.notEqual(frozen.content, 'edited after start');
  assert.equal('correctAnswer' in frozen, false);
  await db.examAttempt.update({where: {id: session.attemptId}, data: {deadlineAt: new Date(0)}});
  await assert.rejects(exams.saveDraft(user.id, session.attemptId, {revision: 2, answers: []}), /hết thời gian/);
  const result = await exams.submitExam(user.id, {attemptId: session.attemptId, answers: [{questionId: questions[5].id, selectedAnswer: 'A'}]});
  assert.equal(result.totalCorrect, 1, 'late edits ignored; frozen A and saved draft are used');
  assert.deepEqual(await exams.submitExam(user.id, {attemptId: session.attemptId, answers: []}), result);
  assert.ok((await exams.getExam(user.id, session.attemptId)).submittedAt);
  // Simulate unavailable learning worker; durable events must remain pending.
  const worker = new MasteryOutboxService(db, {recordAndSync: async () => {throw new Error('offline');}});
  await worker.flush();
  const pending = await db.masteryOutbox.findMany({orderBy: [{createdAt: 'asc'}, {id: 'asc'}]});
  assert.ok(pending.every(event => !event.processedAt));
  assert.equal(pending[0].attempts, 1, 'the earliest failed event enters backoff');
  assert.ok(pending.slice(1).every(event => event.attempts === 0), 'later observations wait behind the failed event');
  await worker.flush();
  assert.equal((await db.masteryOutbox.findUnique({where: {id: pending[0].id}})).attempts, 1, 'backoff prevents immediate retry');
  let deliveries = 0;
  const deliveredIds = new Set();
  const reliable = new MasteryOutboxService(db, {recordAndSync: async (...args) => {deliveredIds.add(args[4]); deliveries++;}});
  await db.masteryOutbox.updateMany({data: {nextAttemptAt: new Date(0)}});
  await reliable.flush();
  await reliable.flush();
  assert.equal(deliveries, pending.length);
  assert.equal(deliveredIds.size, pending.length);
  assert.equal(await db.masteryOutbox.count({where: {processedAt: null}}), 0);
  // Deleting the mutable bank row cannot cascade away exam results or frozen review.
  await db.question.delete({where: {id: answer.questionId}});
  const review = await exams.getReview(user.id, session.attemptId);
  assert.equal(review.answers.find(a => a.questionId === answer.questionId).question.correctAnswer, 'A');
  assert.equal(review.answers.length, 30);
  console.log('PASS: frozen content/deletion, authoritative deadline, draft revision, idempotent submit, durable retry outbox');
}

async function within(promise, message) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), 5000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

async function testUserSerialization(db, skillId, questionId, otherQuestionId) {
  // High, random fixture IDs avoid sharing advisory keys with normal application users.
  const id = 1000000000 + randomInt(500000000);
  const user = await db.user.create({ data: { id, email: 'serialized@example.test', passwordHash: 'test' } });
  const other = await db.user.create({ data: { id: id + 1, email: 'independent@example.test', passwordHash: 'test' } });
  const das3h = new Das3hService(db);
  const update = das3h.updateAbilityOnline.bind(das3h);
  let signalEntered;
  let release;
  let entries = 0;
  const entered = new Promise((resolve) => { signalEntered = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  das3h.updateAbilityOnline = async (...args) => {
    if (args[0] === user.id && ++entries === 1) {
      signalEntered();
      await gate;
    }
    return update(...args);
  };
  const pending = [];
  const start = (...args) => {
    const promise = das3h.recordAndSync(...args);
    pending.push(promise);
    // Attach a handler immediately; Promise.all below still propagates failures.
    void promise.catch(() => {});
    return promise;
  };
  try {
    start(user.id, questionId, true, [skillId], 'serial-1');
    await within(entered, 'First event did not acquire its user lock');
    start(user.id, questionId, true, [skillId], 'serial-2');
    await within(start(other.id, otherQuestionId, true, [skillId], 'independent'),
      'A different user must not wait for the first user');
    const deadline = Date.now() + 4000;
    let waiting = false;
    while (!waiting && Date.now() < deadline) {
      const locks = await db.$queryRaw`
        SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND NOT granted
        AND classid = 0 AND objid::bigint = ${user.id}::bigint
        AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`;
      waiting = locks.length > 0;
      if (!waiting) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.ok(waiting, 'The second event must wait on the same user advisory lock');
    assert.equal(entries, 1, 'A second event must not predict before the first commits');
  } finally {
    release();
    await Promise.allSettled(pending);
  }
  await Promise.all(pending);
  const expected = 0.015 + 0.03 * (1 - das3h.sigmoid(0.015 + 0.5 * Math.log(2)));
  assert.ok(Math.abs((await db.user.findUnique({ where: { id: user.id } })).ability - expected) < 1e-10);
  assert.equal(await db.studentSkillHistory.count({ where: { userId: user.id } }), 2);
  assert.equal((await db.userSkillMastery.findUnique({ where: { userId_skillId: { userId: user.id, skillId } } })).practiceCount, 2);
  console.log('PASS: same-user serialization, different-user independence, cumulative SGD');
}

async function testExistingRagTables() {
  const { db, url } = await isolatedDatabase();
  const names = readdirSync(migrations).filter((n) => /^\d/.test(n)).sort();
  const latest = '20260921000000_complete_exam_and_rag';
  assert.ok(names.includes(latest));
  for (const name of names.filter((name) => name < latest)) {
    await applySql(db, readFileSync(resolve(migrations, name, 'migration.sql'), 'utf8'));
  }
  const sql = readFileSync(resolve(migrations, latest, 'migration.sql'), 'utf8');
  await applySql(db, statements(sql).filter((s) => /^CREATE (TABLE|INDEX).*"(KnowledgeChunk|AiChatMessage)/.test(s)).join(';'));
  // These rows intentionally predate later columns; select only fields present at this migration stage.
  await db.$executeRaw`INSERT INTO "KnowledgeChunk" ("part", "category", "title", "content", "keywords", "updatedAt") VALUES (5, 'test', 'keep', 'keep', ARRAY[]::TEXT[], NOW())`;
  const user = await db.user.create({ data: { email: 'legacy@example.test', passwordHash: 'not-a-login' }, select: { id: true } });
  await db.aiChatMessage.create({ data: { userId: user.id, role: 'user', content: 'keep chat' } });
  const q = await db.question.create({ data: {
    part: 5, content: 'legacy', optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd', correctAnswer: 'A', itemDifficulty: 0,
  }, select: {id: true} });
  await db.$executeRaw`INSERT INTO "ExamAttempt" ("userId", "examType", "submittedAt", "updatedAt") VALUES (${user.id}, 'PART_5', NOW(), NOW()), (${user.id}, 'PART_5', NULL, NOW())`;
  await db.$executeRaw`INSERT INTO "ExamAnswer" ("attemptId", "questionId", "selectedAnswer", "isCorrect") SELECT "id", ${q.id}, 'A', true FROM "ExamAttempt"`;
  await applySql(db, sql);
  for (const name of names.filter((name) => name > latest)) {
    await applySql(db, readFileSync(resolve(migrations, name, 'migration.sql'), 'utf8'));
  }
  await checkSchema(url);
  const attempts = await db.examAttempt.findMany({ orderBy: { id: 'asc' } });
  assert.deepEqual(attempts[0].questionIds, [q.id]);
  assert.deepEqual(attempts[1].questionIds, []);
  assert.equal(await db.knowledgeChunk.count(), 1);
  assert.equal((await db.aiChatMessage.findFirst()).content, 'keep chat');
  console.log('PASS: pre-existing RAG tables preserved; only submitted legacy attempts backfilled');
}

async function main() {
  try {
    await testFreshInstall();
    await testExistingRagTables();
  } finally {
    await Promise.all(clients.map((client) => client.$disconnect()));
    for (const schema of created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
