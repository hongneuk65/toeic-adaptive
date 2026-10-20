import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/reading/ReadingQuestionEditor.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
const resolved = outputText.replace(/from ['"]([^'"]+)['"]/g, (_, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const { ReadingQuestionEditor } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
const question = { type: 'MAIN', prompt: 'What is the purpose?', options: ['A', 'B', 'C', 'D'], answer: 2, explanation: 'A notice.', evidenceRequired: true, evidence: [{ text: 'Training', start: 0, end: 8 }], metadata: { reviewed: true } };
function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object' || !node.props) return [];
  return [node, ...descendants(node.props.children)];
}
function editor(value = JSON.stringify([question])) {
  let changed;
  const tree = ReadingQuestionEditor({ value, text: 'Training starts at nine.', onChange: value => { changed = JSON.parse(value); } });
  return { tree, nodes: descendants(tree), changed: () => changed };
}
test('editing an option preserves the answer, evidence and extra stored fields', () => {
  const view = editor();
  view.nodes.find(node => node.type === 'input' && node.props.value === 'B').props.onChange({ target: { value: 'New B' } });
  assert.deepEqual(view.changed(), [{ ...question, options: ['A', 'New B', 'C', 'D'] }]);
});
test('editing evidence keeps text and offsets consistent with the passage', () => {
  const view = editor();
  view.nodes.find(node => node.type === 'textarea' && node.props.value === 'Training').props.onChange({ target: { value: 'nine' } });
  assert.deepEqual(view.changed()[0].evidence, [{ text: 'nine', start: 19, end: 23 }]);
});
test('malformed JSON is recoverable and does not overwrite stored questions', () => {
  const view = editor('{');
  assert.match(renderToStaticMarkup(view.tree), /role="alert"/);
  assert.equal(view.changed(), undefined);
});
test('an empty draft starts with a MAIN question and four answer choices', () => {
  const view = editor('[]');
  view.nodes.find(node => node.type === 'button').props.onClick();
  assert.equal(view.changed()[0].type, 'MAIN');
  assert.equal(view.changed()[0].options.length, 4);
});

test('crawl drafts allow original first-question type and optional evidence can be cleared', () => {
  let changed;
  const q = { ...question, type: 'DETAIL', evidenceRequired: false };
  const tree = ReadingQuestionEditor({ value: JSON.stringify([q]), text: 'Training starts at nine.', sourceOrder: true, onChange: value => { changed = JSON.parse(value); } });
  const nodes = descendants(tree);
  assert.equal(nodes.find(node => node.type === 'select' && node.props.value === 'DETAIL').props.disabled, false);
  nodes.find(node => node.type === 'textarea' && node.props.value === 'Training').props.onChange({target:{value:''}});
  assert.deepEqual(changed[0].evidence, []);
});
