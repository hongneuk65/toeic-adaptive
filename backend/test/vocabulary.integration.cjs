require('../dist/config/environment');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const {JwtService}=require('@nestjs/jwt');
const db=new PrismaClient();let user,other;
async function main(){
  user=await db.user.create({data:{email:`vocab-qa-${randomUUID()}@example.invalid`,passwordHash:'disposable-no-login'}});
  other=await db.user.create({data:{email:`vocab-private-${randomUUID()}@example.invalid`,passwordHash:'disposable-no-login'}});
  const folder=await db.flashcardFolder.create({data:{userId:other.id,name:'Private QA',private:true}});
  const secret=`private${randomUUID().replaceAll('-','')}`;
  await db.flashcard.create({data:{userId:other.id,folderId:folder.id,word:secret,meaning:'Private meaning'}});
  const token=new JwtService({secret:process.env.JWT_SECRET||'jwt-secret-key-toeic-mvp'}).sign({sub:user.id},{expiresIn:'10m'});
  async function request(route,method='GET',data){const r=await fetch('http://127.0.0.1:3000'+route,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.json()};}
  for(const word of ['meticulous','unprecedented','reimburse']) {const r=await request('/vocabulary/lookup?word='+word);assert.equal(r.status,200);assert.equal(r.body.dictionaryAvailable,true);assert.equal(r.body.entries[0].source,'DICTIONARY');assert.ok(r.body.entries[0].meaning);}
  const ownExam=await db.examAttempt.create({data:{userId:user.id,examType:'CUSTOM',selectedParts:[6,7],questionIds:[]}});
  await db.examAttempt.create({data:{userId:other.id,examType:'FULL',questionIds:[]}});
  const h=await request('/history?type=EXAM&status=IN_PROGRESS&page=1');assert.equal(h.status,200);assert.equal(h.body.total,1);assert.equal(h.body.items[0].href,'/exam/'+ownExam.id);assert.ok(!('questionIds' in h.body.items[0]));
  await db.examAttempt.update({where:{id:ownExam.id},data:{submittedAt:new Date(),totalScore:123}});
  const completed=await request('/history?status=COMPLETED');assert.equal(completed.body.items[0].href,'/exam/'+ownExam.id+'/review');assert.equal((await request('/history?status=IN_PROGRESS')).body.total,0);
  assert.equal((await request('/history?page=0')).status,400);assert.equal((await request('/history?type=BAD')).status,400);
  const version=await db.readingVersion.findFirst({select:{id:true}});
  if(version){const a=await db.readingAttempt.create({data:{userId:user.id,versionId:version.id,tryNumber:1}});const history=await request('/history?type=READING');assert.equal(history.body.total,1);assert.equal(history.body.items[0].href,'/reading?attempt='+a.id);}
  const lookup=await request('/vocabulary/lookup?word=optional');assert.equal(lookup.status,200);assert.equal(lookup.body.found,true);assert.ok(lookup.body.entries[0].meaning);
  assert.equal((await request(`/vocabulary/lookup?word=${secret}`)).body.found,false);
  assert.equal((await request('/vocabulary/save','POST',{word:'invoice',meaning:'hóa đơn',folderId:folder.id})).status,403);
  const payload={word:' Invoice ',meaning:'hóa đơn',example:'Please pay the invoice.',source:'/exam/863/review'};
  const results=await Promise.all([request('/vocabulary/save','POST',payload),request('/vocabulary/save','POST',payload)]);
  assert.ok(results.every(r=>r.status===201),JSON.stringify(results));assert.equal(results[0].body.card.id,results[1].body.card.id);
  assert.equal(results.filter(r=>r.body.alreadySaved).length,1);
  const saved=results[0].body;
  assert.equal((await db.flashcard.count({where:{folderId:saved.folderId,userId:user.id}})),1);
  assert.equal(saved.card.example,payload.example);
  const own=await db.flashcardFolder.create({data:{userId:user.id,name:'My study',private:true}});
  assert.equal((await request('/vocabulary/save','POST',{...payload,folderId:own.id})).status,201);
  assert.equal((await request('/vocabulary/save','POST',{word:'invoice',meaning:' '})).status,400);
  console.log(JSON.stringify({passed:true,dictionary:true,history:true,lookup:true,privateIsolation:true,ownerFolder:true,concurrentDeduplication:true,contextSaved:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(user)await db.user.delete({where:{id:user.id}});if(other)await db.user.delete({where:{id:other.id}});await db.$disconnect();});
