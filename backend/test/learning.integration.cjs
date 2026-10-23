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
  await testPracticeSupport(db);
  await testReadingGeneration(db);
  await testIntegratedActivities(db);
  console.log('PASS: fresh migration chain, exam resume/concurrency/blank/review/rollback, DAS3H retry/rollback');
}

async function testIntegratedActivities(db) {
  const { ActivitiesService } = require('../dist/mastery/activities.service');
  const { FlashcardService } = require('../dist/flashcard/flashcard.service');
  const { createHash } = require('node:crypto');
  const user = await db.user.create({ data: { email: 'activities@example.test', passwordHash: 'not-a-login' } });
  const other = await db.user.create({ data: { email: 'private-activities@example.test', passwordHash: 'not-a-login' } });
  const skill = await db.skill.create({ data: { code: 'P5_SUBJECT_VERB_AGREE', name: 'Hòa hợp chủ vị', category: 'grammar', part: 5 } });
  const lesson = await db.theoryLesson.create({ data: { title: 'Từ loại', content: 'Fixture', part: 5, skillId: skill.id } });
  const folder = await db.flashcardFolder.create({ data: { name: 'Due words', userId: user.id, private: true } });
  const hidden = await db.flashcardFolder.create({ data: { name: 'Hidden words', userId: other.id, private: true } });
  for (const item of [folder, hidden]) {
    const card = await db.flashcard.create({ data: { folderId: item.id, word: 'meeting', meaning: 'cuộc họp' } });
    const hash = createHash('sha256').update(JSON.stringify([card.word, card.meaning])).digest('hex');
    await db.flashcardReview.create({ data: { userId: user.id, cardId: card.id, dueAt: new Date('2020-01-01'),
      recallWins: 1, lastPracticedAt: new Date('2020-01-01'), schedulingSource: 'hlr-prior-experimental', contentHash: hash } });
  }
  const source = await db.listeningSource.create({ data: { title: 'Practice talk', kind: 'AUDIO', url: 'https://example.test/audio', published: true } });
  const transcript = await db.listeningTranscript.create({ data: { sourceId: source.id, version: 'fixture', provider: 'fixture', status: 'READY' } });
  const session = await db.listeningSession.create({ data: { userId: user.id, sourceId: source.id, transcriptId: transcript.id, start: 0, end: 30 } });
  for (let index = 0; index < 3; index++) {
    const unit = await db.listeningUnit.create({ data: { transcriptId: transcript.id, position: index, start: index * 10, end: (index + 1) * 10, text: 'Fixture text' } });
    await db.listeningAnswer.create({ data: { sessionId: session.id, unitId: unit.id, mode: 'DICTATION', difficulty: 'MEDIUM', submitted: 'fixture', score: .2, feedback: {} } });
  }
  const article = await db.readingArticle.create({ data: { key: 'activities-fixture', title: 'Email', originalText: 'Fixture', status: 'PUBLISHED' } });
  const qs = [0, 1, 2].map(() => ({ type: 'DETAIL', answer: 0 }));
  const version = await db.readingVersion.create({ data: { articleId: article.id, revision: 1, title: 'Email', text: 'Fixture', topic: 'Work', kind: 'EMAIL', difficulty: 'EASY', origin: 'MANUAL', questions: qs } });
  await db.readingArticle.update({ where: { id: article.id }, data: { publishedVersionId: version.id } });
  await db.readingAttempt.create({ data: { userId: user.id, versionId: version.id, tryNumber: 1, submittedAt: new Date(), answers: { '0': { selected: 1 }, '1': { selected: 1 }, '2': { selected: 1 } } } });
  const mastery = { getUserMasteryProfile: async () => ({ skills: [{ skillId: skill.id, skillCode: skill.code, skillName: skill.name, practiceCount: 12, masteryScore: .4 }] }) };
  const service = new ActivitiesService(db, mastery);
  const result = await service.forUser(user.id);
  assert.ok(result.sections.theory.some(a => a.href === `/theory?lesson=${lesson.id}`));
  assert.equal(result.sections.vocabulary.length, 1);
  assert.equal(result.sections.vocabulary[0].href, `/flashcards/${folder.id}`);
  assert.equal(result.sections.listening[0].href, `/listening?session=${session.id}`);
  assert.equal(result.sections.reading[0].href, `/reading?article=${article.id}`);
  assert.equal(JSON.stringify(result).includes('Hidden words'), false);
  assert.equal(JSON.stringify(result).includes('selected'), false);
  const flashcards = new FlashcardService(db);
  const rows = await flashcards.reviews(user.id, folder.id);
  assert.equal(rows[0].memory.source.startsWith('hlr-'), true);
  assert.ok(rows[0].memory.probability < .8);
  await assert.rejects(flashcards.reviews(user.id, hidden.id));
  const newcomer = await db.user.create({ data: { email: 'newcomer-activities@example.test', passwordHash: 'not-a-login' } });
  const starterFolder = await db.flashcardFolder.create({ data: { name: 'Shared starter words', userId: user.id, private: false,
    flashcards: { create: { word: 'office', meaning: 'văn phòng' } } } });
  const startingService = new ActivitiesService(db, { getUserMasteryProfile: async () => ({ skills: [] }) });
  const starting = await startingService.forUser(newcomer.id);
  assert.equal(starting.learnerProfile.stage, 'unassessed');
  for (const section of Object.values(starting.sections)) {
    assert.ok(section.length > 0, 'Available resources must produce starting suggestions before module history');
    assert.equal(section[0].evidence, 'starter');
  }
  assert.equal(starting.sections.vocabulary[0].href, `/flashcards/${starterFolder.id}`);
  assert.equal(JSON.stringify(starting).includes('Hidden words'), false);
  await db.listeningSource.update({ where: { id: source.id }, data: { published: false } });
  assert.equal((await service.forUser(user.id)).sections.listening.length, 0);
  console.log('PASS: integrated activities use real queries, typed memory estimates, private-folder/source filtering and safe response fields');
}

async function testReadingGeneration(db) {
  const { ReadingAiService } = require('../dist/reading/reading-ai.service');
  const { ReadingService } = require('../dist/reading/reading.service');
  const { ReadingProcessor } = require('../dist/reading/reading.processor');
  const user = await db.user.create({ data: { email: 'grounding@example.test', passwordHash: 'not-a-login' } });
  const text = 'The training session will be held on Tuesday in the main meeting room. Employees should register with their supervisor before Friday. The session will cover customer service techniques and include practical examples for new employees. Participants will receive a workbook at the entrance.';
  const draft = { questions: [{ type: 'MAIN', prompt: 'What is this notice about?', options: ['A training session', 'An office closure', 'A recruitment fair', 'A product recall'],
    answer: 0, explanation: 'Thông báo về buổi đào tạo.', evidenceRequired: true, evidence: [{ text: 'The training session will be held on Tuesday in the main meeting room.' }],
    learning: { level: 'UNDERSTAND', objective: 'Xác định chủ đề của thông báo.', sourceCardIds: ['source-1'] } }] };
  const check = { questionIndex: 0, supportedAnswer: 0, singleAnswer: true, explanationSupported: true, evidenceSufficient: true, objectiveAligned: true };
  let responses = [draft, { checks: [{ ...check, supportedAnswer: 1 }] }];
  const ai = new ReadingAiService({ generateText: async () => JSON.stringify(responses.shift()) });
  const service = new ReadingService(db, {}, ai);
  const processor = new ReadingProcessor(db, service, ai);
  const article = await db.readingArticle.create({ data: { key: 'grounding-test', ownerId: user.id, title: 'Training', originalText: text, status: 'CREATING', generationAttempts: 1 } });
  const job = { data: { articleId: article.id, userId: user.id } };
  await processor.process(job);
  assert.equal((await db.readingArticle.findUnique({ where: { id: article.id } })).status, 'FAILED');
  assert.equal(await db.readingVersion.count({ where: { articleId: article.id } }), 0);
  assert.equal(await db.readingAiEvent.count({ where: { userId: user.id, status: 'FAILED' } }), 1);
  responses = [draft, { checks: [check] }, { checks: [check] }];
  await db.readingArticle.update({ where: { id: article.id }, data: { status: 'CREATING', generationAttempts: 2 } });
  await processor.process(job);
  const stored = await db.readingArticle.findUnique({ where: { id: article.id } });
  assert.equal(stored.status, 'READY');
  assert.equal(stored.originalText, text);
  const version = await db.readingVersion.findUnique({ where: { id: stored.currentVersionId } });
  assert.equal(version.reviewed, false);
  assert.equal(version.questions[0].learning.level, 'UNDERSTAND');
  const view = await service.view(user.id, article.id);
  assert.equal(view.version.questions[0].learningLevel, 'UNDERSTAND');
  assert.equal('answer' in view.version.questions[0], false);
  assert.equal('learning' in view.version.questions[0], false);
  assert.equal('evidence' in view.version.questions[0], false);
  console.log('PASS: generation rejected before version write; approved blind/rationale checks stored atomically, legacy source retained, learning pointers hidden');
}

async function testPracticeSupport(db) {
  const { PracticeSupportService } = require('../dist/das3h/practice-support.service');
  const user = await db.user.create({ data: { email: 'support@example.test', passwordHash: 'not-a-login' } });
  const skill = await db.skill.create({ data: { code: 'P5_PARTS_OF_SPEECH', name: 'Từ loại', part: 5, category: 'Grammar' } });
  const question = await db.question.create({ data: {
    part: 5, content: 'The team worked ___.', optionA: 'efficiently', optionB: 'efficient', optionC: 'efficiency', optionD: 'efficiencies',
    correctAnswer: 'A', itemDifficulty: 0, explanation: '[admin-question] An adverb modifies worked.', skills: { create: { skillId: skill.id } },
  } });
  await db.theoryLesson.create({ data: { skillId: skill.id, part: 5, title: 'Từ loại trong câu', content: 'Fixture lesson' } });
  const attemptId = randomUUID();
  const das3h = new Das3hService(db);
  const support = new PracticeSupportService(db);
  await assert.rejects(support.getSupport(user.id, question.id, skill.id, attemptId));
  const result = await das3h.checkAndRecordAnswer(user.id, question.id, 'B', skill.id, attemptId);
  assert.equal(result.isCorrect, false);
  const before = await db.studentSkillHistory.count({ where: { userId: user.id } });
  const help = await support.getSupport(user.id, question.id, skill.id, attemptId);
  assert.equal(help.steps.length, 3);
  assert.ok(help.lesson);
  assert.equal('correctAnswer' in help, false);
  assert.deepEqual(await support.getSupport(user.id, question.id, skill.id, attemptId), help);
  assert.deepEqual(await das3h.checkAndRecordAnswer(user.id, question.id, 'B', skill.id, attemptId), result);
  assert.equal(await db.studentSkillHistory.count({ where: { userId: user.id } }), before);
  await assert.rejects(support.getSupport(user.id + 1, question.id, skill.id, attemptId));
  await assert.rejects(support.getSupport(user.id, question.id, skill.id + 1, attemptId));
  const correctId = randomUUID();
  await das3h.checkAndRecordAnswer(user.id, question.id, 'A', skill.id, correctId);
  await assert.rejects(support.getSupport(user.id, question.id, skill.id, correctId));
  await db.examAttempt.create({ data: { userId: user.id, examType: 'CUSTOM', questionIds: [question.id], deadlineAt: new Date(Date.now() + 60000) } });
  await assert.rejects(support.getSupport(user.id, question.id, skill.id, attemptId), /Nộp bài thi/);
  console.log('PASS: persisted wrong attempt -> progressive support -> relevant theory, retries read-only, ownership/skill/correct/exam boundaries');
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
