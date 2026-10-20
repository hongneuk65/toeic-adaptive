import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/reading-clauses.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const { clauseExercises, clauseScore } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('Curated exercise bank has unique items and fully formed answer, subject, verb and explanation', () => {
  assert.equal(clauseExercises.length,12);
  assert.equal(new Set(clauseExercises.map(item=>item.id)).size,12);
  for (const item of clauseExercises) {
    assert.equal(item.options.length,3);
    assert.ok(item.options[item.answer]);
    assert.ok(item.options[item.answer].toLowerCase().includes(item.subject.toLowerCase()));
    assert.ok(item.options[item.answer].toLowerCase().includes(item.verb.toLowerCase()));
    assert.ok(item.explanation.length>70);
  }
});

test('Score handles unanswered items, incorrect choices and completed exercises without counting ungraded items', () => {
  assert.equal(clauseScore([]),0);
  assert.equal(clauseScore(Array(12).fill(null)),0);
  assert.equal(clauseScore(clauseExercises.map(item=>item.answer)),12);
  assert.equal(clauseScore(clauseExercises.map(item=>(item.answer+1)%3)),0);
  assert.equal(clauseScore([clauseExercises[0].answer]),1);
});
