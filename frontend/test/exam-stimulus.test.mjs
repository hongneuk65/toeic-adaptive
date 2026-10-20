import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/exam/ExamStimulus.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
const resolved = outputText.replace(/from ['"]([^'"]+)['"]/g, (_, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const { ExamStimulus } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
const render = (question, blankNumbers = {}) => renderToStaticMarkup(createElement(ExamStimulus, { question, blankNumbers }));

test('Part 6 translates source blanks to exam numbers and highlights only the active source position', () => {
  const question = {part:6,stimulus:{questionPosition:2,documents:[{id:'one',blocks:[{type:'paragraph',children:[{type:'text',text:'Dear colleague, '},{type:'blank',number:1},{type:'text',text:' then '},{type:'blank',number:2}]}]}]}};
  const html = render(question, {1:131,2:132});
  assert.match(html, /Chỗ trống câu 131/);
  assert.match(html, /data-active="true" aria-label="Chỗ trống câu 132"/);
  assert.equal((html.match(/data-active/g)||[]).length,1);
  assert.doesNotMatch(html,/Chỗ trống câu 1"/);
});

test('Part 7 preserves separate documents, semantic tables, merged cells and source emphasis', () => {
  const question = {part:7,stimulus:{questionPosition:1,documents:[{id:'email',blocks:[{type:'paragraph',children:[{type:'text',text:'Notice',bold:true,underline:true}]}]},{id:'schedule',blocks:[{type:'table',children:[{type:'row',children:[{type:'cell',colSpan:2,rowSpan:3,children:[{type:'text',text:'Schedule'}]}]}]}]}]}};
  const html = render(question);
  assert.equal((html.match(/<article/g)||[]).length,2);
  assert.match(html, /<table><tbody><tr><td colSpan="2" rowSpan="3">/i);
  assert.match(html, /exam-text-bold exam-text-underline/);
  assert.match(html, /Schedule/);
  assert.doesNotMatch(html,/groupId|questionPosition|"blocks"/);
});
