const assert = require('node:assert/strict');
const { test } = require('node:test');
const { sourceTranscript, importListening } = require('../prisma/prepare-santa-listening.cjs');
test('uses every spoken choice in P1 and the spoken question plus three responses in P2', () => {
  assert.equal(sourceTranscript({ part: 1, choices: ['one', 'two', 'three', 'four'] }), 'one\ntwo\nthree\nfour');
  assert.equal(sourceTranscript({ part: 2, content: 'Where?', choices: ['here', 'there', 'outside', 'stale'] }), 'Where?\nhere\nthere\noutside');
  assert.equal(sourceTranscript({ part: 3, passage: 'Graphic, not dialogue' }), null);
  assert.equal(sourceTranscript({ part: 4, passage: 'Graphic, not announcement' }), null);
});
test('import is idempotent and preserves existing human transcripts', async () => {
  let transcript = null, creates = 0;
  const tx = { $queryRaw: async () => {}, listeningSource: { findFirst: async () => ({ id: 1 }) }, listeningTranscript: { findFirst: async () => transcript, create: async ({data}) => { transcript = data; creates++; } } };
  const prisma = { $transaction: async work => work(tx) };
  const row = { url: 'audio', version: 'v1', duration: 20, text: 'actual source', reason: null };
  assert.equal((await importListening(prisma, [row])).created, 1);
  assert.equal((await importListening(prisma, [row])).existing, 1);
  transcript = { version: 'human-edited' };
  assert.equal((await importListening(prisma, [row])).protected, 1);
  assert.equal(creates, 1);
});
