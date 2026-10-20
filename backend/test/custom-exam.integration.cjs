require('../dist/config/environment');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const {JwtService}=require('@nestjs/jwt');
const prisma=new PrismaClient();let user;
async function main(){
  user=await prisma.user.create({data:{email:`custom-exam-qa-${randomUUID()}@example.invalid`,passwordHash:'disposable-no-login'}});
  const token=new JwtService({secret:process.env.JWT_SECRET||'jwt-secret-key-toeic-mvp'}).sign({sub:user.id},{expiresIn:'10m'});
  async function api(route,method='GET',data){const r=await fetch('http://127.0.0.1:3000'+route,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(20000)});const body=await r.json();assert.ok(r.ok,`${route}: ${r.status} ${JSON.stringify(body)}`);return body;}
  const counts=[6,25,39,30,30,16,54];
  for(const parts of [[1],[2],[3],[4],[5],[6],[7],[7,2,6],[1,2,3,4,5,6,7]]){
    const exam=await api('/exam/start','POST',{examType:'CUSTOM',parts});
    assert.deepEqual(exam.selectedParts,[...parts].sort((a,b)=>a-b));
    assert.equal(exam.questions.length,parts.reduce((n,p)=>n+counts[p-1],0));
    for(const p of parts)assert.equal(exam.questions.filter(q=>q.part===p).length,counts[p-1]);
    assert.ok(exam.questions.every(q=>parts.includes(q.part)&&q.correctAnswer===undefined));
    assert.deepEqual((await api(`/exam/${exam.attemptId}`)).questions.map(q=>q.id),exam.questions.map(q=>q.id));
    if(parts.some(p=>p<=4))assert.ok(exam.listeningPlan?.targetSeconds>=exam.listeningPlan.audioSeconds);
    const result=await api('/exam/submit','POST',{attemptId:exam.attemptId,answers:[]});
    assert.equal(result.totalScore,0);
    const review=await api(`/exam/${exam.attemptId}/review`);
    assert.equal(review.answers.length,exam.questions.length);
    assert.ok(review.answers.every(answer=>!/(?:\[santa-ednet:|Nguồn\/mapping:|Độ khó khởi tạo)/.test(answer.question.explanation||'')));
    console.log(JSON.stringify({parts:exam.selectedParts,count:exam.questions.length,submitted:true}));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(user)await prisma.user.delete({where:{id:user.id}});await prisma.$disconnect();});
