import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

// Use the existing TypeScript compiler and Node runner; no browser test dependency.
const source = await readFile(new URL('../src/lib/exam-session.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { remainingSeconds, readAnswers, readDraftRevision, saveAnswers, clearExamStorage } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const startedAt = '2026-09-21T12:00:00.000Z';
const start = Date.parse(startedAt);

test('server deadline overrides client duration estimates', () => {
  const exam = { examType: 'FULL', startedAt, deadlineAt: '2026-09-21T12:01:00.000Z' };
  assert.equal(remainingSeconds(exam, start), 60);
  assert.equal(remainingSeconds(exam, start + 61_000), 0);
});

test('custom parts combine planned listening time with only selected Reading budgets', () => {
  const exam = {examType:'CUSTOM',startedAt,selectedParts:[1,6],questions:[{part:1},{part:6}],listeningPlan:{targetSeconds:200}};
  assert.equal(remainingSeconds(exam,start),800);
  assert.equal(remainingSeconds({...exam,selectedParts:[7],questions:[{part:7}],listeningPlan:null},start),2700);
});

for (const [examType, seconds] of [['FULL', 7200], ['MINI', 3600], ['PART_5', 1200]]) {
  test(`${examType} uses server start time across reloads and clamps expiration`, () => {
    const exam = { examType, startedAt };
    assert.equal(remainingSeconds(exam, start), seconds);
    assert.equal(remainingSeconds(exam, start + 90100), seconds - 90);
    assert.equal(remainingSeconds({ ...exam }, start + 180000), seconds - 180);
    assert.equal(remainingSeconds(exam, start + seconds * 1000), 0);
    assert.equal(remainingSeconds(exam, start + (seconds + 60) * 1000), 0);
  });
}

function withStorage(t, methods) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = typeof methods === 'function' ? { getItem: methods } : methods;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  });
}

test('restores only valid answers belonging to the resumed attempt', (t) => {
  withStorage(t, (key) => {
    assert.equal(key, 'exam_answers_42');
    return JSON.stringify({ 1: 'A', 2: 'D', 3: 'a', 4: null, 999: 'B', 0: 'A', '01': 'B', '-1': 'C' });
  });
  assert.deepEqual(readAnswers(42, [1, 2, 3, 4]), { 1: 'A', 2: 'D' });
  assert.deepEqual(readAnswers(42, []), {});
});

for (const value of [null, '', 'broken json', 'null', '[]', '"text"', '123']) {
  test(`ignores malformed saved answers: ${value}`, (t) => {
    withStorage(t, () => value);
    assert.deepEqual(readAnswers(42, [1]), {});
  });
}

test('continues with empty answers when browser storage is unavailable', (t) => {
  withStorage(t, () => { throw new Error('storage blocked'); });
  assert.deepEqual(readAnswers(42, [1]), {});
});

test('saves answers under the attempt key and restores them for a refresh', (t) => {
  const stored = new Map();
  withStorage(t, {
    setItem: (key, value) => stored.set(key, value),
    getItem: (key) => stored.get(key) ?? null,
  });
  assert.equal(saveAnswers(42, { 1: 'A', 2: 'C' }), true);
  assert.equal(stored.get('exam_answers_42'), '{"1":"A","2":"C"}');
  assert.deepEqual(readAnswers(42, [1, 2]), { 1: 'A', 2: 'C' });
  assert.deepEqual(readAnswers(43, [1, 2]), {});
});

test('reports failed storage writes without throwing or changing in-memory answers', (t) => {
  withStorage(t, { setItem: () => { throw new Error('quota exceeded'); } });
  const answers = { 1: 'A' };
  assert.equal(saveAnswers(42, answers), false);
  assert.deepEqual(answers, { 1: 'A' });
});

test('clears only the submitted attempt and its legacy cached exam', (t) => {
  const stored = new Map([
    ['exam_42', '{}'], ['exam_answers_42', '{"1":"A"}'], ['exam_answers_43', '{"2":"B"}'],
  ]);
  withStorage(t, { removeItem: (key) => stored.delete(key) });
  clearExamStorage(42);
  assert.deepEqual([...stored], [['exam_answers_43', '{"2":"B"}']]);
});

test('attempts answer cleanup even if removing the legacy exam fails', (t) => {
  const removed = [];
  withStorage(t, {
    removeItem: (key) => {
      removed.push(key);
      if (key === 'exam_42') throw new Error('storage blocked');
    },
  });
  assert.doesNotThrow(() => clearExamStorage(42));
  assert.deepEqual(removed, ['exam_42', 'exam_answers_42', 'exam_draft_revision_42']);
});

test('draft revision remains isolated per attempt and is cleared with answers', (t) => {
  const stored = new Map();
  withStorage(t, { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) });
  assert.equal(readDraftRevision(42), null);
  assert.equal(saveAnswers(42, { 1: 'A' }, 3), true);
  assert.equal(readDraftRevision(42), 3);
  assert.equal(readDraftRevision(43), null);
  stored.set('exam_draft_revision_42', '-1');
  assert.equal(readDraftRevision(42), null);
  clearExamStorage(42);
  assert.equal(readDraftRevision(42), null);
});

test('storage access failures cannot turn cleanup into a submission failure', (t) => {
  withStorage(t, {});
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get: () => { throw new Error('storage access denied'); },
  });
  assert.deepEqual(readAnswers(42, [1]), {});
  assert.equal(saveAnswers(42, { 1: 'A' }), false);
  assert.doesNotThrow(() => clearExamStorage(42));
});
