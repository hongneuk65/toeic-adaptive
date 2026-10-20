const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyVocabulary, importVocabulary, summarizeVocabulary } = require('./santa-vocabulary-topics.cjs');
const { vocabularySource } = require('./reorganize-santa-vocabulary.cjs');
test('explicit vocabulary, contextual examples and honest fallback are deterministic', () => {
  assert.equal(classifyVocabulary({ word: 'invoice' }).key, 'finance');
  assert.equal(classifyVocabulary({ word: 'promptly', example: 'The airline delayed our flight at the airport.' }).key, 'travel');
  assert.equal(classifyVocabulary({ word: 'yet', example: 'It is not ready yet.' }).key, 'general');
});
test('all 854 source cards have exactly one topic without claiming semantic source labels', () => {
  const data = vocabularySource();
  assert.equal(data.length, 854);
  assert.equal(new Set(data.map(v => v.key)).size, 854);
  const counts = summarizeVocabulary(data);
  assert.equal(counts.reduce((n,row) => n + row.count, 0), 854);
  assert.ok(counts.length >= 10);
  assert.ok(counts.some(row => row.key.startsWith('general') && row.count > 0));
});
test('migration preserves card identity, notes and reviews, leaves legacy folders and is idempotent', async () => {
  const cards = new Map([['santa-vocabulary:v1', { id: 71, readingKey: 'santa-vocabulary:v1', userId: null, folderId: 3, topic: 'Santa TOEIC', notes: 'Learner note', reviewCount: 9 }]]);
  const folders = new Map(); const updates = [];
  const tx = {
    flashcardFolder: { upsert: async ({where,create}) => { if (!folders.has(where.readingKey)) folders.set(where.readingKey, { id: 30 + folders.size, ...create }); return folders.get(where.readingKey); } },
    flashcard: { findUnique: async ({where}) => cards.get(where.readingKey), update: async ({where,data}) => { updates.push(data); const card = [...cards.values()].find(c=>c.id === where.id); Object.assign(card,data); }, create: async ({data}) => { cards.set(data.readingKey, { id: 72, ...data }); } },
  };
  const input = [{ key: 'santa-vocabulary:v1', word: 'invoice', meaning: 'hóa đơn', notes: 'Original source' }, { key: 'santa-vocabulary:v2', word: 'passport', meaning: 'hộ chiếu' }];
  const first = await importVocabulary(tx,input,1);
  assert.equal(first.created,1); assert.equal(first.moved,1);
  assert.deepEqual(Object.keys(updates[0]).sort(), ['folderId','topic']);
  assert.equal(cards.get('santa-vocabulary:v1').id,71);
  assert.equal(cards.get('santa-vocabulary:v1').notes,'Learner note');
  assert.equal(cards.get('santa-vocabulary:v1').reviewCount,9);
  const second = await importVocabulary(tx,input,1);
  assert.equal(second.created,0); assert.equal(second.moved,0);
  assert.ok([...folders.values()].every(f=>f.private === false));
});
