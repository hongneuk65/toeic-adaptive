import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/admin-question.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { buildQuestionPayload, questionOptions } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const form = {part:'2',content:'Question',optionA:'A text',optionB:'B text',optionC:'C text',optionD:'stale D',correctAnswer:'C',skillIds:'2,3,2',explanation:'Explanation',source:'CRAWL',stimulus:'never overwrite'};

test('Part 2 saves exactly three choices and excludes immutable source metadata', () => {
  const value = buildQuestionPayload(form);
  assert.deepEqual(questionOptions('2'),['A','B','C']);
  assert.equal(value.optionD,'');
  assert.deepEqual(value.skillIds,[2,3]);
  assert.ok(!Object.hasOwn(value,'source'));
  assert.ok(!Object.hasOwn(value,'stimulus'));
  assert.equal(value.explanation,'Explanation');
});

test('Part 2 rejects invalid D answer and blank existing choices before network mutation', () => {
  assert.throws(()=>buildQuestionPayload({...form,correctAnswer:'D'}),/Đáp án đúng/);
  assert.throws(()=>buildQuestionPayload({...form,optionB:'  '}),/phương án B/);
});

test('Four-choice Parts require D and validate skill IDs', () => {
  assert.deepEqual(questionOptions(5),['A','B','C','D']);
  assert.throws(()=>buildQuestionPayload({...form,part:'5',optionD:''}),/phương án D/);
  assert.throws(()=>buildQuestionPayload({...form,skillIds:'-1'}),/kỹ năng hợp lệ/);
  assert.throws(()=>buildQuestionPayload({...form,skillIds:''}),/kỹ năng hợp lệ/);
});
