require('../dist/config/environment');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const { randomUUID } = require('node:crypto');
const { readFile, unlink } = require('node:fs/promises');
const { resolve, basename } = require('node:path');
const prisma = new PrismaClient();
const base = process.env.LISTENING_TEST_URL || 'http://127.0.0.1:3000';
const users = []; const publicSources = [];
const uploadedMedia = [];
const jwt = new JwtService({ secret: process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp' });
async function request(token, path, method = 'GET', body) {
  const response = await fetch(`${base}/listening${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json(); return { status: response.status, value };
}
async function main() {
  for (const role of ['USER', 'USER', 'ADMIN']) {
    const user = await prisma.user.create({ data: { email: `listening-test-${randomUUID()}@example.invalid`, passwordHash: 'integration-only', role } });
    users.push(user); user.token = jwt.sign({ sub: user.id, role, email: user.email }, { expiresIn: '10m' });
  }
  const [first, second, admin] = users;
  const catalog = await request(first.token, ''); assert.equal(catalog.status, 200);
  const demo = catalog.value.sources.find(source => source.url === '/listening-demo.wav'); assert.ok(demo, 'Run seed:listening first');
  const opened = await request(first.token, '/sessions', 'POST', { sourceId: demo.id, start: 0, end: 30 }); assert.equal(opened.status, 201);
  const session = opened.value; assert.equal(session.totalUnits, 4); assert.ok(!('text' in session.unit)); assert.equal(session.feedback, null);
  assert.equal((await request(second.token, `/sessions/${session.id}`)).status, 404);
  assert.equal((await request(first.token, '/sessions', 'POST', { sourceId: demo.id, start: 0, end: 301 })).status, 400);
  const submitted = await request(first.token, `/sessions/${session.id}/answers`, 'POST', { unitId: session.unit.id, mode: 'CLOZE', difficulty: 'MEDIUM', answer: 'meeting oclock' }); assert.equal(submitted.status, 201); assert.ok(submitted.value.expected);
  assert.ok((await request(first.token, `/sessions/${session.id}`)).value.feedback, 'submitted result survives reload');
  const dictation = await request(first.token, `/sessions/${session.id}`, 'PATCH', { mode: 'DICTATION' }); assert.equal(dictation.status, 200); assert.equal(dictation.value.feedback, null); assert.ok(!dictation.value.unit.tokens);
  const answer = await request(first.token, `/sessions/${session.id}/answers`, 'POST', { unitId: session.unit.id, mode: 'DICTATION', difficulty: 'MEDIUM', answer: 'The meeting will begin at nine oclock.' }); assert.equal(answer.value.score, 1);
  await request(first.token, `/sessions/${session.id}`, 'PATCH', { currentIndex: 2, favorite: true });
  const resumed = await request(first.token, `/sessions/${session.id}`); assert.equal(resumed.value.currentIndex, 2); assert.equal(resumed.value.favorite, true);
  const privateSource = await prisma.listeningSource.create({ data: { ownerId: first.id, title: 'Private integration fixture', kind: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' } });
  assert.equal((await request(second.token, `/sources/${privateSource.id}`)).status, 404);
  assert.equal((await request(second.token, `/admin/sources/${privateSource.id}/subtitles`, 'POST', { format: 'TEXT', text: 'Private text', start: 0, end: 2 })).status, 403);
  assert.equal((await request(first.token, '/sources', 'POST', { title: 'Bad', kind: 'YOUTUBE', url: 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ' })).status, 400);
  const uploaded = await request(admin.token, `/admin/sources/${privateSource.id}/subtitles`, 'POST', { format: 'SUBTITLES', text: '1\n00:00:02,000 --> 00:00:03,000\nPlease bring\n\n2\n00:00:03,000 --> 00:00:05,000\nthe schedule.' }); assert.equal(uploaded.status, 201);
  const sameUpload = await request(admin.token, `/admin/sources/${privateSource.id}/subtitles`, 'POST', { format: 'SUBTITLES', text: '1\n00:00:02,000 --> 00:00:03,000\nPlease bring\n\n2\n00:00:03,000 --> 00:00:05,000\nthe schedule.' }); assert.equal(sameUpload.value.id, uploaded.value.id, 'reuse identical imported transcript version');
  const segment = await request(first.token, '/sessions', 'POST', { sourceId: privateSource.id, start: 2, end: 5 }); assert.equal(segment.value.totalUnits, 1); assert.equal(segment.value.unit.start, 2); assert.equal(segment.value.unit.end, 5);
  assert.equal((await request(first.token, '/admin')).status, 403);
  assert.equal((await request(first.token, `/sources/${privateSource.id}/subtitles`, 'POST', { format: 'TEXT', text: 'No peeking', start: 0, end: 2 })).status, 404);
  assert.equal((await request(second.token, `/sources/${privateSource.id}`, 'DELETE')).status, 404);
  assert.equal((await request(first.token, `/sources/${demo.id}`, 'DELETE')).status, 404);
  assert.equal((await request(first.token, `/sources/${privateSource.id}`, 'DELETE')).status, 200);
  assert.equal((await request(first.token, `/sources/${privateSource.id}`)).status, 404);
  assert.equal((await request(first.token, `/sessions/${segment.value.id}`)).status, 404);
  const afterRemove = await request(first.token, '');
  assert.ok(!afterRemove.value.sources.some(source => source.id === privateSource.id));
  assert.ok(!afterRemove.value.sessions.some(session => session.id === segment.value.id));
  assert.equal((await request(second.token, `/sources/${privateSource.id}/restore`, 'POST')).status, 404);
  assert.equal((await request(first.token, `/sources/${privateSource.id}/restore`, 'POST')).status, 201);
  assert.equal((await request(first.token, `/sessions/${segment.value.id}`)).status, 200);
  if (catalog.value.asrAvailable) {
    const audioFixture = await prisma.listeningSource.create({ data: { ownerId: first.id, title: 'ASR private audio fixture', kind: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' } });
    const audioBytes = await readFile('../frontend/public/listening-demo.wav');
    async function uploadAudio(token, start = 10, end = 26) {
      const body = new FormData(); body.append('file', new Blob([audioBytes], { type: 'audio/wav' }), 'segment.wav'); body.append('start', String(start)); body.append('end', String(end));
      const response = await fetch(`${base}/listening/sources/${audioFixture.id}/audio`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      return { status: response.status, value: await response.json() };
    }
    assert.equal((await uploadAudio(second.token)).status, 404);
    assert.equal((await uploadAudio(first.token, 0, 301)).status, 400);
    const queued = await uploadAudio(first.token); assert.equal(queued.status, 201);
    let audioStatus; const audioDeadline = Date.now() + 300000;
    do {
      audioStatus = (await request(first.token, `/sources/${audioFixture.id}?start=10&end=26`)).value.transcript;
      if (['READY', 'FAILED'].includes(audioStatus?.status)) break;
      await new Promise(done => setTimeout(done, 500));
    } while (Date.now() < audioDeadline);
    assert.equal(audioStatus?.status, 'READY', audioStatus?.error || 'Real audio ASR must complete');
    assert.equal(audioStatus.provider, 'local-audio'); assert.equal(audioStatus.segmentStart, 10);
    assert.ok(!('cues' in audioStatus) && !('text' in audioStatus), 'script stays hidden');
    const recognized = (await request(first.token, '/sessions', 'POST', { sourceId: audioFixture.id, start: 10, end: 26 })).value;
    assert.ok(recognized.totalUnits >= 3); assert.ok(recognized.unit.start >= 10); assert.ok(!('text' in recognized.unit));
    const graded = await request(first.token, `/sessions/${recognized.id}/answers`, 'POST', { unitId: recognized.unit.id, mode: recognized.mode, difficulty: recognized.difficulty, answer: 'meeting' });
    assert.equal(graded.status, 201); assert.match(graded.value.expected, /meeting/i); assert.match(graded.value.note, /tự động/);
    assert.equal((await request(first.token, `/sources/${audioFixture.id}?start=30&end=45`)).value.transcript, null, 'ASR for one range cannot serve another');
    console.log('Real local Whisper PASS: uploaded audio -> queued recognition -> hidden exercises -> graded answer, correct range and private ownership.');
  }
  const draft = await request(admin.token, '/admin/sources', 'POST', { title: 'Integration draft', kind: 'AUDIO', url: '/listening-demo.wav', published: false }); assert.equal(draft.status, 201); publicSources.push(draft.value.id);
  assert.equal((await request(first.token, `/sources/${draft.value.id}`)).status, 404);
  await request(admin.token, `/admin/sources/${draft.value.id}`, 'PATCH', { published: true }); assert.equal((await request(first.token, `/sources/${draft.value.id}`)).status, 200);
  const form = new FormData(); form.append('file', new Blob([await readFile('../frontend/public/listening-demo.wav')], { type: 'audio/wav' }), 'demo.wav');
  const mediaResponse = await fetch(`${base}/listening/admin/media`, { method: 'POST', headers: { Authorization: `Bearer ${admin.token}` }, body: form });
  const media = await mediaResponse.json(); assert.equal(mediaResponse.status, 201); uploadedMedia.push(basename(media.url));
  const ranged = await fetch(`${base}${media.url.replace(/^\/api/, '')}`, { headers: { Range: 'bytes=0-99' } }); assert.equal(ranged.status, 206); assert.equal((await ranged.arrayBuffer()).byteLength, 100);
  const youtube = await request(first.token, '/sources', 'POST', { title: 'YouTube worker integration', kind: 'YOUTUBE', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }); assert.equal(youtube.status, 201);
  let youtubeStatus;
  const deadline = Date.now() + 350000;
  do {
    youtubeStatus = (await request(first.token, `/sources/${youtube.value.id}`)).value.transcript;
    if (['READY', 'FAILED'].includes(youtubeStatus?.status)) break;
    await new Promise(done => setTimeout(done, 500));
  } while (Date.now() < deadline);
  assert.ok(['READY', 'FAILED'].includes(youtubeStatus?.status), 'BullMQ worker must finish or report failure within bounded time');
  console.log(`YouTube live worker: ${youtubeStatus.status}${youtubeStatus.error ? ` (${youtubeStatus.error})` : ''}`);
  assert.equal((await prisma.studentSkillHistory.count({ where: { userId: first.id } })), 0);
  assert.equal((await prisma.userSkillMastery.count({ where: { userId: first.id } })), 0);
  assert.equal((await prisma.user.findUnique({ where: { id: first.id } })).ability, 0);
  console.log('Listening integration PASS: audio cloze/dictation, hidden answers, persisted result/progress, segment merging, privacy, admin publishing, DAS3H untouched.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  // These records were created exclusively by this test in this run.
  await prisma.listeningSource.deleteMany({ where: { id: { in: publicSources } } });
  await prisma.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
  for (const name of uploadedMedia) if (/^[a-f0-9-]{36}\.wav$/.test(name)) await unlink(resolve(process.env.LISTENING_MEDIA_DIR || './storage/listening', name));
  await prisma.$disconnect();
});
