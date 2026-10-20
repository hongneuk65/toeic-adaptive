import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/exam-listening.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const fakeStorage = () => {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
};
test('audio reload resumes the latest heard position and cannot regress or undo completion', () => {
  const storage = fakeStorage();
  api.saveListeningProgress(1, 'a', { position: 15, completed: false }, storage);
  assert.deepEqual(api.readListeningProgress(1, 'a', storage), { position: 15, completed: false });
  api.saveListeningProgress(1, 'a', { position: 30, completed: true }, storage);
  assert.deepEqual(api.saveListeningProgress(1, 'a', { position: 0, completed: false }, storage), { position: 30, completed: true });
  assert.deepEqual(api.readListeningProgress(1, 'b', storage), { position: 0, completed: false });
});
test('cursor and reading unlock are monotonic and isolated by attempt', () => {
  const storage = fakeStorage();
  api.saveListeningCursor(2, { maxGroupIndex: 4, readingUnlocked: true }, storage);
  assert.deepEqual(api.saveListeningCursor(2, { maxGroupIndex: 1, readingUnlocked: false }, storage), { maxGroupIndex: 4, readingUnlocked: true });
  assert.deepEqual(api.readListeningCursor(3, storage), { maxGroupIndex: 0, readingUnlocked: false });
});
test('corrupt or invalid stored data falls back safely', () => {
  const storage = { getItem: () => '{bad', setItem() {} };
  assert.deepEqual(api.readListeningProgress(4, 'bad', storage), { position: 0, completed: false });
  const invalid = { getItem: () => '{"position":-5,"maxGroupIndex":"5","completed":"true"}', setItem() {} };
  assert.deepEqual(api.readListeningProgress(4, 'invalid', invalid), { position: 0, completed: false });
  assert.deepEqual(api.readListeningCursor(4, invalid), { maxGroupIndex: 0, readingUnlocked: false });
});
test('unavailable session storage preserves protection in page memory', () => {
  const storage = { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } };
  assert.doesNotThrow(() => api.saveListeningProgress(5, 'unavailable', { position: 20, completed: false }, storage));
  assert.deepEqual(api.saveListeningProgress(5, 'unavailable', { position: 1, completed: false }, storage), { position: 20, completed: false });
  assert.deepEqual(api.readListeningProgress(5, 'unavailable'), { position: 20, completed: false });
});
test('rest state survives reload and its deadline cannot be extended by repeated ended events', () => {
  const storage = fakeStorage();
  api.saveListeningProgress(6, 'rest', { position: 25, completed: false, audioEnded: true, restDeadlineMs: 15000 }, storage);
  assert.deepEqual(api.readListeningProgress(6, 'rest', storage), { position: 25, completed: false, audioEnded: true, restDeadlineMs: 15000 });
  const updated = api.saveListeningProgress(6, 'rest', { position: 25, completed: false, audioEnded: true, restDeadlineMs: 30000 }, storage);
  assert.equal(updated.restDeadlineMs, 15000);
  assert.equal(updated.completed, false);
  const completed = api.saveListeningProgress(6, 'rest', { position: 25, completed: true }, storage);
  assert.equal(completed.audioEnded, true);
  assert.equal(completed.completed, true);
  assert.equal(completed.restDeadlineMs, 15000);
});
test('legacy completed groups stay completed without starting a new rest', () => {
  const storage = fakeStorage();
  storage.setItem('exam-listening:7:audio:legacy', '{"position":20,"completed":true}');
  assert.deepEqual(api.readListeningProgress(7, 'legacy', storage), { position: 20, completed: true });
});
