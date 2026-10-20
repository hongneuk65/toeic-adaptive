require('../dist/config/environment');
const assert = require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const {JwtService}=require('@nestjs/jwt');
const prisma=new PrismaClient();
let user;
async function main(){
  user=await prisma.user.create({data:{email:`santa-qa-${randomUUID()}@example.invalid`,passwordHash:'disposable-test-no-login'}});
  const token=new JwtService({secret:process.env.JWT_SECRET||'jwt-secret-key-toeic-mvp'}).sign({sub:user.id},{expiresIn:'10m'});
  async function api(route,method='GET',data){
    const res=await fetch(`http://127.0.0.1:3000${route}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(20000)});
    const body=await res.json();assert.ok(res.ok,`${route}: ${res.status} ${JSON.stringify(body)}`);return body;
  }
  const folders=await api('/flashcards/folders');
  const topics=folders.filter(f=>f.name.startsWith('Santa ·'));
  // Check actual identities via DB; learner API stays focused on display fields.
  const owned=await prisma.flashcardFolder.findMany({where:{readingKey:{startsWith:'santa-vocabulary-topic-v1:'}},include:{_count:{select:{flashcards:true}}}});
  assert.equal(owned.length,19);assert.equal(owned.reduce((n,f)=>n+f._count.flashcards,0),854);
  const source=await prisma.listeningSource.findFirst({where:{ownerId:null,title:{startsWith:'Santa Part 2'}}});
  const status=await api(`/listening/sources/${source.id}?start=0&end=180`);
  assert.equal(status.transcript.status,'READY');
  let session=await api('/listening/sessions','POST',{sourceId:source.id,start:0,end:180});
  assert.ok(session.unit&&session.totalUnits>0);assert.ok(!session.unit.text);
  session=await api(`/listening/sessions/${session.id}`,'PATCH',{mode:'DICTATION'});
  const feedback=await api(`/listening/sessions/${session.id}/answers`,'POST',{unitId:session.unit.id,mode:'DICTATION',difficulty:session.difficulty,answer:'I heard this.'});
  assert.ok(feedback.expected.length>20);
  session=await api(`/listening/sessions/${session.id}`,'PATCH',{mode:'SPEAK'});
  const script=await api(`/listening/sessions/${session.id}/shadowing-script`);
  assert.equal(script.text,feedback.expected);
  const article=await prisma.readingArticle.findFirst({where:{key:{startsWith:'santa-reading:'}}});
  const attempt=await api(`/reading/articles/${article.id}/start`,'POST');
  assert.ok(attempt.version.stimulus?.documents.length);assert.ok(attempt.version.questions.every(q=>q.answer===undefined));
  if(process.argv.includes('--asr')){
    const talk=await prisma.listeningSource.findFirst({where:{ownerId:null,title:{startsWith:'Santa Part 3'}}});
    const started=await api(`/listening/sources/${talk.id}/transcript`,'POST',{start:0,end:180});
    console.log(JSON.stringify({asrRequested:talk.id,status:started.status}));
    let state;
    const deadline=Date.now()+240000;
    do{await new Promise(r=>setTimeout(r,2000));state=await api(`/listening/sources/${talk.id}?start=0&end=180`);if(state.transcript?.status==='FAILED')throw Error(state.transcript.error);}while(state.transcript?.status!=='READY'&&Date.now()<deadline);
    assert.equal(state.transcript?.status,'READY');
    const exercise=await api('/listening/sessions','POST',{sourceId:talk.id,start:0,end:180});
    assert.ok(exercise.totalUnits>0&&exercise.unit);console.log(JSON.stringify({asrReady:talk.id,units:exercise.totalUnits,provider:state.transcript.provider}));
  }
  console.log(JSON.stringify({passed:true,topicFolders:owned.length,topicCards:854,dictation:true,shadowing:true,readingDocuments:attempt.version.stimulus.documents.length,displayFolders:topics.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(user)await prisma.user.delete({where:{id:user.id}});await prisma.$disconnect();});
