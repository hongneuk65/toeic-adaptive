import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/listening-playback.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { playbackStart, seekReady } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('replay includes lead-in without a negative time or altered capture timestamps', () => {
  assert.equal(playbackStart(10), 9.25);
  assert.equal(playbackStart(.3), 0);
  assert.equal(playbackStart(0), 0);
  assert.equal(playbackStart(10, true), 10);
});
test('seek does not resume from the stale end of the previous playback', () => {
  assert.equal(seekReady(30, 10, 500), false);
  assert.equal(seekReady(10, 10, 0), false);
  assert.equal(seekReady(10, 10, 100), true);
  assert.equal(seekReady(8, 10, 500), true);
  assert.equal(seekReady(4, 10, 500), false);
});
