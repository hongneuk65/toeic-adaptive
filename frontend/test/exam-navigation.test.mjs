import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/exam-navigation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { buildExamGroups, displayExamNumber, readingNeighbor } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const q = (id, part, extra = {}) => ({ id, part, ...extra });

test('custom Part combinations retain standard TOEIC numbering across skipped Parts', () => {
  const questions = [q(1,2),q(2,2),q(3,6),q(4,6),q(5,7)];
  assert.deepEqual(questions.map((_,i)=>displayExamNumber('CUSTOM',i,questions)),[7,8,131,132,147]);
});

test('Listening keeps Part 1/2 individual and exposes the complete contiguous Part 3/4 audio group', () => {
  const questions = [q(1, 1, {audioUrl:'a'}), q(2, 1, {audioUrl:'a'}), q(3, 2, {audioUrl:'b'}), q(4, 3, {audioUrl:'c'}), q(5, 3, {audioUrl:'c'}), q(6, 3, {audioUrl:'c'}), q(7, 4, {audioUrl:'c'})];
  assert.deepEqual(buildExamGroups(questions).map(group => group.indices), [[0], [1], [2], [3,4,5], [6]]);
});

test('Repeated source later in the exam stays separate; missing media never merges questions', () => {
  const questions = [q(1, 3, {audioUrl:'a'}), q(2, 3, {audioUrl:'b'}), q(3, 3, {audioUrl:'a'}), q(4, 3), q(5, 3)];
  assert.deepEqual(buildExamGroups(questions).map(group => group.indices), [[0], [1], [2], [3], [4]]);
});

test('Reading groups use stimulus identity so separate documents remain together even when flat passages differ', () => {
  const questions = [q(1, 5), q(2, 6, {stimulus:{groupId:'p6'},passage:'one'}), q(3, 6, {stimulus:{groupId:'p6'},passage:'two'}), q(4, 7, {stimulus:{groupId:'p7'}}), q(5, 7, {stimulus:{groupId:'p7'}})];
  assert.deepEqual(buildExamGroups(questions).map(group => group.indices), [[0], [1,2], [3,4]]);
});

test('Reading previous cannot enter Listening; next cannot pass the final question', () => {
  const questions = [q(1, 4), q(2, 4), q(3, 5), q(4, 6), q(5, 7)];
  assert.equal(readingNeighbor(questions, 2, -1), 2);
  assert.equal(readingNeighbor(questions, 2, 1), 3);
  assert.equal(readingNeighbor(questions, 4, 1), 4);
  assert.equal(readingNeighbor(questions, 4, -1), 3);
});

test('Display numbers use global FULL/MINI positions and TOEIC Part 5 numbering', () => {
  assert.equal(displayExamNumber('FULL',100),101);
  assert.equal(displayExamNumber('FULL',199),200);
  assert.equal(displayExamNumber('MINI',51),52);
  assert.equal(displayExamNumber('MINI',99),100);
  assert.equal(displayExamNumber('PART_5',0),101);
  assert.equal(displayExamNumber('PART_5',29),130);
});
