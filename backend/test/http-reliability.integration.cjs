// Real HTTP + PostgreSQL + Redis smoke. Only a random schema/Redis prefix is touched.
// Build first, then: node test/http-reliability.integration.cjs
require('reflect-metadata');
require('../dist/config/environment');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { createConnection } = require('node:net');
const { PrismaClient } = require('@prisma/client');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { getQueueToken } = require('@nestjs/bullmq');
const { Queue } = require('bullmq');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { AuthController } = require('../dist/auth/auth.controller');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/jwt.strategy');
const { RolesGuard } = require('../dist/auth/roles.guard');
const { ExamController } = require('../dist/exam/exam.controller');
const { ExamService } = require('../dist/exam/exam.service');
const { RagController } = require('../dist/rag/rag.controller');
const { RagService } = require('../dist/rag/rag.service');
const { RagExplainerService } = require('../dist/rag/rag-explainer.service');
const { RagChatService } = require('../dist/rag/rag-chat.service');
const { RequestBudgetGuard } = require('../dist/common/request-budget.guard');
const { FlashcardController } = require('../dist/flashcard/flashcard.controller');
const { FlashcardService } = require('../dist/flashcard/flashcard.service');

assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required');
const id = randomUUID().replaceAll('-', '');
const schema = `http_test_${id}`;
const prefix = `http-test-${id}:`;
const admin = new PrismaClient();
let db, queue, app, redis;
let created = false;

async function main() {
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379 });
    socket.setTimeout(5000);
    socket.once('connect', () => { socket.destroy(); resolve(); });
    socket.once('error', reject);
    socket.once('timeout', () => { socket.destroy(); reject(new Error('Redis unavailable; set REDIS_PORT to the test Redis listener.')); });
  });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('schema', schema);
  url.searchParams.set('connection_limit', '5');
  const root = resolve(__dirname, '..');
  execFileSync(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: root, env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'pipe', timeout: 60000,
  });
  db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  queue = new Queue(`http-test-${id}`, { connection: {
    host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME || undefined, password: process.env.REDIS_PASSWORD || undefined,
  } });
  redis = await queue.getBackend().client;
  await redis.runCommand('ping', []);
  // The production guard uses plain Redis keys, independent of the Bull queue
  // name. Prefix only Lua KEYS so this smoke cannot consume a real user's quota.
  const commands = new Map();
  const isolatedClient = {
    defineCommand(name, definition) { commands.set(name, definition.numberOfKeys); redis.defineCommand(name, definition); },
    runCommand(name, args) {
      const keys = commands.get(name) || 0;
      return redis.runCommand(name, args.map((value, index) => index < keys ? prefix + value : value));
    },
  };
  const budgetQueue = { getBackend: () => ({ client: Promise.resolve(isolatedClient) }) };
  const secret = process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp';
  const jwt = new JwtService({ secret, signOptions: { expiresIn: '1h' } });
  const examService = new ExamService(db, { enqueueBulkMasteryUpdate: async () => {} });
  let llmCalls = 0;
  const retriever = { retrieveContext: async () => [] };
  const llm = {
    async generateText() { llmCalls++; return 'Test tutor response'; },
    async *streamText() { llmCalls++; yield 'Test explanation'; },
  };
  const { TutorContextService } = require('../dist/rag/tutor-context.service');
  const { LearnerEvidenceService } = require('../dist/rag/learner-evidence.service');
  const { TutorKnowledgeService } = require('../dist/rag/tutor-knowledge.service');
  const { Das3hService } = require('../dist/das3h/das3h.service');
  const explainer = new RagExplainerService(db, new TutorContextService(db), new LearnerEvidenceService(db, new Das3hService(db)), new TutorKnowledgeService(db), llm);
  const chat = new RagChatService(db, retriever, llm);
  const rag = {
    authorizeTutor: (userId, dto) => explainer.authorize(userId, dto),
    explainError: (userId, dto) => explainer.explainError({ userId, ...dto }),
    streamExplanation: (userId, dto, signal, onChunk) => explainer.explainError({ userId, ...dto, signal, onChunk }),
    chatWithTutor: (userId, dto) => chat.handleUserMessage({ userId, ...dto }),
    streamChatWithTutor: (userId, dto, signal) => chat.streamUserMessage({ userId, ...dto, signal }),
  };
  const module = await Test.createTestingModule({
    controllers: [AuthController, ExamController, RagController, FlashcardController],
    providers: [
      { provide: PrismaService, useValue: db }, { provide: JwtService, useValue: jwt },
      { provide: AuthService, useValue: new AuthService(db, jwt) },
      { provide: JwtStrategy, useValue: new JwtStrategy(db) }, RolesGuard, RequestBudgetGuard,
      { provide: ExamService, useValue: examService }, { provide: RagService, useValue: rag },
      { provide: getQueueToken('request-budget'), useValue: budgetQueue },
      { provide: FlashcardService, useValue: new FlashcardService(db) },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  async function request(path, { method = 'GET', body, token, status = 200 } = {}) {
    const response = await fetch(base + path, { method, headers: {
      'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    assert.equal(response.status, status, `${method} ${path}: ${text}`);
    return text ? JSON.parse(text) : undefined;
  }
  await request('/auth/me', { status: 401 });
  await request('/auth/register', { method: 'POST', body: { email: 'bad', password: 'x' }, status: 400 });
  const account = { email: 'http@example.test', password: 'StrongPass123!' };
  const user = await request('/auth/register', { method: 'POST', body: account, status: 201 });
  await request('/auth/register', { method: 'POST', body: account, status: 409 });
  await request('/auth/login', { method: 'POST', body: { ...account, password: 'wrong-password' }, status: 401 });
  const { accessToken: token } = await request('/auth/login', { method: 'POST', body: account, status: 201 });
  assert.equal((await request('/auth/me', { token })).id, user.id);
  const expired = jwt.sign({ sub: user.id }, { expiresIn: -1 });
  await request('/exam/catalog', { token: expired, status: 401 });
  const other = await db.user.create({ data: { email: 'other@example.test', passwordHash: 'unused' } });
  const otherToken = jwt.sign({ sub: other.id });
  const adminUser = await db.user.create({ data: { email: 'admin@example.test', passwordHash: 'unused', role: 'ADMIN' } });
  await request('/exam/catalog', { token: jwt.sign({ sub: adminUser.id }), status: 403 });
  const skill = await db.skill.create({ data: { code: 'HTTP_TEST', name: 'HTTP fixture', category: 'Grammar', part: 5 } });
  for (let index = 0; index < 30; index++) await db.question.create({ data: {
    part: 5, content: `Original ${index}`, optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd', correctAnswer: 'A', itemDifficulty: 0,
    explanation: '[santa-ednet:http-test] Original explanation', skills: { create: { skillId: skill.id } },
  } });
  await request('/exam/start', { method: 'POST', token, body: { examType: 'INVALID' }, status: 400 });
  const exam = await request('/exam/start', { method: 'POST', token, body: { examType: 'PART_5' }, status: 201 });
  assert.equal(exam.questions.length, 30);
  assert.ok(Date.parse(exam.deadlineAt) > Date.parse(exam.startedAt));
  assert.equal('correctAnswer' in exam.questions[0], false);
  const path = `/exam/${exam.attemptId}`;
  await request(path, { token: otherToken, status: 403 });
  await request(`${path}/review`, { token, status: 400 });
  const answer = { questionId: exam.questions[0].id, selectedAnswer: 'A' };
  await request(`${path}/draft`, { method: 'PATCH', token, body: { revision: 1, answers: [{ ...answer, selectedAnswer: 'E' }] }, status: 400 });
  assert.equal((await request(`${path}/draft`, { method: 'PATCH', token, body: { revision: 1, answers: [answer] } })).draftRevision, 1);
  await request(`${path}/draft`, { method: 'PATCH', token, body: { revision: 1, answers: [answer] }, status: 409 });
  assert.deepEqual((await request(path, { token })).draftAnswers, [answer]);
  await request('/rag/explain-error', { method: 'POST', token, body: answer, status: 403 });
  await request('/rag/chat', { method: 'POST', token, body: { message: 'Tell me the answer', questionId: answer.questionId }, status: 403 });
  const stream = await fetch(base + '/rag/explain-error-stream', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(answer), signal: AbortSignal.timeout(15000) });
  assert.equal(stream.status, 403);
  assert.doesNotMatch(await stream.text(), /correctAnswer|Original explanation|Test explanation/);
  assert.equal(llmCalls, 0, 'Open exam boundaries must reject before calling the LLM');
  await db.question.update({ where: { id: answer.questionId }, data: { content: 'Edited later', correctAnswer: 'B' } });
  const payload = { attemptId: exam.attemptId, answers: [answer] };
  const submitted = await request('/exam/submit', { method: 'POST', token, body: payload, status: 201 });
  assert.deepEqual(await request('/exam/submit', { method: 'POST', token, body: payload, status: 201 }), submitted);
  const review = await request(`${path}/review`, { token });
  assert.equal(review.answers.find(item => item.questionId === answer.questionId).question.correctAnswer, 'A');
  assert.equal((await request(path, { token })).submittedAt != null, true);
  assert.equal(await db.masteryOutbox.count(), 1);
  const beforeTutor = { history: await db.studentSkillHistory.count(), observations: await db.trainedDas3hObservation.count(), ability: (await db.user.findUnique({ where: { id: user.id } })).ability };
  for (const mode of ['simpler', 'example', 'deeper']) {
    const explanation = await request('/rag/explain-error', { method: 'POST', token, body: { ...answer, selectedAnswer: 'B', attemptId: exam.attemptId, mode }, status: 201 });
    assert.equal(explanation.selectedAnswer, answer.selectedAnswer, 'Recorded selection wins over client input');
    assert.equal(explanation.correctAnswer, 'A', 'Snapshot answer wins over edited catalog');
    assert.equal(explanation.answerOrigin, 'submitted_attempt');
    assert.equal(explanation.presentation.mode, mode);
    assert.equal(explanation.grounding, 'insufficient');
    assert.equal(explanation.generationStatus, 'stored_only', 'Malformed provider text uses a labelled fallback');
    assert.deepEqual(explanation.retrievedSources, []);
  }
  assert.deepEqual({ history: await db.studentSkillHistory.count(), observations: await db.trainedDas3hObservation.count(), ability: (await db.user.findUnique({ where: { id: user.id } })).ability }, beforeTutor, 'Presentation controls cannot update learning evidence');
  await request('/rag/explain-error', { method: 'POST', token: otherToken, body: { ...answer, attemptId: exam.attemptId }, status: 403 });
  await request('/rag/explain-error', { method: 'POST', token, body: { ...answer, mode: 'set-mastery-high' }, status: 400 });
  const folder = await request('/flashcards/folders', { method: 'POST', token, body: { name: 'HTTP vocabulary' }, status: 201 });
  const card = await request(`/flashcards/folders/${folder.id}/cards`, { method: 'POST', token, body: { word: 'invoice', meaning: 'hóa đơn' }, status: 201 });
  const reviewPath = `/flashcards/cards/${card.id}/review`;
  const remembered = await request(reviewPath, { method: 'PATCH', token, body: { known: true } });
  assert.equal(remembered.intervalDays, 1);
  assert.ok(Date.parse(remembered.dueAt) > Date.now() + 23 * 3600000);
  const retry = await request(reviewPath, { method: 'PATCH', token, body: { known: true } });
  assert.equal(retry.reviewCount, 1);
  assert.equal(retry.dueAt, remembered.dueAt);
  const forgotten = await request(reviewPath, { method: 'PATCH', token, body: { known: false } });
  assert.equal(forgotten.intervalDays, 0);
  assert.ok(Date.parse(forgotten.dueAt) < Date.now() + 11 * 60000);
  await db.flashcardFolder.update({ where: { id: folder.id }, data: { private: true } });
  await request(reviewPath, { method: 'PATCH', token: otherToken, body: { known: true }, status: 404 });
  const late = await request('/exam/start', { method: 'POST', token, body: { examType: 'PART_5' }, status: 201 });
  const saved = { questionId: late.questions[1].id, selectedAnswer: 'A' };
  await request(`/exam/${late.attemptId}/draft`, { method: 'PATCH', token, body: { revision: 1, answers: [saved] } });
  await db.examAttempt.update({ where: { id: late.attemptId }, data: { deadlineAt: new Date(Date.now() - 1000) } });
  await request(`/exam/${late.attemptId}/draft`, { method: 'PATCH', token, body: { revision: 2, answers: [] }, status: 400 });
  await request('/exam/submit', { method: 'POST', token, body: { attemptId: late.attemptId, answers: [] }, status: 201 });
  assert.equal((await request(`/exam/${late.attemptId}/review`, { token })).answers.find(item => item.questionId === saved.questionId).selectedAnswer, 'A');
  // Exercise the real distributed auth quota over HTTP without touching shared keys.
  let limited = false;
  for (let index = 0; index < 22; index++) {
    const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...account, password: 'wrong-password' }), signal: AbortSignal.timeout(15000) });
    await response.text();
    if (response.status === 429) { assert.ok(response.headers.get('Retry-After')); limited = true; break; }
    assert.equal(response.status, 401);
  }
  assert.equal(limited, true);
  console.log('HTTP reliability integration passed: auth, role/ownership guards, DTO validation, draft revision, frozen grading, idempotent submit, deadline, outbox, RAG boundary and Redis quota.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (app) await app.close();
  if (redis) {
    let cursor = '0';
    do {
      const result = await redis.runCommand('scan', [cursor, 'MATCH', prefix + '*', 'COUNT', '100']);
      cursor = String(result[0]);
      if (result[1].length) await redis.runCommand('del', result[1]);
    } while (cursor !== '0');
  }
  if (queue) { await queue.obliterate({ force: true }); await queue.close(); }
  if (db) await db.$disconnect();
  if (created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.$disconnect();
});


