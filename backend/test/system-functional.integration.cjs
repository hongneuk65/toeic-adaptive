require('../dist/config/environment');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { JwtService } = require('@nestjs/jwt');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
const base = process.env.SYSTEM_TEST_URL || 'http://127.0.0.1:3000';
const jwt = new JwtService({secret:process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp'});
const checked = [];
let testUser, testQuestion, testArticle;
async function request(token, route, method='GET', data) {
  const response = await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(20000)});
  const value=await response.json().catch(()=>null);
  return {status:response.status,value};
}
async function ok(token,route,method='GET',data) {
  const result=await request(token,route,method,data);
  assert.ok(result.status>=200&&result.status<300,`${method} ${route}: ${result.status} ${JSON.stringify(result.value)}`);
  checked.push(`${method} ${route.split('?')[0]}`);
  return result.value;
}
async function main() {
  const admin=await prisma.user.findFirst({where:{role:'ADMIN'},orderBy:{id:'asc'}});
  assert.ok(admin,'Need existing ADMIN; this test never changes user permissions');
  testUser=await prisma.user.create({data:{email:`system-functional-${randomUUID()}@example.invalid`,passwordHash:await bcrypt.hash(randomUUID(),4)}});
  const userToken=jwt.sign({sub:testUser.id},{expiresIn:'10m'}), adminToken=jwt.sign({sub:admin.id},{expiresIn:'10m'});
  assert.equal((await request(null,'/admin/overview')).status,401);
  assert.equal((await request(userToken,'/admin/overview')).status,403);
  for(const route of ['/admin/overview','/admin/users','/admin/questions?part=2&source=CRAWL','/admin/skills/catalog','/admin/theory','/admin/exams','/admin/flashcards','/admin/knowledge','/admin/reading-articles','/admin/listening-sources','/admin/reading-reports','/admin/listening-reports','/admin/ai-events','/reading/admin','/listening/admin']) {
    const result=await ok(adminToken,route);
    assert.ok(!JSON.stringify(result).includes('passwordHash'),'Admin response must not expose password hashes');
  }
  const skills=await ok(adminToken,'/admin/skills');
  const skill=skills.find(s=>s.part===2);
  testQuestion=await ok(adminToken,'/admin/questions','POST',{part:2,content:`Disposable QA ${randomUUID()}`,optionA:'First',optionB:'Second',optionC:'Third',optionD:'',correctAnswer:'A',explanation:'Disposable test only.',difficulty:'MEDIUM',skillIds:[skill.id]});
  assert.equal(testQuestion.optionD,'');
  const changed=await ok(adminToken,`/admin/questions/${testQuestion.id}`,'PATCH',{explanation:'Updated temporary test explanation.',optionD:''});
  assert.ok(changed.explanation.startsWith('[admin-question]'));
  assert.equal((await request(adminToken,`/admin/questions/${testQuestion.id}`,'PATCH',{correctAnswer:'D'})).status,400);
  assert.equal((await request(adminToken,`/admin/questions/${testQuestion.id}`,'PATCH',{content:null})).status,400);
  const crawl=await ok(adminToken,'/admin/questions?part=2&source=CRAWL&pageSize=5');
  assert.ok(crawl.items.every(q=>q.source==='CRAWL'));
  // Copy source content into an unpublished disposable article; originals stay untouched.
  const original = await prisma.readingVersion.findFirst({where:{origin:'CRAWL'},orderBy:{id:'asc'}});
  assert.ok(original);
  testArticle = await prisma.readingArticle.create({data:{key:`qa:${randomUUID()}`,title:'Disposable crawl edit QA',originalText:original.text,status:'DRAFT'}});
  const sourceVersion = await prisma.readingVersion.create({data:{articleId:testArticle.id,revision:1,title:testArticle.title,text:original.text,topic:original.topic,kind:original.kind,difficulty:original.difficulty,origin:'CRAWL',questions:original.questions}});
  await prisma.readingArticle.update({where:{id:testArticle.id},data:{currentVersionId:sourceVersion.id}});
  const draft = await ok(adminToken,`/reading/admin/articles/${testArticle.id}/versions`,'POST',{title:testArticle.title,text:original.text,topic:original.topic,kind:original.kind,difficulty:original.difficulty,questions:original.questions});
  assert.equal(draft.version.origin,'CRAWL');
  const reviewed = await ok(adminToken,`/reading/admin/articles/${testArticle.id}/review`,'POST',{versionId:draft.version.id});
  assert.equal(reviewed.reviewed,true);
  const folders=await ok(userToken,'/flashcards/folders');
  assert.ok(folders.reduce((sum,f)=>sum+f.count,0)>=854);
  assert.equal((await request(userToken,'/flashcards/folders','POST',{name:'   '})).status,400);
  const folder=await ok(userToken,'/flashcards/folders','POST',{name:'Disposable functional QA'});
  assert.equal((await request(userToken,`/flashcards/folders/${folder.id}/cards`,'POST',{})).status,400);
  await ok(userToken,`/flashcards/folders/${folder.id}/cards`,'POST',{word:'invoice',meaning:'hóa đơn'});
  const cards=await ok(userToken,`/flashcards/folders/${folder.id}/cards`);
  await ok(userToken,`/flashcards/cards/${cards[0].id}/review`,'PATCH',{known:true});
  assert.equal((await ok(userToken,`/flashcards/folders/${folder.id}/reviews`))[0].known,true);
  const first=await ok(userToken,'/listening?page=1&pageSize=24&search=Santa&kind=AUDIO');
  const second=await ok(userToken,'/listening?page=2&pageSize=24&search=Santa&kind=AUDIO');
  assert.ok(first.pagination.total>100);
  assert.equal(first.sources.length,24);
  assert.ok(second.sources.every(s=>!first.sources.some(f=>f.id===s.id)));
  assert.equal((await request(userToken,'/listening?page=0')).status,400);
  const status=await ok(userToken,`/listening/sources/${first.sources[0].id}`);
  assert.ok(status.practiceQuestions.length);
  const catalog=await ok(userToken,'/reading');
  const book=catalog.articles.find(a=>a.version?.origin==='CRAWL');
  assert.ok(book);
  const attempt=await ok(userToken,`/reading/articles/${book.id}/start`,'POST');
  assert.ok(attempt.version.questions.every(q=>q.answer===undefined&&q.explanation===undefined));
  if(attempt.version.questions[0].type!=='MAIN') await ok(userToken,`/reading/attempts/${attempt.id}`,'PATCH',{currentIndex:1,answers:{},elapsedSeconds:1});
  const answers=Object.fromEntries(attempt.version.questions.map((_,i)=>[i,{selected:0,evidence:[]}]));
  const submitted=await ok(userToken,`/reading/attempts/${attempt.id}/submit`,'POST',{currentIndex:0,answers,elapsedSeconds:2});
  assert.ok(submitted.submittedAt);
  const exam=await ok(userToken,'/exam/start','POST',{examType:'PART_5'});
  assert.equal(exam.questions.length,30);
  assert.ok(exam.questions.every(q=>!q.content.includes('bulk testing')&&q.correctAnswer===undefined));
  const profile=await ok(userToken,'/mastery/me');
  assert.ok(profile);
  const theory=await ok(userToken,'/theory/part/5');
  if(theory.length) await ok(userToken,`/theory/${theory[0].id}/quiz`);
  console.log(JSON.stringify({passed:true,requests:checked.length,authorizationChecks:true,adminCrud:true,sourceFilter:true,listeningPages:true,readingSubmit:true,flashcards:true,realExam:true,checked},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  // Only records created by this test are disposable. Never remove existing content or learner history.
  if(testQuestion) await prisma.question.delete({where:{id:testQuestion.id}});
  if(testUser) await prisma.user.delete({where:{id:testUser.id}});
  if(testArticle) await prisma.readingArticle.delete({where:{id:testArticle.id}});
  await prisma.$disconnect();
});
