import { advanceReview, chooseToday, dailyStudySummary, studyDayWindow, gradeCheckpoint, safeCheckpoint, unitSummary } from './policy';
import type { UnitState } from './policy';
import type { Unit, Question } from './catalog';
const question: Question = { id:'q1', kind:'knowledge',prompt:'Choose',options:['A','B'],answer:1,explanation:'Because B.' };
const unit: Unit = { id:'one',title:'One',minutes:30,objectives:['Understand'],prerequisites:[],knowledge:'Lesson',examples:[],vocabulary:[],reading:'Text',listening:'Script',guided:[],checkpoint:[question] };
const now = new Date('2026-11-02T10:00:00Z');
const day = (n:number) => new Date(now.getTime()+n*86400000);
describe('curriculum grading and review policy',()=>{
 it('withholds checkpoint keys while grading exact valid submissions',()=>{
  expect(safeCheckpoint(question)).not.toHaveProperty('answer');
  expect(safeCheckpoint(question)).not.toHaveProperty('explanation');
  expect(gradeCheckpoint([question],{q1:1})).toMatchObject({correct:1,total:1,score:100,passed:true});
  for(const invalid of [{},{q1:-1},{q1:2},{q1:0.5},{q1:1,q2:0},{q2:1}])expect(()=>gradeCheckpoint([question],invalid)).toThrow();
 });
 it('does not round an assessment below the pass threshold into passing',()=>{
  const qs=Array.from({length:101},(_,i)=>({...question,id:String(i)}));
  const answers=Object.fromEntries(qs.map((q,i)=>[q.id,i<80?1:0]));
  expect(gradeCheckpoint(qs,answers)).toMatchObject({score:79,passed:false});
 });
 it('requires prerequisites and does not count opening as completion',()=>{
  expect(unitSummary({...unit,prerequisites:['before']},[],true).unlocked).toBe(false);
  expect(unitSummary(unit,[],true)).toMatchObject({completed:false,bestScore:null});
  expect(unitSummary(unit,[],false).unlocked).toBe(false);
 });
 it('keeps failed first attempts incomplete and schedules first passed review after a day',()=>{
  expect(advanceReview(undefined,false,60,now)).toMatchObject({completedAt:null,nextReviewAt:null,reviewStage:0});
  expect(advanceReview(undefined,true,80,now)).toMatchObject({completedAt:now,nextReviewAt:day(1),reviewStage:0});
 });
 it('does not consume delayed reviews on early repeats, then uses 1,3,7,14-day gaps',()=>{
  let state:UnitState={...advanceReview(undefined,true,80,now),unitId:'one'};
  const early=advanceReview(state,true,100,new Date(now.getTime()+1000));
  expect(early.nextReviewAt).toEqual(day(1));expect(early.reviewStage).toBe(0);
  state=advanceReview(state,true,100,day(1));
  expect(state.nextReviewAt).toEqual(day(4));expect(state.reviewStage).toBe(1);
  state=advanceReview(state,true,100,day(4));expect(state.nextReviewAt).toEqual(day(11));
  state=advanceReview(state,true,100,day(11));expect(state.nextReviewAt).toEqual(day(25));
  state=advanceReview(state,true,100,day(25));expect(state.nextReviewAt).toBeNull();expect(state.reviewStage).toBe(4);
 });
 it('failed due review returns tomorrow without losing prerequisite completion or advancing stage',()=>{
  const state={...advanceReview(undefined,true,80,now),unitId:'one'};
  const next=advanceReview(state,false,40,day(1));
  expect(next).toMatchObject({completedAt:now,bestScore:80,reviewStage:0,nextReviewAt:day(2)});
 });
 it('keeps overdue reviews from previous tracks and honors budget without emptying a long first unit',()=>{
  const fresh={...unitSummary(unit,[],true),trackId:'current'};
  const review={...fresh,id:'prior',trackId:'old',completed:true,nextReviewAt:now.toISOString()};
  expect(chooseToday([fresh,review],'current',15,now)).toEqual([{...review,reason:'review'}]);
  expect(chooseToday([fresh],'current',15,now)).toEqual([{...fresh,reason:'new'}]);
 });
});

describe('Vietnam daily study workload',()=>{
 it('rolls the day at 17:00 UTC, independently of the host timezone',()=>{
  expect(studyDayWindow(new Date('2026-11-02T16:59:59.999Z'))).toEqual({
   date:'2026-11-02',start:new Date('2026-11-01T17:00:00.000Z'),end:new Date('2026-11-02T17:00:00.000Z'),
  });
  expect(studyDayWindow(new Date('2026-11-02T17:00:00.000Z'))).toEqual({
   date:'2026-11-03',start:new Date('2026-11-02T17:00:00.000Z'),end:new Date('2026-11-03T17:00:00.000Z'),
  });
 });
 it('counts unique successful catalog units once and preserves partially remaining workload',()=>{
  expect(dailyStudySummary([{id:'a',minutes:35},{id:'b',minutes:30}], [
   {unitId:'a',result:{passed:true}},{unitId:'a',result:{passed:true}},
   {unitId:'b',result:{passed:false}},{unitId:'unknown',result:{passed:true}},
  ],60,now)).toEqual({date:'2026-11-02',budgetMinutes:60,completedMinutes:35,remainingMinutes:25});
 });
 it('returns no recommendations when zero workload remains',()=>{
  const fresh={...unitSummary(unit,[],true),trackId:'current'};
  expect(chooseToday([fresh],'current',0,now)).toEqual([]);
  expect(dailyStudySummary([{id:'a',minutes:35}], [{unitId:'a',result:{passed:true}}],30,now).remainingMinutes).toBe(0);
 });
});
