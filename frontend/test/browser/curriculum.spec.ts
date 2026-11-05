import { expect, test } from '@playwright/test';

const first = { id:'f01',title:'Câu cơ bản',minutes:35,objectives:['Nhận biết chủ ngữ và động từ'],prerequisites:[],unlocked:true,completed:false,bestScore:null,reviewStage:0,nextReviewAt:null };
const second = { ...first,id:'f02',title:'Câu hỏi cơ bản',unlocked:false,prerequisites:['f01'] };
const questions = Array.from({length:5},(_,i)=>({id:`c${i}`,kind:i===1?'reading':i===2?'listening':'knowledge',prompt:`Câu kiểm tra ${i+1}`,options:['Lựa chọn đúng','Lựa chọn khác']}));
const unit = {...first,trackId:'foundation',access:first,knowledge:'## Chủ ngữ và động từ\nMỗi câu có chủ ngữ và động từ chính.',examples:[{prompt:'Mina checks the list.',explanation:'Mina là chủ ngữ.'}],vocabulary:[{word:'desk',meaning:'bàn',example:'The desk is clean.'}],reading:'Mina works at the office.',listening:'The office opens at nine.',guided:[{...questions[0],id:'g1',answer:0,explanation:'Mina là chủ ngữ.'}],checkpoint:questions};
async function fixture(page: import('@playwright/test').Page, failFirst=false) {
 let enrolled=false, completed=false, submissions=0, selectedTrackId='foundation'; const ids:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('accessToken','curriculum-fixture'));
 await page.route('**/api/**', async route=>{
  const path=new URL(route.request().url()).pathname.replace(/^\/api/,'');
  const json=(value:unknown)=>route.fulfill({json:value});
  if(path==='/auth/me') return json({id:7,role:'USER',email:'curriculum@example.invalid'});
  if(path==='/auth/learning-status') return json({hasLearningActivity:completed,onboardingRequired:false,onboardingChoice:'SELF_STUDY'});
  if(path==='/curriculum/enroll') { const data=route.request().postDataJSON();expect(['foundation','toeic-650-800','toeic-800-plus']).toContain(data.trackId);expect(data.minutesPerDay).toBe(30);selectedTrackId=data.trackId;enrolled=true; }
  if(path==='/curriculum'||path==='/curriculum/enroll') return json({version:'curriculum-v1',tracks:[{id:'foundation',title:'Nền tảng',band:'Kiến thức khởi đầu',description:'Học kiến thức và luyện tập.',units:[{...first,completed}, {...second,unlocked:completed}]},{id:'toeic-250-450',title:'Cơ bản',band:'250–450',description:'Củng cố kiến thức và luyện nghe đọc.',units:[first]},{id:'toeic-450-650',title:'Phát triển',band:'450–650',description:'Đọc hiểu, diễn đạt tương đương và suy luận.',units:[first]},{id:'toeic-650-800',title:'Nâng cao',band:'650–800',description:'Nối thông tin và suy luận có bằng chứng.',units:[{...first,id:'c01',title:'Paraphrase và liên kết ý'}]},{id:'toeic-800-plus',title:'Chuyên sâu',band:'800–900+',description:'Sắc thái ý nghĩa và đối chiếu nhiều văn bản.',units:[{...first,id:'d01',title:'Ý định và mức độ cam kết'}]}],enrollment:enrolled?{trackId:selectedTrackId,minutesPerDay:30,startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:null,progress:{completed:Number(completed),total:2,reviewDue:0},daySummary:{date:'2026-11-02',budgetMinutes:30,completedMinutes:completed?35:0,remainingMinutes:completed?0:30},today:enrolled&&!completed?[{...first,reason:'new',trackId:'foundation'}]:[],researchSources:[{title:'IES',url:'https://ies.ed.gov/ncee/wwc/PracticeGuide/1'}]});
  if(path==='/curriculum/units/f01') return json(unit);
  if(path==='/curriculum/units/d01')return json({...unit,id:'d01',title:'Ý định và mức độ cam kết',trackId:'toeic-800-plus',access:{...first,id:'d01'}});
  if(path==='/curriculum/units/f01/submit') {
   const data=route.request().postDataJSON(); ids.push(data.requestId); submissions++;
   expect(data.answers).toEqual(Object.fromEntries(questions.map(q=>[q.id,0])));
   if(failFirst&&submissions===1)return route.fulfill({status:503,json:{message:'Chưa lưu được'}});
   completed=true; return json({attemptId:1,unitId:'f01',score:100,correct:5,total:5,passed:true,results:questions.map(q=>({questionId:q.id,selectedAnswer:0,correctAnswer:0,isCorrect:true,explanation:'Giải thích sau khi nộp.'})),progress:{...first,completed:true,nextReviewAt:'2026-11-03T12:00:00Z'}});
  }
  if(path==='/reading')return json({articles:[],attempts:[]});
  if(path==='/listening')return json({sources:[],sessions:[]});
  if(path==='/mastery/me')return json({skills:[]});
  return json({enabled:false});
 });
 return {ids};
}
test('learner enrolls, studies and completes a checkpoint with durable server progress',async({page},info)=>{
 await fixture(page);await page.goto('/curriculum');
 await expect(page.getByRole('heading',{name:'Lộ trình học',exact:true})).toBeVisible();
 await expect(page.getByRole('radio')).toHaveCount(5);
 await page.screenshot({path:info.outputPath('curriculum-tracks.png'),fullPage:false});
 await page.getByRole('button',{name:'Bắt đầu lộ trình',exact:true}).click();
 await expect(page.getByText('Chưa mở',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('curriculum-overview.png'),fullPage:false});
 await page.getByRole('link',{name:'Học Câu cơ bản',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sau bài này, bạn có thể'})).toBeVisible();
 await expect(page.getByText('Gợi ý học cho bạn',{exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('curriculum-lesson.png'),fullPage:false});
 await page.getByRole('button',{name:'2. Luyện có hướng dẫn',exact:true}).click();
 await page.getByRole('radio',{name:'Lựa chọn đúng',exact:true}).check();
 await page.getByRole('button',{name:'Xem giải thích',exact:true}).click();
 await expect(page.getByText('Đúng rồi.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'3. Tự kiểm tra',exact:true}).click();
 await expect(page.getByRole('button',{name:'Nộp bài kiểm tra',exact:true})).toBeDisabled();
 await page.getByRole('radio',{name:'Lựa chọn đúng',exact:true}).check();
 await page.getByRole('button',{name:'1. Học kiến thức',exact:true}).click();
 await page.getByRole('button',{name:'3. Tự kiểm tra',exact:true}).click();
 await expect(page.getByRole('radio',{name:'Lựa chọn đúng',exact:true})).toBeChecked();
 await expect(page.getByText('Giải thích sau khi nộp.',{exact:true})).toHaveCount(0);
 for(let i=0;i<5;i++){await page.getByRole('radio',{name:'Lựa chọn đúng',exact:true}).check();if(i<4)await page.getByRole('button',{name:'Câu tiếp',exact:true}).click();}
 await page.getByRole('button',{name:'Nộp bài kiểm tra',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Bạn đã đạt yêu cầu bài này',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Về lộ trình',exact:true}).last().click();
 await expect(page.getByRole('link',{name:'Học Câu hỏi cơ bản',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Đã hoàn thành kế hoạch hôm nay',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Bạn đã hoàn thành các bài trong chặng',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('failed submission preserves answers and reuses its idempotency key on retry',async({page})=>{
 const {ids}=await fixture(page,true);await page.goto('/curriculum?unit=f01');
 await page.getByRole('button',{name:'3. Tự kiểm tra',exact:true}).click();
 for(let i=0;i<5;i++){await page.getByRole('radio',{name:'Lựa chọn đúng',exact:true}).check();if(i<4)await page.getByRole('button',{name:'Câu tiếp',exact:true}).click();}
 await page.getByRole('button',{name:'Nộp bài kiểm tra',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Chưa lưu được');
 await expect(page.getByRole('radio',{name:'Lựa chọn đúng',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'Nộp bài kiểm tra',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Bạn đã đạt yêu cầu bài này',exact:true})).toBeVisible();
 expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);
});

test('home resumes the enrolled curriculum without fabricating a completed exercise',async({page})=>{
 await fixture(page);await page.goto('/curriculum');
 await page.getByRole('button',{name:'Bắt đầu lộ trình',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Hôm nay học gì?',exact:true})).toBeVisible();
 await page.goto('/dashboard');
 await expect(page.locator('.prep-home-hero-cta')).toHaveAttribute('href','/curriculum');
 await expect(page.getByRole('link',{name:'Tiếp tục Câu cơ bản',exact:true})).toHaveAttribute('href','/curriculum?unit=f01');
 await expect(page.getByRole('link',{name:'Học theo lộ trình',exact:true})).toHaveAttribute('href','/curriculum');
});

test('advanced 800+ track is discoverable, can be enrolled and opens its own material',async({page},info)=>{
 await fixture(page);await page.goto('/curriculum');
 await expect(page.getByRole('radio')).toHaveCount(5);
 await page.getByRole('radio',{name:/Chuyên sâu/}).check();
 await expect(page.getByText('Sắc thái ý nghĩa và đối chiếu nhiều văn bản.',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('advanced-track-choice.png'),fullPage:false});
 await page.getByRole('button',{name:'Bắt đầu lộ trình',exact:true}).click();
 await expect(page.getByRole('region',{name:'Tiến độ lộ trình'})).toContainText('Chuyên sâu');
 await page.getByRole('link',{name:'Học Ý định và mức độ cam kết',exact:true}).click();
 await expect(page).toHaveURL(/unit=d01/);
 await expect(page.getByRole('heading',{name:'Ý định và mức độ cam kết',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('long advanced reading can be collapsed without losing the selected answer',async({page})=>{
 await fixture(page);
 const longText=Array.from({length:180},(_,i)=>`detail${i}`).join(' ');
 await page.route('**/api/curriculum/units/d01',route=>route.fulfill({json:{...unit,id:'d01',title:'Ý định và mức độ cam kết',reading:longText,trackId:'toeic-800-plus',access:{...first,id:'d01'}}}));
 await page.goto('/curriculum?unit=d01');
 await page.getByRole('button',{name:'3. Tự kiểm tra',exact:true}).click();
 await page.getByRole('radio',{name:'Lựa chọn đúng',exact:true}).check();
 await page.getByRole('button',{name:'Câu tiếp',exact:true}).click();
 const passage=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Bài đọc'})});
 await expect(passage).toHaveAttribute('open','');
 await passage.locator('summary').click();
 await expect(passage).not.toHaveAttribute('open','');
 await page.getByRole('radio',{name:'Lựa chọn khác',exact:true}).check();
 await page.getByRole('button',{name:'Câu trước',exact:true}).click();
 await page.getByRole('button',{name:'Câu tiếp',exact:true}).click();
 await expect(page.getByRole('radio',{name:'Lựa chọn khác',exact:true})).toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
