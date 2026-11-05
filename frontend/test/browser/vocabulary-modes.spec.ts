import { expect, test, type Page } from '@playwright/test';
const cards = [{id:4,word:'bill',meaning:'hóa đơn'},{id:1,word:'invoice',meaning:'hóa đơn'},{id:2,word:'meeting',meaning:'cuộc họp'},{id:3,word:'contract',meaning:'hợp đồng'}];
async function fixture(page: Page, failFirst = false) {
 const attempts: Record<string,unknown>[]=[]; let feedbackCalls=0;
 await page.addInitScript(() => {
  localStorage.setItem('accessToken','mode-fixture');
  class Utterance { text:string; onstart?:()=>void; onend?:()=>void; constructor(text:string){this.text=text;} }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u:Utterance){queueMicrotask(()=>{u.onstart?.();u.onend?.();});}}});
 });
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{id:1,role:'USER',email:'fixture@example.invalid'}});
  if(path==='/api/auth/learning-status')return route.fulfill({json:{hasLearningActivity:true,onboardingRequired:false,onboardingChoice:'SELF_STUDY'}});
  if(path==='/api/mastery/activities')return route.fulfill({json:{sections:{vocabulary:[{id:'v',title:'Bộ từ nên ôn',href:'/flashcards/1',reason:'Đến hạn',priority:'review'}],theory:[],reading:[],listening:[]}}});
  if(path==='/api/reading')return route.fulfill({json:{articles:[],attempts:[]}});
  if(path==='/api/listening')return route.fulfill({json:{sources:[],sessions:[]}});
  if(path==='/api/mastery/me')return route.fulfill({json:{skills:[],topicGroups:[]}});
  if(path==='/api/flashcards/folders')return route.fulfill({json:[{id:1,name:'Office vocabulary',count:3,isOwner:true,authorName:'You',code:'OFFICE'}]});
  if(path==='/api/flashcards/folders/1')return route.fulfill({json:{id:1,name:'Office vocabulary',count:3,isOwner:true}});
  if(path==='/api/flashcards/folders/1/cards')return route.fulfill({json:cards});
  if(path==='/api/flashcards/folders/1/reviews')return route.fulfill({json:[{cardId:4,known:false,dueAt:new Date(Date.now()+31000).toISOString()}]});
  if(path==='/api/flashcards/cards/1/practice'){
   const body=route.request().postDataJSON();attempts.push(body);
   if(failFirst&&attempts.length===1)return route.abort();
   return route.fulfill({json:{...body,cardId:1,correct:body.response==='invoice',correctAnswer:'invoice',meaning:'hóa đơn',recordedAt:new Date().toISOString(),schedulingUpdated:false}});
  }
  if(path==='/api/vocabulary/practice-feedback'){
   feedbackCalls++;
   if(feedbackCalls===1)return route.fulfill({status:503,json:{message:'AI góp ý hiện chưa khả dụng.'}});
   return route.fulfill({json:{feedback:'Bạn dùng invoice đúng ngữ cảnh.',correctedSentence:'Please send the invoice.',followUpQuestion:'When do you send an invoice?',generationStatus:'generated',pronunciationAssessed:false}});
  }
  return route.fulfill({status:404,json:{message:'Not in fixture'}});
 });
 return {attempts};
}

test('quiz retry preserves its attempt and study view has no recommendations',async({page})=>{
 await page.clock.install({time:new Date('2026-11-02T00:00:00Z')});
 const {attempts}=await fixture(page,true);
 await page.goto('/flashcards');
 await expect(page.getByRole('heading',{name:'Gợi ý học cho bạn',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Office vocabulary',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Gợi ý học cho bạn',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Trắc nghiệm',exact:true}).click();
 await expect(page.getByRole('radio',{name:'bill',exact:true})).toHaveCount(0);
 await page.getByRole('radio',{name:'invoice',exact:true}).check();
 await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
 await expect(page.getByRole('button',{name:'Thử lưu lại',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Nghe–gõ',exact:true})).toBeDisabled();
 await page.clock.fastForward(60000);
 await expect(page.getByRole('button',{name:'Thử lưu lại',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Thử lưu lại',exact:true}).click();
 await expect(page.getByText('Chính xác',{exact:true})).toBeVisible();
 expect(attempts).toHaveLength(2);expect(attempts[0]).toEqual(attempts[1]);
 expect(attempts[0]).toMatchObject({mode:'quiz',response:'invoice'});
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await expect(page.getByRole('button',{name:'Nghe–gõ',exact:true})).toBeEnabled();
});

test('dictation hides answer until server grading and speaking feedback stays text-only',async({page},info)=>{
 const {attempts}=await fixture(page);
 await page.goto('/flashcards/1');
 await page.getByRole('button',{name:'Nghe–gõ',exact:true}).click();
 await expect(page.getByText('invoice',{exact:true})).toHaveCount(0);
 await expect(page.getByText('hóa đơn',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Kiểm tra đáp án',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Nghe từ',exact:true}).click();
 await page.getByLabel('Từ bạn nghe được',{exact:true}).fill('invoice');
 await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
 await expect(page.getByText('Chính xác',{exact:true})).toBeVisible();
 expect(attempts[0]).toMatchObject({mode:'dictation',response:'invoice'});
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.getByRole('button',{name:'Luyện nói',exact:true}).click();
 await page.getByLabel('Câu bạn vừa nói',{exact:true}).fill('Please send invoice.');
 await page.getByRole('button',{name:'Nhận góp ý AI',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('chưa khả dụng');
 await expect(page.getByLabel('Câu bạn vừa nói')).toHaveValue('Please send invoice.');
 await page.getByRole('button',{name:'Nhận góp ý AI',exact:true}).click();
 await expect(page.getByText('Bạn dùng invoice đúng ngữ cảnh.',{exact:true})).toBeVisible();
 await expect(page.getByText(/không chấm phát âm/).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('vocabulary-speaking.png'),fullPage:false});
});

test('site nature background pauses, persists and honors reduced motion across pages',async({page},info)=>{
 await fixture(page);
 await page.goto('/flashcards');
 const backdrop=page.locator('.ambient-background');
 await expect(backdrop).toHaveAttribute('aria-hidden','true');
 await expect(backdrop).toHaveAttribute('data-paused','false');
 await page.getByRole('button',{name:'Tạm dừng nền',exact:true}).click();
 await expect(backdrop).toHaveAttribute('data-paused','true');
 await page.reload();
 await expect(page.getByRole('button',{name:'Bật chuyển động nền',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Bật chuyển động nền',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(backdrop).toHaveAttribute('data-paused','true');
 await expect(page.getByRole('button',{name:'Chuyển động nền đang tắt theo cài đặt thiết bị'})).toBeDisabled();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/placement');
 await expect(backdrop).toHaveAttribute('data-paused','true');
 await expect(page.getByRole('button',{name:'Tạm dừng nền',exact:true})).toHaveCount(0);
 await page.goto('/dashboard');
 await expect(page.locator('.nature-app')).toBeVisible();
 await expect(page.locator('.home-space-props')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('nature-dashboard.png'),fullPage:false});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('study session keeps wrong answer feedback until explicitly continued',async({page})=>{
 await fixture(page);
 await page.goto('/flashcards/1');
 await page.getByText('Tùy chọn học',{exact:true}).click();
 await page.getByRole('button',{name:'Bắt đầu buổi ôn',exact:true}).click();
 await page.getByRole('button',{name:'Trắc nghiệm',exact:true}).click();
 await page.getByRole('radio',{name:'meeting',exact:true}).check();
 await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
 await expect(page.getByText('Cần luyện thêm',{exact:true})).toBeVisible();
 await expect(page.getByText('invoice',{exact:true}).last()).toBeVisible();
 await expect(page.getByRole('heading',{name:'hóa đơn',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await expect(page.getByRole('heading',{name:'cuộc họp',exact:true})).toBeVisible();
});


test('typed recall keeps feedback until continued and protects an unsaved attempt', async ({page}) => {
 await fixture(page);
 let saved = false;
 await page.route('**/api/flashcards/folders/1/reviews', route => route.fulfill({json: saved ? [{cardId:1,known:true,dueAt:new Date(Date.now()+86400000).toISOString()},{cardId:4,known:false,dueAt:new Date(Date.now()+86400000).toISOString()}] : [{cardId:4,known:false,dueAt:new Date(Date.now()+86400000).toISOString()}]}));
 await page.route('**/api/flashcards/cards/1/review', route => { saved=true;return route.fulfill({json:{cardId:1,known:true,reviewCount:1,dueAt:new Date(Date.now()+86400000).toISOString()}}); });
 await page.goto('/flashcards/1');
 await page.getByLabel('Câu trả lời của bạn',{exact:true}).fill('invoice');
 await page.getByRole('button',{name:'Kiểm tra đáp án',exact:true}).click();
 await expect(page.getByRole('button',{name:'Trắc nghiệm',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Thẻ tiếp',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Lưu lượt ôn',exact:true}).click();
 await expect(page.getByRole('region', {name:'Luyện nhớ chủ động'}).locator('p.text-2xl')).toHaveText('invoice');
 await expect(page.getByRole('button',{name:'Đã lưu lượt ôn',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await expect(page.getByRole('heading',{name:'cuộc họp',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Trắc nghiệm',exact:true})).toBeEnabled();
});

test('vocabulary studio keeps its controls inside narrow light and dark screens', async ({page},info) => {
 await fixture(page);
 if(info.project.name==='mobile') await page.setViewportSize({width:360,height:800});
 await page.goto('/flashcards/1');
 await expect(page.getByLabel('Câu trả lời của bạn',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('vocabulary-studio-light.png'),fullPage:false});
 await page.getByRole('button',{name:'Bật giao diện tối',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('vocabulary-studio-dark.png'),fullPage:false});
});
