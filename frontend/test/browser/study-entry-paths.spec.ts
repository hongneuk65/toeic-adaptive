import { test, expect, type Page } from '@playwright/test';
async function fixture(page: Page, failed = false) {
 const source={id:9,title:'Office audio',kind:'AUDIO',url:'/fixture.mp3',ownerId:null,videoId:null,published:true}; const settings={defaultSegmentSeconds:180,maxSegmentSeconds:300,maxRecordingSeconds:60};
 await page.addInitScript(()=>localStorage.setItem('accessToken','fixture'));
 await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname.replace(/^\/api/,'');const json=(body:unknown,status=200)=>route.fulfill({json:body,status});
 if(path==='/auth/me')return json({id:1,email:'fixture@example.invalid',role:'USER'});if(path==='/auth/google/config')return json({enabled:false});
 if(path==='/mastery/activities')return json({generatedAt:'2026-10-24',sections:{reading:[],listening:[],theory:[],vocabulary:[]}});
 if(path==='/theory/catalog')return json([]);if(path==='/theory/1')return json({id:1,title:'Grammar lesson',part:5,content:'Grammar content',skill:{code:'GRAMMAR',name:'Grammar'}});
 if(path==='/reading')return json({articles:[{id:1,title:'Office notice',text:'The office opens at nine.',ownerId:null,status:'READY',version:{id:1,title:'Office notice',kind:'NOTICE',difficulty:'EASY',topic:'Workplace'}}],attempts:[],limits:{maxText:10000,maxQuestions:5,generations:5,tutorCalls:10}});
 if(path==='/reading/personal')return json(failed?{message:'Không thể tạo bài'}:{id:3},failed?503:200);
 if(path==='/reading/articles/3')return json({id:3,title:'My passage',text:'A personal passage',ownerId:1,status:'CREATING',generationAttempts:1});
 if(path==='/reading/attempts/1')return json({id:1,currentIndex:0,answers:{},submittedAt:null,elapsedSeconds:0,version:{id:1,articleId:1,title:'Office notice',text:'The office opens at nine.',kind:'NOTICE',difficulty:'EASY',questions:[{type:'DETAIL',prompt:'When does the office open?',options:['Nine','Ten'],evidenceRequired:false}]}});
 if(path==='/listening')return json({sources:[source],sessions:[],settings,asrAvailable:false});if(path==='/listening/sources')return json(failed?{message:'Không thể thêm video'}:{...source,id:10,title:'YouTube cá nhân',kind:'YOUTUBE',videoId:'abcdef12345',url:'https://www.youtube.com/watch?v=abcdef12345',ownerId:1},failed?503:200);
 if(path==='/listening/sources/9')return json({source,transcript:null}); if(path==='/listening/sources/10')return json({source:{...source,id:10,title:'YouTube cá nhân',kind:'YOUTUBE',videoId:'abcdef12345',url:'https://www.youtube.com/watch?v=abcdef12345',ownerId:1},transcript:null});
 if(path==='/listening/sessions/7')return json({id:7,sourceId:9,source,start:0,end:180,currentIndex:0,totalUnits:1,unit:{id:1,start:0,end:10,wordCount:3},mode:'DICTATION',difficulty:'EASY',settings});return json({});});
}
async function recommendationsBeforeChoice(page: Page, name: string) {
 const choice = page.getByRole('button', { name });
 await expect(choice).toBeVisible();
 const suggestions = page.getByRole('heading', { name: 'Gợi ý học cho bạn', exact: true });
 await expect(suggestions).toBeVisible();
 expect(await suggestions.evaluate((heading, label) => {
  const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes(label));
  return !!button && Boolean(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
 }, name)).toBe(true);
}

test('knowledge name keeps existing route and lesson deep link',async({page})=>{await fixture(page);await page.goto('/theory?lesson=1');await expect(page.getByRole('heading',{name:'Kiến thức TOEIC',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Grammar lesson',exact:true})).toBeVisible();await expect(page).toHaveURL(/\/theory\?lesson=1$/);});
test('reading recommendations precede equally sized primary paths with clause entry both directions',async({page},info)=>{await fixture(page);await page.goto('/reading');await recommendationsBeforeChoice(page,'Đọc hiểu');await recommendationsBeforeChoice(page,'Tìm mệnh đề chính');const [reading,clauses]=await Promise.all([page.getByRole('button',{name:'Đọc hiểu'}).boundingBox(),page.getByRole('button',{name:'Tìm mệnh đề chính'}).boundingBox()]);expect(Math.abs(reading!.width-clauses!.width)).toBeLessThanOrEqual(1);expect(Math.abs(reading!.height-clauses!.height)).toBeLessThanOrEqual(1);await page.screenshot({path:info.outputPath('reading-entry.png'),fullPage:false});await page.getByRole('button',{name:'Tìm mệnh đề chính'}).click();await expect(page).toHaveURL(/practice=clauses/);await expect(page.getByRole('heading',{name:'Tìm mệnh đề chính',exact:true})).toBeVisible();await page.getByRole('button',{name:'Đọc hiểu'}).click();await expect(page.getByRole('heading',{name:'Luyện đọc',exact:true})).toBeVisible();});
test('reading personal form opens at top and keeps draft across mode changes',async({page})=>{await fixture(page);await page.goto('/reading');const personal=page.getByRole('button',{name:'Tạo bài từ văn bản của bạn'});await personal.click();const title=page.getByRole('textbox',{name:'Tên bài Reading cá nhân'});await expect(title).toBeFocused();await title.fill('My text');await page.getByRole('textbox',{name:'Văn bản Reading cá nhân'}).fill('The office opens at nine. '.repeat(10));await page.getByRole('button',{name:'Đọc hiểu'}).click();await expect(title).toBeHidden();await personal.click();await expect(title).toHaveValue('My text');await page.getByRole('button',{name:'Đóng',exact:true}).click();await expect(personal).toBeFocused();});
test('reading active attempt not replaced by discovery query',async({page})=>{await fixture(page);await page.goto('/reading?attempt=1&practice=clauses');await expect(page.getByText('When does the office open?',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Đọc hiểu'})).toHaveCount(0);});
test('listening entry paths visible and personal focus returns on close',async({page},info)=>{await fixture(page);await page.goto('/listening');await recommendationsBeforeChoice(page,'Bài nghe có sẵn');await recommendationsBeforeChoice(page,'Thêm video của bạn');await page.screenshot({path:info.outputPath('listening-entry.png'),fullPage:false});const trigger=page.getByRole('button',{name:'Thêm video của bạn'});await trigger.click();await expect(page.getByRole('textbox',{name:'Link YouTube'})).toBeFocused();await page.getByRole('button',{name:'Đóng',exact:true}).click();await expect(trigger).toBeFocused();});
test('listening failed import keeps URL and existing payload',async({page})=>{await fixture(page,true);await page.goto('/listening');await page.getByRole('button',{name:'Thêm video của bạn'}).click();const input=page.getByRole('textbox',{name:'Link YouTube'});await input.fill('https://www.youtube.com/watch?v=abcdef12345');const request=page.waitForRequest(r=>r.url().endsWith('/listening/sources')&&r.method()==='POST');await page.getByRole('button',{name:'Thêm video',exact:true}).click();expect((await request).postDataJSON()).toEqual({title:'YouTube cá nhân',kind:'YOUTUBE',url:'https://www.youtube.com/watch?v=abcdef12345'});await expect(page.getByRole('alert')).toBeVisible();await expect(input).toHaveValue('https://www.youtube.com/watch?v=abcdef12345');});
test('listening library browsing and import preserve active unsaved answer',async({page})=>{await fixture(page);await page.goto('/listening?session=7');const answer=page.getByRole('textbox',{name:'Câu trả lời Listening'});await answer.fill('Unsaved listening answer');await page.getByRole('button',{name:'Thêm video của bạn'}).click();await expect(answer).toHaveValue('Unsaved listening answer');await page.getByRole('button',{name:'Bài nghe có sẵn'}).click();await expect(answer).toBeHidden();await page.getByRole('button',{name:'Tiếp tục bài đang luyện'}).click();await expect(answer).toHaveValue('Unsaved listening answer');await expect(page).toHaveURL(/session=7/);});


test('Reading and Listening use the same library scale and keep study pages focused', async ({page},info)=>{
 await fixture(page);
 const measures: {page:number;mode:number;card:number;height:number;title:number}[]=[];
 for(const path of ['reading','listening']){
  await page.goto('/'+path);
  const root=page.locator('.prep-learning-page');
  const card=root.locator('.prep-library-catalog .prep-learning-card').first();
  await expect(card).toBeVisible();
  const [rootBox,modeBox,cardBox]=await Promise.all([root.boundingBox(),root.locator('.study-mode-card').first().boundingBox(),card.boundingBox()]);
  measures.push({page:rootBox!.width,mode:modeBox!.width,card:cardBox!.width,height:cardBox!.height,title:(await root.locator('.page-header h1').boundingBox())!.height});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(path+'-aligned-library.png'),fullPage:false});
  if(info.project.name==='desktop'){
   await page.setViewportSize({width:768,height:1024});
   const heading=await root.locator('.page-header').boundingBox();expect(heading!.height).toBeLessThan(150);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath(path+'-aligned-tablet.png'),fullPage:false});
   await page.setViewportSize({width:1440,height:900});
  }
 }
 expect(Math.abs(measures[0].title-measures[1].title)).toBeLessThanOrEqual(1);
 expect(Math.abs(measures[0].page-measures[1].page)).toBeLessThanOrEqual(1);
 expect(Math.abs(measures[0].mode-measures[1].mode)).toBeLessThanOrEqual(1);
 expect(Math.abs(measures[0].card-measures[1].card)).toBeLessThanOrEqual(2);
 expect(Math.abs(measures[0].height-measures[1].height)).toBeLessThanOrEqual(48);
 for(const path of ['/reading?attempt=1','/listening?session=7','/reading?practice=clauses']){
  await page.goto(path);
  await expect(page.getByRole('heading',{name:'Gợi ý học cho bạn',exact:true})).toHaveCount(0);
  await expect(page.locator('.prep-learning-page')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(path.includes('session'))await expect(page.locator('aside[aria-label="Thư viện và đoạn nghe đã lưu"]')).toBeHidden();
  await page.screenshot({path:info.outputPath(path.includes('session')?'listening-aligned-study.png':path.includes('clauses')?'clauses-aligned-study.png':'reading-aligned-study.png'),fullPage:false});
 }
});


test('listening failed saved session can be retried without leaving the page', async ({page}) => {
 await fixture(page);
 let reads = 0; let unavailable = true;
 await page.route('**/api/listening/sessions/7', route => {
  reads++;
  if(unavailable) return route.fulfill({status:503,json:{message:'Phiên nghe tạm thời chưa tải được'}});
  return route.fulfill({json:{id:7,sourceId:9,source:{id:9,title:'Office audio',kind:'AUDIO',url:'/fixture.mp3',ownerId:null},start:0,end:180,currentIndex:0,totalUnits:1,unit:{id:1,start:0,end:10,wordCount:3},mode:'DICTATION',difficulty:'EASY',settings:{defaultSegmentSeconds:180,maxSegmentSeconds:300,maxRecordingSeconds:60}}});
 });
 await page.goto('/listening?session=7');
 await expect(page.getByRole('alert')).toContainText('Phiên nghe tạm thời chưa tải được');
 await expect(page.getByRole('button',{name:'Về thư viện bài nghe',exact:true})).toBeVisible();
 unavailable = false;
 await page.getByRole('button',{name:'Tải lại',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Câu trả lời Listening'})).toBeVisible();
 // The media fixture intentionally has no audio payload; its player may report
 // a separate media alert. This test verifies recovery of the session API.
 await expect(page.locator('.prep-learning-error')).toHaveCount(0);
 expect(reads).toBeGreaterThanOrEqual(2);
});

test('practice studio stays contained in dark mode across library and study', async ({page}, info) => {
 await fixture(page);
 await page.addInitScript(() => localStorage.setItem('toeic:color-theme','dark'));
 for (const [name,path] of [['reading-library','/reading'],['listening-library','/listening'],['reading-study','/reading?attempt=1'],['listening-study','/listening?session=7']]) {
  await page.goto(path);
  await expect(page.locator('.practice-studio')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Chưa mở được trang học',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(name+'-dark.png'),fullPage:false});
 }
});

test('learning motion respects live reduced motion and preserves the study answer', async ({page},info) => {
 await fixture(page);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/reading');
 const card=page.locator('.prep-library-catalog .prep-learning-card').first();
 await expect(card).toBeVisible();
 await expect(page.locator('#learning-main')).toHaveAttribute('data-learning-motion','full');
 await card.evaluate(async element=>{ await Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>undefined))); });
 if(info.project.name==='desktop') {
  await card.hover();
  await expect.poll(()=>card.evaluate(element=>getComputedStyle(element).transform)).not.toBe('none');
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('#learning-main')).toHaveAttribute('data-learning-motion','reduced');
 await expect.poll(()=>card.evaluate(element=>getComputedStyle(element).transform)).toBe('none');
 await page.goto('/listening?session=7');
 const answer=page.getByRole('textbox',{name:'Câu trả lời Listening'});
 await answer.fill('My current listening answer');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(answer).toHaveValue('My current listening answer');
 await page.getByRole('button',{name:'Thêm video của bạn'}).click();
 await expect(answer).toHaveValue('My current listening answer');
 await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await expect(answer).toHaveValue('My current listening answer');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('reading recovers an offline draft after reload and clears a recovered save error', async ({page}) => {
 await fixture(page);
 let offline=true; let writes=0;
 await page.route('**/api/reading/attempts/1',route=>{
  if(route.request().method()!=='PATCH') return route.fallback();
  writes++;
  return offline ? route.abort() : route.fulfill({json:{id:1}});
 });
 await page.goto('/reading?attempt=1');
 await page.getByRole('radio').first().check();
 await expect(page.getByRole('alert')).toContainText('Chưa lưu được tiến độ');
 await page.reload();
 await expect(page.getByRole('heading',{name:'Có bản nháp chưa lưu trong tab này'})).toBeVisible();
 const before=writes;
 await page.getByRole('button',{name:'Khôi phục bản nháp',exact:true}).click();
 await expect(page.getByRole('radio').first()).toBeChecked();
 await expect(page.getByRole('alert')).toContainText('Chưa lưu được tiến độ');
 offline=false;
 await page.getByRole('button',{name:'Thử lưu lại',exact:true}).click();
 await expect(page.getByText('Đã lưu tiến độ',{exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 expect(writes).toBeGreaterThan(before);
});

test('listening restores an unsent answer and retries the same request after a lost response', async ({page}) => {
 await fixture(page);
 const requests: Record<string,unknown>[]=[];
 await page.route('**/api/listening/sessions/7/answers',route=>{
  requests.push(route.request().postDataJSON());
  if(requests.length===1) return route.abort();
  return route.fulfill({json:{score:1,expected:'The office opens at nine.',blankAnswers:[],words:[],note:'Đã lưu kết quả.'}});
 });
 await page.goto('/listening?session=7');
 const answer=page.getByRole('textbox',{name:'Câu trả lời Listening'});
 await answer.fill('The office opens at nine.');
 await page.reload();
 await expect(answer).toHaveValue('The office opens at nine.');
 await page.getByRole('button',{name:'Kiểm tra câu trả lời',exact:true}).click();
 await expect(page.getByRole('button',{name:'Gửi lại câu trả lời',exact:true})).toBeVisible();
 await expect(answer).toBeDisabled();
 await page.reload();
 await expect(answer).toHaveValue('The office opens at nine.');
 await page.getByRole('button',{name:'Gửi lại câu trả lời',exact:true}).click();
 await expect(page.getByText('Đã lưu kết quả.',{exact:true})).toBeVisible();
 expect(requests).toHaveLength(2);
 expect(requests[0]).toEqual(requests[1]);
 expect(requests[0].requestId).toMatch(/^[0-9a-f-]{36}$/i);
});
