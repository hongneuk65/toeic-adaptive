// Build a deployment bridge without changing question labels or learner history.
require('reflect-metadata');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { questionFingerprint, validateModel, modelProbability } = require('../dist/das3h/trained-das3h');
const input = path.resolve(process.argv[2] || '../experiments/das3h-production/artifacts/own-20261019/model.json');
const output = path.resolve(process.argv[3] || 'models/das3h-own-v1.json');
const p = new PrismaClient();
(async () => {
  const model = JSON.parse(fs.readFileSync(input, 'utf8'));
  const rows = await p.question.findMany({ where: { explanation: { startsWith: '[santa-ednet:' } },
    select: { id:true, part:true, content:true, optionA:true, optionB:true, optionC:true, optionD:true, correctAnswer:true, explanation:true } });
  const bridge = {}, ambiguous = new Set(), byPart = {};
  let mismatches = 0;
  for (const q of rows) {
    const id = q.explanation.match(/^\[santa-ednet:(q\d+)\]/)?.[1];
    const trained = model.questions[id];
    if (!trained || trained.part !== q.part || trained.correctAnswer !== q.correctAnswer) { mismatches++; continue; }
    const fingerprint = questionFingerprint(q);
    if (bridge[id] && bridge[id] !== fingerprint) ambiguous.add(id);
    bridge[id] = fingerprint;
  }
  for (const id of ambiguous) delete bridge[id];
  for (const id of Object.keys(bridge)) byPart[model.questions[id].part] = (byPart[model.questions[id].part] || 0) + 1;
  if (!Object.keys(bridge).length) throw Error('No verified application questions; refusing activation');
  model.applicationBridge = bridge;
  model.applicationBridgeSummary = { questions: Object.keys(bridge).length, byPart, mismatches, ambiguous: ambiguous.size };
  validateModel(model);
  const fixtures = JSON.parse(fs.readFileSync(path.join(path.dirname(input),'parity-fixture.json'),'utf8'));
  let error = 0;
  for (const f of fixtures) error = Math.max(error, Math.abs(modelProbability(model,f.questionId,new Map(Object.entries(f.skillFeatures))) - f.expectedProbability));
  if (error > 1e-10) throw Error(`Python/TypeScript feature parity failed: ${error}`);
  // Historical micro-skill rows can duplicate one completed response. Backfill once per response.
  const eligibleRows = rows.filter(q => bridge[q.explanation.match(/^\[santa-ednet:(q\d+)\]/)?.[1]] === questionFingerprint(q));
  const sourceByAppId = new Map(eligibleRows.map(q=>[q.id,q.explanation.match(/^\[santa-ednet:(q\d+)\]/)[1]]));
  const historyRows = await p.studentSkillHistory.findMany({where:{questionId:{in:eligibleRows.map(q=>q.id)}},
    select:{userId:true,questionId:true,createdAt:true,isCorrect:true},distinct:['userId','questionId','createdAt']});
  const existing = await p.trainedDas3hObservation.findMany({where:{catalogHash:model.sourceHashes.catalog},select:{userId:true,sourceQuestionId:true,occurredAt:true}});
  const keys = new Set(existing.map(h=>`${h.userId}-${h.sourceQuestionId}-${h.occurredAt.getTime()}`));
  const history = historyRows.filter(h=>!keys.has(`${h.userId}-${sourceByAppId.get(h.questionId)}-${h.createdAt.getTime()}`));
  let backfilled = 0;
  for(let start=0;start<history.length;start+=1000){
    const result = await p.trainedDas3hObservation.createMany({data:history.slice(start,start+1000).map(h=>({
      id:`legacy-${h.userId}-${h.questionId}-${h.createdAt.getTime()}`,userId:h.userId,sourceQuestionId:sourceByAppId.get(h.questionId),
      catalogHash:model.sourceHashes.catalog,isCorrect:h.isCorrect,occurredAt:h.createdAt})),skipDuplicates:true});
    backfilled += result.count;
  }
  fs.mkdirSync(path.dirname(output),{recursive:true});
  if (fs.existsSync(output)) {
    const old = JSON.parse(fs.readFileSync(output,'utf8'));
    if (old.version !== model.version) fs.copyFileSync(output,path.join(path.dirname(output),`${old.version}.json`));
  }
  fs.writeFileSync(output+'.tmp',JSON.stringify(model)+'\n');
  fs.renameSync(output+'.tmp',output);
  console.log(JSON.stringify({version:model.version, ...model.applicationBridgeSummary, backfilledObservations:backfilled, parityMaxError:error, releaseGatePassed:model.releaseGatePassed, output}));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>p.$disconnect());
