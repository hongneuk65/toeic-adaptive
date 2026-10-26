const {test}=require('node:test');
const assert=require('node:assert/strict');
const {trailingSilence}=require('../prisma/audio-measurement.cjs');
test('only trailing silence counts; internal pauses are preserved',()=>{
  assert.equal(trailingSilence('silence_start: 2\nsilence_end: 3\nsilence_start: 9\nsilence_end: 10',10),1);
  assert.equal(trailingSilence('silence_start: 2\nsilence_end: 3',10),0);
  assert.equal(trailingSilence('silence_start: 9.5',10),.5);
  assert.equal(trailingSilence('',10),0);
});
test('all-silent media fails the audit rather than receiving a timing profile',()=>{
  assert.throws(()=>trailingSilence('silence_start: 0\nsilence_end: 10',10),/no measurable speech/);
});
