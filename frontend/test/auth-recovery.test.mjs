import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/auth/return-to.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { learningReturnTo } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('login resumes internal learning deep links and rejects external redirects', () => {
  assert.equal(learningReturnTo('/exam/14?resume=1#question-2'), '/exam/14?resume=1#question-2');
  for (const value of ['//evil.test', 'https://evil.test', '/admin', '/login', '/reading\\evil', '/exam\n', undefined]) assert.equal(learningReturnTo(value), '/dashboard');
});
