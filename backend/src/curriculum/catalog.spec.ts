import { CURRICULUM_TRACKS } from './catalog';

describe('Published curriculum content integrity', () => {
 it('keeps unique units, satisfiable prerequisites and complete learning material', () => {
  const allIds = CURRICULUM_TRACKS.flatMap(track => track.units.map(unit=>unit.id));
  expect(new Set(allIds).size).toBe(allIds.length);
  expect(CURRICULUM_TRACKS).toHaveLength(5);
  for(const track of CURRICULUM_TRACKS) {
   expect(track.units).toHaveLength(6);
   const earlier = new Set<string>();
   for(const unit of track.units) {
    for(const prerequisite of unit.prerequisites) expect(earlier.has(prerequisite)).toBe(true);
    earlier.add(unit.id);
    expect(unit.knowledge.trim().split(/\s+/).length).toBeGreaterThanOrEqual(180);
    expect(unit.examples.length).toBeGreaterThanOrEqual(2);
    expect(unit.vocabulary.length).toBeGreaterThanOrEqual(4);
    expect(unit.reading.length).toBeGreaterThan(70);
    expect(unit.listening.length).toBeGreaterThan(70);
    expect(unit.reading).not.toEqual(unit.listening);
    expect(unit.guided).toHaveLength(3);expect(unit.checkpoint).toHaveLength(5);
    const ids=[...unit.guided,...unit.checkpoint].map(q=>q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const guidedPrompts=new Set(unit.guided.map(q=>q.prompt));
    for(const question of unit.checkpoint) expect(guidedPrompts.has(question.prompt)).toBe(false);
    expect(unit.checkpoint.some(q=>q.kind==='reading')).toBe(true);
    expect(unit.checkpoint.some(q=>q.kind==='listening')).toBe(true);
    for(const question of [...unit.guided,...unit.checkpoint]) {
     expect(question.options.length).toBeGreaterThanOrEqual(2);
     expect(new Set(question.options.map(option=>option.trim())).size).toBe(question.options.length);
     expect(Number.isInteger(question.answer)).toBe(true);
     expect(question.answer).toBeGreaterThanOrEqual(0);expect(question.answer).toBeLessThan(question.options.length);
     expect(question.explanation.length).toBeGreaterThan(15);
    }
   }
   expect(new Set(track.units.flatMap(unit=>unit.checkpoint.map(q=>q.answer))).size).toBeGreaterThan(1);
  }
 });
});


describe('Advanced learning material',()=>{
 it.each([['toeic-650-800',150,100],['toeic-800-plus',250,160]] as const)('%s uses substantial contexts and varied answer positions',(id,readMin,listenMin)=>{
  const track=CURRICULUM_TRACKS.find(t=>t.id===id)!;expect(track).toBeDefined();
  const patterns=new Set<string>();
  for(const unit of track.units){
   expect(unit.reading.trim().split(/\s+/).length).toBeGreaterThanOrEqual(readMin);
   expect(unit.listening.trim().split(/\s+/).length).toBeGreaterThanOrEqual(listenMin);
   patterns.add(unit.checkpoint.map(q=>q.answer).join(','));
  }
  expect(patterns.size).toBeGreaterThanOrEqual(4);
 });
});
