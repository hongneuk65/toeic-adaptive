import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/exam-pacing.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { restDeadline, restSecondsRemaining, listeningRestSeconds } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('rest begins after audio and reload uses absolute remaining time', () => {
  const deadline = restDeadline(undefined, 15, 10000);
  assert.equal(deadline, 25000);
  assert.equal(restSecondsRemaining(deadline, 14000), 11);
  assert.equal(restDeadline(deadline, 15, 14000), deadline);
  assert.equal(restSecondsRemaining(deadline, 24999), 1);
  assert.equal(restSecondsRemaining(deadline, 26000), 0);
});
test('backend pacing including zero or fractional rests is preserved; legacy gets time per question', () => {
  assert.equal(listeningRestSeconds(0, 3), 0);
  assert.equal(listeningRestSeconds(12.37, 3), 12.37);
  assert.equal(listeningRestSeconds(undefined, 3), 15);
  assert.equal(listeningRestSeconds(undefined, 1), 5);
  assert.equal(listeningRestSeconds(NaN, 3), 15);
});
