import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/rag/AiMarkdown.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
});
const resolved = outputText.replace(/from ['"]([^'"]+)['"]/g, (_, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const { AiMarkdown } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
const render = (content, streaming = false) => renderToStaticMarkup(createElement(AiMarkdown, { content, streaming }));

test('renders tutor headings, emphasis, lists and GFM tables as HTML', () => {
  const html = render('## Quy tắc\n\n**Although**\n\n- Ví dụ\n\n| Từ | Loại |\n| --- | --- |\n| despite | giới từ |');
  assert.match(html, /<h2>Quy tắc<\/h2>/);
  assert.match(html, /<strong>Although<\/strong>/);
  assert.match(html, /<li>Ví dụ<\/li>/);
  assert.match(html, /<table>/);
});

test('accepts incomplete streamed Markdown and removes cursor on completion', () => {
  const message = '### Quy tắc\n\n**Although** + mệnh đề';
  for (let length = 1; length <= message.length; length++) {
    assert.match(render(message.slice(0, length), true), /ai-writing-cursor/);
  }
  assert.doesNotMatch(render(message), /ai-writing-cursor/);
});

test('does not execute raw HTML or unsafe Markdown links', () => {
  const html = render('<script>alert(1)</script>\n\n[link](javascript:alert%281%29)');
  assert.doesNotMatch(html, /<script|javascript:/);
  assert.match(html, /rel="noopener noreferrer"/);
});
