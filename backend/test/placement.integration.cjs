// Isolated PostgreSQL integration: synthetic questions only, no production records.
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {resolve}=require('node:path');
const {PrismaClient}=require('@prisma/client');
const {PlacementService}=require('../dist/placement/placement.service');
const {Das3hService}=require('../dist/das3h/das3h.service');
const {MasteryOutboxService}=require('../dist/queue/mastery-outbox.service');
require('../dist/config/environment');
assert.ok(process.env.DATABASE_URL,'Configure a local PostgreSQL test connection');
process.env.DAS3H_MODEL_PATH='';
const admin=new PrismaClient();
const schema=`placement_test_${randomUUID().replaceAll('-','')}`;
const url=new URL(process.env.DATABASE_URL);url.searchParams.set('schema',schema);url.searchParams.set('connection_limit','5');
const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
const service=new PlacementService(db);
let checks=0;
async function ageCurrent(id){
  // Advance synthetic fixture chronology without waiting for mock audio in real time.
  const a=await db.placementAttempt.findUniqueOrThrow({where:{id}});
  const old=new Date(Date.now()-120000).toISOString();
  await db.placementAttempt.update({where:{id},data:{startedAt:new Date(old),responses:a.responses.map(r=>({...r,occurredAt:old}))}});
}
async function main(){
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  execFileSync(process.execPath,[resolve(__dirname,'../node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8',timeout:60000,stdio:'pipe'});
  await db.user.createMany({data:[{id:1,email:'one@example.invalid',passwordHash:'fixture'},{id:2,email:'two@example.invalid',passwordHash:'fixture'}]});
  await db.skill.createMany({data:Array.from({length:7},(_,i)=>({id:i+1,code:`SKILL_${i+1}`,name:`Skill ${i+1}`,part:i+1,category:'Fixture'}))});
  const questions=[];let id=0;
  for(let part=1;part<=7;part++)for(let group=0;group<18;group++){
    const size=[0,1,1,3,3,1,4,3][part];
    for(let position=1;position<=size;position++)questions.push({id:++id,part,content:`Question ${id}`,passage:part>=6?`passage ${part}-${group}`:null,audioUrl:part<=4?`/api/exam/media/${part}-${group}.mp3`:null,stimulus:{version:1,groupId:`${part}-${group}`,questionPosition:position,audioDurationSeconds:.1,documents:[{id:'doc',blocks:[{type:'paragraph',children:[{type:'text',text:'SECRET TRANSCRIPT'}]}]}]},optionA:'one',optionB:'two',optionC:'three',optionD:part===2?'':'four',correctAnswer:'A',explanation:'[admin-question] Fixture',difficulty:['EASY','MEDIUM','HARD'][group%3],itemDifficulty:0});
  }
  await db.question.createMany({data:questions.map(q=>({...q,imageUrl:q.part===1?'/photo.jpg':null}))});
  await db.questionSkill.createMany({data:questions.map(q=>({questionId:q.id,skillId:q.part}))});
  const preferences={goal:'CHALLENGE',targetScore:800};
  const initial=await service.overview(1);assert.equal(initial.catalog.available,true);checks++;
  const [one,two]=await Promise.all([service.start(1,preferences),service.start(1,preferences)]);
  assert.equal(one.id,two.id);assert.equal(await db.placementAttempt.count({where:{status:'ACTIVE'}}),1);checks++;
  const publicText=JSON.stringify(one);assert.ok(!publicText.includes('correctAnswer'));assert.ok(!publicText.includes('SECRET TRANSCRIPT'));assert.ok(!publicText.includes('itemDifficulty'));checks++;
  await assert.rejects(()=>service.get(2,one.id),/Không tìm thấy/);checks++;
  const firstAnswers=one.currentGroup.questions.map(q=>({questionId:q.id,selectedAnswer:'A'}));
  await assert.rejects(()=>service.answer(1,one.id,{revision:0,answers:firstAnswers}),/Hãy nghe hết/);checks++;
  await assert.rejects(()=>service.answer(1,one.id,{revision:0,answers:[{questionId:999999,selectedAnswer:'A'}]}),/đúng các câu/);checks++;
  await ageCurrent(one.id);
  const [a,b]=await Promise.all([service.answer(1,one.id,{revision:0,answers:firstAnswers}),service.answer(1,one.id,{revision:0,answers:firstAnswers})]);
  assert.equal(a.revision,1);assert.equal(b.revision,1);assert.equal(await db.masteryOutbox.count(),firstAnswers.length);checks++;
  await assert.rejects(()=>service.answer(1,one.id,{revision:0,answers:firstAnswers.map(r=>({...r,selectedAnswer:'B'}))}),/đã thay đổi/);checks++;
  let current=a;
  while(current.status==='ACTIVE'){
    await ageCurrent(current.id);
    current=await service.answer(1,current.id,{revision:current.revision,answers:current.currentGroup.questions.map(q=>({questionId:q.id,selectedAnswer:'A'}))});
  }
  assert.equal(current.status,'COMPLETED');assert.ok(current.result.answered>=40&&current.result.answered<=42);assert.equal(current.reference.status,'pending');checks++;
  const frozen=await db.placementAttempt.findUniqueOrThrow({where:{id:one.id}});
  assert.equal(await db.masteryOutbox.count(),frozen.responses.length);checks++;
  const outbox=new MasteryOutboxService(db,new Das3hService(db));
  for(let i=0;i<6;i++)await outbox.flush();
  assert.equal(await db.masteryOutbox.count({where:{processedAt:null}}),0);
  assert.equal(await db.studentSkillHistory.count(),frozen.responses.length);checks++;
  const completed=await service.get(1,one.id);assert.equal(completed.reference.status,'unavailable');assert.ok(!JSON.stringify(completed.result).includes('toeicScore'));checks++;
  await service.savePreferences(1,{goal:'FOUNDATION',targetScore:null});
  assert.deepEqual((await service.overview(1)).preferences,{goal:'FOUNDATION',targetScore:null});checks++;
  const retake=await service.start(1,{goal:'FOUNDATION'});
  const oldIds=new Set(frozen.responses.map(r=>r.questionId));assert.ok(retake.currentGroup.questions.every(q=>!oldIds.has(q.id)));checks++;
  const qid=retake.currentGroup.questions[0].id;
  await db.question.update({where:{id:qid},data:{content:'Edited after issue'}});
  await ageCurrent(retake.id);
  const expired=await service.answer(1,retake.id,{revision:0,answers:retake.currentGroup.questions.map(q=>({questionId:q.id,selectedAnswer:'A'}))});
  assert.equal(expired.status,'EXPIRED');assert.equal(expired.answeredCount,0);checks++;
  const timeout=await service.start(1,{goal:'BALANCED'});
  await db.placementAttempt.update({where:{id:timeout.id},data:{deadlineAt:new Date(0)}});
  const timed=await service.get(1,timeout.id);assert.equal(timed.status,'EXPIRED');assert.equal(timed.answeredCount,0);checks++;
  console.log(JSON.stringify({checks,syntheticQuestions:questions.length,status:'passed'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  await db.$disconnect();
  if(!/^placement_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup schema');
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.$disconnect();
});
