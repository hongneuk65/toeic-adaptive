import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/sse.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { readJsonSse } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

function response(text, byteByByte = false) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({
    start(controller) {
      if (byteByByte) for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      else controller.enqueue(bytes);
      controller.close();
    },
  }));
}

async function collect(res) {
  const events = [];
  for await (const event of readJsonSse(res)) events.push(event);
  return events;
}

test('streams split Vietnamese UTF-8, CRLF frames, comments and final result', async () => {
  const res = response(': keep-alive\r\n\r\ndata: {"chunk":"Giải thích"}\r\n\r\ndata: {"result":{"questionId":1}}\r\n\r\ndata: [DONE]\r\n\r\n', true);
  assert.deepEqual(await collect(res), [{ chunk: 'Giải thích' }, { result: { questionId: 1 } }]);
  assert.equal(res.body.locked, false);
});

test('delivers first text without waiting for remaining answer', async () => {
  let controller;
  const res = new Response(new ReadableStream({ start(value) { controller = value; } }));
  const iterator = readJsonSse(res);
  controller.enqueue(new TextEncoder().encode('data: {"chunk":"first"}\n\n'));
  assert.deepEqual((await iterator.next()).value, { chunk: 'first' });
  await iterator.return();
  assert.equal(res.body.locked, false);
});

test('DONE stops reading and cancels a connection left open by the server', async () => {
  let cancelled = false;
  const res = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); },
    cancel() { cancelled = true; },
  }));
  assert.deepEqual(await collect(res), []);
  assert.equal(cancelled, true);
});

test('propagates server errors after partial text', async () => {
  const iterator = readJsonSse(response('data: {"chunk":"part"}\n\nevent: error\ndata: {"message":"interrupted"}\n\n'));
  assert.deepEqual((await iterator.next()).value, { chunk: 'part' });
  await assert.rejects(iterator.next(), /interrupted/);
});

test('does not treat truncated streams as completed answers', async () => {
  await assert.rejects(collect(response('data: {"chunk":"part"}\n\n')), /chưa hoàn tất|trước khi hoàn tất/);
});

test('reports malformed JSON instead of silently dropping part of an answer', async () => {
  await assert.rejects(collect(response('data: {broken}\n\ndata: [DONE]\n\n')), SyntaxError);
});

test('supports final DONE without a newline and rejects missing response bodies', async () => {
  assert.deepEqual(await collect(response('data: [DONE]')), []);
  await assert.rejects(collect(new Response(null)), /luồng dữ liệu/);
});