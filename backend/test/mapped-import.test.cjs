const { test } = require('node:test');
const assert = require('node:assert/strict');
const { richText, prepare, apply, labelBlanks } = require('../prisma/import-mapped-questions.cjs');
const { renderNodes } = require('../prisma/santa-stimulus.cjs');

test('preserves blanks from Santa rich text', () => {
  assert.equal(richText({ children: [['text', { value: 'Please' }], ['blank', { number: 0 }], ['text', { value: 'here.' }]] }), 'Please ------- here.');
});

test('snapshot yields valid mapped questions without fabricating blanks or answers', () => {
  const { rows, rejected } = prepare();
  assert.equal(rows.length + rejected.length, 733);
  assert.ok(rows.length > 700);
  assert.equal(new Set(rows.map(q => q.id)).size, rows.length);
  for (const row of rows) {
    assert.ok(row.content.includes('-------'));
    assert.match(row.correctAnswer, /^[ABCD]$/);
    assert.equal(row.choices.length, 4);
    assert.ok(row.skillCodes.length);
    assert.ok(row.provenance.ednetTags.length);
  }
});

test('second import skips existing source IDs and preserves learning statistics', async () => {
  const stored = [];
  const tx = {
    $queryRaw: async () => [],
    skill: { findMany: async () => [{ code: 'P5_PARTS_OF_SPEECH', id: 1 }] },
    question: {
      findFirst: async ({ where }) => stored.find(q => q.explanation.startsWith(where.explanation.startsWith)),
      create: async ({ data }) => { const q = { id: stored.length + 1, ...data, totalAttempts: 10 }; stored.push(q); return q; },
      count: async () => stored.length,
    },
  };
  const db = { $transaction: fn => fn(tx) };
  const rows = [{ id: 'q-test', content: 'A -------.', choices: ['a','b','c','d'], correctAnswer: 'A',
    skillCodes: ['P5_PARTS_OF_SPEECH'], explanation: 'Source explanation', provenance: {} }];
  assert.equal((await apply(db, rows)).created, 1);
  const again = await apply(db, rows);
  assert.equal(again.created, 0);
  assert.equal(again.skipped, 1);
  assert.equal(stored[0].totalAttempts, 10);
});

test('all parts preserve passage groups, numbered blanks and local media', () => {
  const { rows } = prepare({ parts: [1, 2, 3, 4, 5, 6, 7] });
  assert.deepEqual([...new Set(rows.map(q => q.part))].sort(), [1, 2, 3, 4, 5, 6, 7]);
  for (const row of rows) {
    if (row.part <= 4) assert.match(row.audioUrl, /^\/api\/exam\/media\/[a-f0-9]{64}\.mp3$/);
    if (row.part === 1) assert.ok(row.imageUrl);
    if (row.part === 2) assert.equal(row.choices.length, 3);
    if (row.part >= 6) assert.ok(row.passage.length > 30);
    if (row.part === 6) {
      const number = row.content.match(/\[(\d+)\]/)[1];
      assert.ok(row.passage.includes(`[${number}] -------`));
    }
    assert.equal(row.choices.length, row.part === 2 ? 3 : 4);
  }
  for (const part of [3, 4, 6, 7]) {
    const groups = new Map();
    for (const row of rows.filter(q => q.part === part)) {
      const key = row.provenance.contentId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    for (const group of groups.values()) {
      assert.equal(new Set(group.map(q => q.passage)).size, 1);
      if (part <= 4) assert.equal(new Set(group.map(q => q.audioUrl)).size, 1);
    }
  }
});

test('numbers repeated zero-valued blanks in source order without changing source', () => {
  const tree = { children: [['blank', { number: 0 }], ['blank', { number: 0 }]] };
  assert.equal(richText(labelBlanks(tree)), ' [1] -------  [2] ------- ');
  assert.equal(tree.children[0][1].number, 0);
});

test('preserves source tables, text styles, cell spans and blanks without publishing HTML', () => {
  const tree = { children: [['paragraph', { children: [['text', { value: 'Notice', weight: '#w700' }], ['blank', { number: 0 }]] }],
    ['table', { body: { rows: [{ cells: [{ colspan: 2, rowspan: 1, children: [['text', { value: '<script>literal source text</script>' }]] }] }] } }]] };
  const output = renderNodes(tree, { part: 6, media: { resolve: () => undefined } });
  assert.deepEqual(output[0].children, [{ type: 'text', text: 'Notice', bold: true }, { type: 'blank', number: 1 }]);
  assert.equal(output[1].type, 'table');
  assert.equal(output[1].children[0].children[0].colSpan, 2);
  assert.equal(output[1].children[0].children[0].children[0].text, '<script>literal source text</script>');
});
