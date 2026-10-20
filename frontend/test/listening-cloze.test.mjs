import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
  const resolved = outputText.replace(/from ['"]([^'"]+)['"]/g, (_, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
}
const { clozeAnswer } = await load('../src/lib/listening-cloze.ts');
const { ListeningCloze } = await load('../src/components/listening/ListeningCloze.tsx');
test('blank answers preserve passage order regardless of input order', () => {
  assert.equal(clozeAnswer(['Please', '____', 'the', '____'], { 3: ' schedule. ', 1: 'bring' }), 'bring schedule.');
});
test('an unfilled earlier blank cannot shift later answers into the wrong positions', () => {
  assert.equal(clozeAnswer(['____', 'at', '____'], { 2: 'nine' }), '');
  assert.equal(clozeAnswer(['Hello'], {}), '');
});
test('inline fields are labelled and do not expose missing words or a separate textarea', () => {
  const html = renderToStaticMarkup(createElement(ListeningCloze, { tokens: ['Please', '____', 'the', '____'], values: {}, disabled: false, onChange() {} }));
  assert.match(html, /aria-label="Từ còn thiếu 1"/);
  assert.match(html, /aria-label="Từ còn thiếu 2"/);
  assert.doesNotMatch(html, /textarea|bring|schedule/);
});
