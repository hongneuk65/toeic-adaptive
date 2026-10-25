// Live DB acceptance in an isolated schema. No production learner answers are changed.
require('reflect-metadata');
require('../dist/config/environment');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { writeFileSync, unlinkSync } = require('node:fs');
const { resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { Das3hService } = require('../dist/das3h/das3h.service');
const { MasteryOutboxService } = require('../dist/queue/mastery-outbox.service');
const { MasteryService } = require('../dist/mastery/mastery.service');
const { questionFingerprint, modelProbability, WINDOWS_MS } = require('../dist/das3h/trained-das3h');
const schema = `das3h_test_${randomUUID().replaceAll('-','')}`;
const fixturePath = resolve(tmpdir(), `${schema}.json`);
const originalPath = process.env.DAS3H_MODEL_PATH;
const admin = new PrismaClient();
let db;
(async()=>{
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname),'This acceptance test requires a local DB');
  assert.match(schema,/^das3h_test_[a-f0-9]{32}$/);
  url.searchParams.set('schema',schema);
  execFileSync(process.execPath,[resolve(__dirname,'../node_modules/prisma/build/index.js'),'db','push','--skip-generate'],{
    cwd:resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:url.toString()},stdio:'pipe',timeout:60000});
  db = new PrismaClient({datasources:{db:{url:url.toString()}}});
  const user = await db.user.create({data:{email:'fixture@example.invalid',passwordHash:'fixture',ability:.8}});
  const skills = await Promise.all([1,2].map(i=>db.skill.create({data:{code:`FIXTURE_${i}`,name:`Fixture ${i}`,part:5,category:'Grammar'}})));
  const question = await db.question.create({data:{part:5,content:'A _____ report.',optionA:'clear',optionB:'clearly',optionC:'clears',optionD:'clearing',correctAnswer:'A',explanation:'[santa-ednet:q11]',itemDifficulty:0,skills:{create:skills.map(s=>({skillId:s.id}))}}});
  const model = {schemaVersion:1,featureContract:'own-das3h-d0-cumulative-v1',version:'own-das3h-1234567890abcdef',intercept:-.2,
    windowsMs:WINDOWS_MS,questions:{q11:{bias:.1,tags:['OWN_A','OWN_B'],part:5,correctAnswer:'A'}},
    skills:{OWN_A:{bias:.05,wins:[.2,.1,.1,.1,.1],attempts:[-.05,-.02,-.02,-.02,-.02]},OWN_B:{bias:.05,wins:[.2,.1,.1,.1,.1],attempts:[-.05,-.02,-.02,-.02,-.02]}},
    applicationBridge:{q11:questionFingerprint(question)},releaseGatePassed:true,sourceHashes:{catalog:'fixture'},metrics:{},cohort:{},mappingStatus:'fixture'};
  writeFileSync(fixturePath,JSON.stringify(model));process.env.DAS3H_MODEL_PATH=fixturePath;
  const service = new Das3hService(db);
  const initial = await service.predictProbCorrect(user.id,question.id);
  assert.ok(Math.abs(initial-modelProbability(model,'q11',new Map()))<1e-12,'Ignores legacy ability for a new model version');
  const at = new Date(Date.now()-10000);
  await service.recordAndSync(user.id,question.id,true,skills.map(s=>s.id),'direct-event',{occurredAt:at.toISOString(),itemDifficulty:0});
  await service.recordAndSync(user.id,question.id,true,skills.map(s=>s.id),'direct-event',{occurredAt:at.toISOString(),itemDifficulty:0});
  assert.equal(await db.trainedDas3hObservation.count(),1,'One response, not two micro-skill observations; replay is idempotent');
  assert.equal(await db.studentSkillHistory.count(),2,'Legacy micro-skills remain intact');
  assert.equal(await db.trainedDas3hState.count(),0,'Released d=0 does not add an unvalidated online learner intercept');
  assert.ok(await service.predictProbCorrect(user.id,question.id)>initial);
  const profile = await new MasteryService(db).getUserMasteryProfile(user.id);
  assert.equal(profile.model.mode,'trained-own-das3h');
  assert.ok(profile.skills.every(s=>s.scoreSource==='trained-own-question-average'));
  await db.masteryOutbox.create({data:{id:'queued-event',payload:{userId:user.id,questionId:question.id,isCorrect:false,skillIds:skills.map(s=>s.id),occurredAt:new Date(at.getTime()+1000).toISOString(),itemDifficulty:0}}});
  const outbox = new MasteryOutboxService(db,service);
  await outbox.flush();await outbox.flush();
  assert.equal(await db.trainedDas3hObservation.count(),2);
  assert.equal(await db.masteryOutbox.count({where:{processedAt:null}}),0);
  await db.question.update({where:{id:question.id},data:{optionA:'changed'}});
  assert.equal((await service.getTrainedSkillScores(user.id,skills.map(s=>s.id))).size,0,'Changed content uses fallback');
  delete process.env.DAS3H_MODEL_PATH;
  assert.equal(service.getModelStatus().mode,'legacy-heuristic');
  console.log('PASS: trained d0 predictions, profile, response deduplication, outbox/replay, content guard and rollback');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  if(db)await db.$disconnect();
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.$disconnect();
  try{unlinkSync(fixturePath)}catch{}
  if(originalPath===undefined)delete process.env.DAS3H_MODEL_PATH;else process.env.DAS3H_MODEL_PATH=originalPath;
});
