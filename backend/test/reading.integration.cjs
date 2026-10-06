require('../dist/config/environment');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const { randomUUID, createHash } = require('node:crypto');
const { Queue } = require('bullmq');
const core = require('../dist/reading/reading-core');
const { ReadingService } = require('../dist/reading/reading.service');
const {
  ReadingAiService,
  redactReadingText,
} = require('../dist/reading/reading-ai.service');
const { ReadingProcessor } = require('../dist/reading/reading.processor');
const books = require('../prisma/reading-demo.json');
const prisma = new PrismaClient();
const jwt = new JwtService({
  secret: process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp',
});
const base = process.env.READING_TEST_URL || 'http://127.0.0.1:3000';
const users = [],
  articles = [];
let queue;
async function req(user, path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(user ? { Authorization: 'Bearer ' + user.token } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, value: await response.json() };
}
async function main() {
  const book = books[0],
    questions = core.validateQuestions(book.text, book.questions);
  assert.equal(books.length, 25);
  for (const b of books) core.validateQuestions(b.text, b.questions);
  assert.throws(() =>
    core.validateQuestions(book.text, [
      { ...questions[0], options: ['a', 'a', 'b', 'c'] },
    ]),
  );
  assert.throws(() =>
    core.validateQuestions(book.text, [{ ...questions[0], answer: 4 }]),
  );
  assert.throws(() =>
    core.validateQuestions(book.text, [
      { ...questions[0], evidence: [{ start: 0, end: 3, text: 'bad' }] },
    ]),
  );
  assert.throws(() => core.parseGeneratedQuestions(book.text, 'not JSON', 5));
  assert.throws(() =>
    core.parseGeneratedQuestions(
      book.text,
      JSON.stringify({
        questions: [
          { ...questions[0], evidence: [{ text: 'invented sentence' }] },
        ],
      }),
      5,
    ),
  );
  const parsed = core.parseGeneratedQuestions(
    book.text,
    JSON.stringify({
      questions: [
        {
          ...questions[0],
          evidence: [{ text: questions[0].evidence[0].text }],
        },
      ],
    }),
    5,
  );
  assert.deepEqual(parsed[0].evidence, questions[0].evidence);
  const hidden = core.publicQuestions(questions);
  assert.ok(!JSON.stringify(hidden).includes('explanation'));
  assert.ok(!('answer' in hidden[0]));
  assert.ok(!('evidence' in hidden[0]));
  const context = JSON.parse(
    core.tutorContext(book.text, questions[0], false, undefined, 'help'),
  );
  assert.deepEqual(Object.keys(context.question), ['type', 'prompt']);
  assert.equal(redactReadingText('a@b.com').length, 7);
  assert.ok(!redactReadingText('a@b.com').includes('@'));
  let called = 0;
  const ai = new ReadingAiService({
    generateText: async (options) => {
      called++;
      assert.equal(options.allowFallback, false);
      assert.ok(options.signal);
      return 'bad JSON';
    },
  });
  await assert.rejects(ai.questions(book.text));
  assert.equal(called, 1);
  const timeoutAi = new ReadingAiService({
    generateText: async () => {
      throw new Error('timeout');
    },
  });
  await assert.rejects(timeoutAi.questions(book.text));
  for (const role of ['USER', 'USER', 'ADMIN']) {
    const u = await prisma.user.create({
      data: {
        email: `reading-test-${randomUUID()}@example.invalid`,
        passwordHash: 'integration-only',
        role,
      },
    });
    u.token = jwt.sign(
      { sub: u.id, role, email: u.email },
      { expiresIn: '10m' },
    );
    users.push(u);
  }
  const [u, v, admin] = users;
  assert.equal((await req(null, '/reading')).status, 401);
  for (const text of ['', 'Too short', 'word '.repeat(2100)])
    assert.equal(
      (await req(u, '/reading/personal', 'POST', { title: 'Invalid', text }))
        .status,
      400,
    );
  const catalog = await req(u, '/reading');
  assert.equal(catalog.status, 200);
  assert.ok(catalog.value.articles.length >= 25);
  assert.equal((await req(u, '/reading/admin')).status, 403);
  const draft = await req(admin, '/reading/admin/articles', 'POST', {
    ...book,
    title: 'Integration system fixture',
  });
  assert.equal(draft.status, 201, JSON.stringify(draft.value));
  const id = draft.value.articleId;
  articles.push(id);
  const ver = draft.value.version;
  assert.equal((await req(u, `/reading/articles/${id}`)).status, 404);
  assert.equal(
    (
      await req(admin, `/reading/admin/articles/${id}/publish`, 'POST', {
        versionId: ver.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req(admin, `/reading/admin/articles/${id}/review`, 'POST', {
        versionId: ver.id,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await req(admin, `/reading/admin/articles/${id}/publish`, 'POST', {
        versionId: ver.id,
      })
    ).status,
    201,
  );
  const starts = await Promise.all([
    req(u, `/reading/articles/${id}/start`, 'POST'),
    req(u, `/reading/articles/${id}/start`, 'POST'),
  ]);
  assert.equal(starts[0].status, 201);
  assert.equal(starts[0].value.id, starts[1].value.id);
  const attempt = starts[0].value;
  assert.ok(!('answer' in attempt.version.questions[0]));
  assert.equal((await req(v, `/reading/attempts/${attempt.id}`)).status, 404);
  assert.equal(
    (
      await req(u, `/reading/attempts/${attempt.id}`, 'PATCH', {
        answers: {},
        currentIndex: 1,
        elapsedSeconds: 3,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req(u, `/reading/attempts/${attempt.id}/tutor`, 'POST', {
        mode: 'ANSWER',
        message: 'answer',
        questionIndex: 0,
      })
    ).status,
    403,
  );
  const hint = await req(u, `/reading/attempts/${attempt.id}/tutor`, 'POST', {
    mode: 'HINT',
    message: 'answer',
    questionIndex: 0,
  });
  assert.equal(hint.status, 201);
  assert.equal(hint.value.beforeSubmission, true);
  assert.equal(
    (
      await req(u, `/reading/attempts/${attempt.id}/submit`, 'POST', {
        answers: {},
        currentIndex: 0,
        elapsedSeconds: 10,
      })
    ).status,
    400,
  );
  const answers = {};
  questions.forEach(
    (q, i) =>
      (answers[i] = {
        selected: q.answer,
        evidence: q.evidenceRequired ? [questions[0].evidence[0]] : [],
      }),
  ); // deliberately unrelated but valid span: never affects MCQ grade
  const saved = await req(u, `/reading/attempts/${attempt.id}`, 'PATCH', {
    answers,
    currentIndex: 4,
    elapsedSeconds: 22,
  });
  assert.equal(saved.status, 200);
  const resumed = await req(u, `/reading/attempts/${attempt.id}`);
  assert.equal(resumed.value.currentIndex, 4);
  assert.equal(resumed.value.elapsedSeconds, 22);
  assert.ok(resumed.value.hints.length);
  const submit = await req(
    u,
    `/reading/attempts/${attempt.id}/submit`,
    'POST',
    { answers, currentIndex: 4, elapsedSeconds: 30 },
  );
  assert.equal(submit.status, 201);
  assert.equal(submit.value.correct, 5);
  assert.equal(submit.value.total, 5);
  assert.ok('answer' in submit.value.version.questions[0]);
  const repeat = await req(
    u,
    `/reading/attempts/${attempt.id}/submit`,
    'POST',
    { answers: {}, currentIndex: 0, elapsedSeconds: 0 },
  );
  assert.equal(repeat.value.correct, 5);
  const sameVersionRetry = await req(
    u,
    `/reading/articles/${id}/start`,
    'POST',
  );
  assert.equal(sameVersionRetry.value.tryNumber, 2);
  await req(
    u,
    `/reading/attempts/${sameVersionRetry.value.id}/submit`,
    'POST',
    { answers, currentIndex: 4, elapsedSeconds: 12 },
  );
  const word = 'training',
    start = book.text.indexOf(word),
    wordBody = {
      start,
      end: start + word.length,
      word,
      meaning: 'đào tạo',
      notes: 'Ghi nhớ ngữ cảnh',
    };
  const card = await req(
    u,
    `/reading/attempts/${attempt.id}/words`,
    'POST',
    wordBody,
  );
  assert.equal(card.status, 201, JSON.stringify(card.value));
  const again = await req(u, `/reading/attempts/${attempt.id}/words`, 'POST', {
    ...wordBody,
    meaning: 'buổi đào tạo',
  });
  assert.equal(card.value.id, again.value.id);
  assert.equal(again.value.meaning, 'buổi đào tạo');
  assert.ok(card.value.example.includes(word));
  assert.equal(
    (await req(v, `/flashcards/folders/${card.value.folderId}/cards`)).status,
    404,
  );
  assert.equal(
    (await req(admin, `/flashcards/folders/${card.value.folderId}/cards`))
      .status,
    404,
  );
  assert.equal(
    (
      await req(u, `/flashcards/cards/${card.value.id}/review`, 'PATCH', {
        known: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await req(v, `/flashcards/cards/${card.value.id}/review`, 'PATCH', {
        known: true,
      })
    ).status,
    404,
  );
  const reviews = await req(
    u,
    `/flashcards/folders/${card.value.folderId}/reviews`,
  );
  assert.equal(reviews.value[0].known, true);
  const report = await req(
    u,
    `/reading/attempts/${attempt.id}/reports`,
    'POST',
    { reason: 'Check fixture', questionIndex: 0 },
  );
  assert.equal(report.status, 201);
  const edited = await req(
    admin,
    `/reading/admin/articles/${id}/versions`,
    'POST',
    { ...book, title: 'New unpublished title' },
  );
  assert.equal(edited.status, 201);
  assert.notEqual(edited.value.version.id, ver.id);
  assert.equal(
    (await req(u, `/reading/articles/${id}`)).value.version.id,
    ver.id,
  );
  assert.equal(
    (await req(u, `/reading/articles/${id}`)).value.title,
    ver.title,
  );
  await req(admin, `/reading/admin/articles/${id}/review`, 'POST', {
    versionId: edited.value.version.id,
  });
  await req(admin, `/reading/admin/articles/${id}/publish`, 'POST', {
    versionId: edited.value.version.id,
  });
  assert.equal(
    (await req(u, `/reading/attempts/${attempt.id}`)).value.version.id,
    ver.id,
  );
  const retry = await req(u, `/reading/articles/${id}/start`, 'POST');
  assert.equal(retry.value.version.id, edited.value.version.id);
  await req(admin, `/reading/admin/articles/${id}/archive`, 'POST');
  assert.equal((await req(u, `/reading/articles/${id}`)).status, 404);
  assert.equal((await req(u, `/reading/attempts/${attempt.id}`)).status, 200);
  // Local deterministic provider fixtures exercise the actual worker, version storage and failed-state preservation.
  queue = new Queue('reading-test-' + randomUUID(), {
    connection: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
    },
  });
  const service = new ReadingService(prisma, queue, {});
  const privateArticle = await prisma.readingArticle.create({
    data: {
      ownerId: u.id,
      key: `personal:${u.id}:${createHash('sha256').update(book.text).digest('hex')}`,
      title: 'Private secret',
      originalText: book.text,
      status: 'CREATING',
    },
  });
  articles.push(privateArticle.id);
  const processor = new ReadingProcessor(prisma, service, {
    questions: async () => questions,
  });
  await processor.process({
    data: { articleId: privateArticle.id, userId: u.id },
  });
  const ready = await prisma.readingArticle.findUnique({
    where: { id: privateArticle.id },
  });
  assert.equal(ready.status, 'READY');
  assert.equal((await req(v, `/reading/articles/${ready.id}`)).status, 404);
  assert.equal(
    (await req(admin, `/reading/admin/articles/${ready.id}`)).status,
    404,
  );
  const personalDup = await req(u, '/reading/personal', 'POST', {
    title: 'same text',
    text: book.text,
  });
  assert.equal(personalDup.status, 201);
  assert.equal(personalDup.value.id, ready.id);
  const broken = await prisma.readingArticle.create({
    data: {
      ownerId: u.id,
      key: randomUUID(),
      title: 'Broken fixture',
      originalText: book.text,
      status: 'CREATING',
    },
  });
  articles.push(broken.id);
  await new ReadingProcessor(prisma, service, {
    questions: async () => {
      throw Error('timeout / invalid output');
    },
  }).process({ data: { articleId: broken.id, userId: u.id } });
  const failed = await prisma.readingArticle.findUnique({
    where: { id: broken.id },
  });
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.originalText, book.text);
  assert.ok(failed.error);
  await service.limit(u.id, 'quota-test', 1);
  await assert.rejects(
    service.limit(u.id, 'quota-test', 1),
    (error) => error.getStatus() === 429,
  );
  const overview = await req(admin, '/reading/admin');
  assert.equal(overview.status, 200);
  assert.ok(!JSON.stringify(overview.value).includes('Private secret'));
  assert.ok(overview.value.usage.length);
  if (process.env.READING_TEST_LIVE_AI === '1') {
    const text = book.text.replaceAll('Tuesday', 'Wednesday');
    const queued = await req(u, '/reading/personal', 'POST', {
      title: 'Live provider test',
      text,
    });
    assert.equal(queued.status, 201);
    articles.push(queued.value.id);
    let generated;
    const deadline = Date.now() + 70000;
    do {
      generated = await req(u, `/reading/articles/${queued.value.id}`);
      if (['READY', 'FAILED'].includes(generated.value.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } while (Date.now() < deadline);
    if (generated.value.status === 'FAILED') {
      assert.equal(generated.value.text, text);
      assert.ok(generated.value.error);
      console.log(
        'Live AI/API: upstream failure handled; original private text preserved, retry available.',
      );
    } else {
      assert.equal(
        generated.value.status,
        'READY',
        JSON.stringify(generated.value.error),
      );
      assert.equal(generated.value.text, text);
      assert.ok(!('answer' in generated.value.version.questions[0]));
      assert.equal(
        (await req(v, `/reading/articles/${queued.value.id}`)).status,
        404,
      );
      const liveAttempt = await req(
        u,
        `/reading/articles/${queued.value.id}/start`,
        'POST',
      );
      const offset = text.indexOf('training');
      const explanation = await req(
        u,
        `/reading/attempts/${liveAttempt.value.id}/tutor`,
        'POST',
        {
          mode: 'WORD',
          message: '',
          questionIndex: 0,
          selected: { start: offset, end: offset + 8, text: 'training' },
        },
      );
      assert.equal(explanation.status, 201, JSON.stringify(explanation.value));
      assert.ok(explanation.value.content);
      assert.equal(explanation.value.beforeSubmission, true);
      console.log(
        `Live AI/API PASS: queued private text -> ${generated.value.version.questions.length} validated questions -> hidden answers -> contextual tutor; original preserved.`,
      );
    }
  }
  console.log(
    'Reading PASS: 25/125 demo validation; strict AI JSON/evidence; provider failures; auth/privacy; concurrent start; main-first; hints; save/resume; evidence-independent grading; idempotent submission; snapshots; archive history; private word dedup/review; reports; real Redis quota; worker success/failure.',
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (queue) await queue.close();
    await prisma.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) } },
    });
    for (const id of articles)
      await prisma.readingArticle.deleteMany({ where: { id } });
    await prisma.$disconnect();
  });
