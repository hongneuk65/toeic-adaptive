import { expect, test } from '@playwright/test';
test('signed-in home keeps its introduction compact and progress close', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const json=(value:unknown)=>route.fulfill({json:value});
    if(path.endsWith('/auth/me'))return json({id:1,email:'compact@example.invalid',role:'USER'});
    if(path.endsWith('/auth/learning-status'))return json({hasLearningActivity:false,onboardingChoice:'SELF_STUDY',onboardingRequired:false});
    if(path.endsWith('/reading'))return json({articles:[],attempts:[]});
    if(path.endsWith('/listening'))return json({sources:[],sessions:[]});
    if(path.endsWith('/mastery/me'))return json({skills:[]});
    return json({enabled:false});
  });
  await page.goto('/dashboard');
  await expect(page.locator('.prep-home-hero-cta')).toHaveText('Bắt đầu học');
  await expect(page.locator('.home-study-group')).toHaveCount(2);
  await expect(page.locator('.home-study-group').first().getByRole('link')).toHaveCount(3);
  await expect(page.locator('.home-study-group').last().getByRole('link')).toHaveCount(2);
  await expect(page.locator('.home-studio-panel')).toHaveAttribute('aria-busy','false');
  const hero=await page.locator('.prep-home-hero').boundingBox();
  if(testInfo.project.name === 'mobile') expect((await page.locator('.home-studio-welcome').boundingBox())!.height).toBeLessThan(250);
  else expect(hero!.height).toBeLessThanOrEqual(440);
  const progress=await page.getByRole('heading',{name:'Hôm nay, mình học gì?',exact:true}).boundingBox();
  expect(progress!.y).toBeLessThan(550);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('heading', {name:'Công nghệ hỗ trợ.',exact:false})).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('compact-home.png'),fullPage:false});
});


test('home keeps real resume links and all learning paths available at narrow widths', async ({page},info) => {
 await page.addInitScript(()=>localStorage.setItem('accessToken','home-fixture'));
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/me'))return route.fulfill({json:{id:1,role:'USER',email:'home@example.invalid'}});
  if(path.endsWith('/auth/learning-status'))return route.fulfill({json:{hasLearningActivity:true,onboardingRequired:false,onboardingChoice:'SELF_STUDY'}});
  if(path.endsWith('/reading'))return route.fulfill({json:{articles:[{title:'Bài đọc văn phòng',version:{id:1}},{title:'Bài đọc du lịch',version:{id:2}}],attempts:[{id:11,versionId:1,currentIndex:1},{id:12,versionId:2,currentIndex:0}]}});
  if(path.endsWith('/listening'))return route.fulfill({json:{sources:[],sessions:[{id:21,source:{title:'Nghe văn phòng'},start:0,end:60},{id:22,source:{title:'Nghe du lịch'},start:0,end:60}]}});
  if(path.endsWith('/mastery/me'))return route.fulfill({json:{skills:[{skillId:1,skillName:'Giới từ',part:5,masteryScore:.4,practiceCount:4}]}});
  return route.fulfill({json:{enabled:false}});
 });
 await page.goto('/dashboard');
 await expect(page.locator('.prep-home-hero-cta')).toHaveText('Học tiếp');
 const panel=page.getByRole('region',{name:'Hôm nay, mình học gì?',exact:true});
 await expect(panel.getByRole('link',{name:'Tiếp tục Bài đọc văn phòng',exact:true})).toHaveAttribute('href','/reading?attempt=11');
 await expect(panel.getByRole('link',{name:'Tiếp tục Nghe văn phòng',exact:true})).toBeHidden();
 await panel.getByText('2 bài đã lưu khác',{exact:true}).press('Enter');
 await expect(panel.getByRole('link',{name:'Tiếp tục Nghe văn phòng',exact:true})).toHaveAttribute('href','/listening?session=21');
 await panel.getByText('2 bài đã lưu khác',{exact:true}).press('Enter');
 await expect(panel).toContainText('Giới từ (Part 5)');
 for(const name of ['Reading','Listening','Kiến thức','Từ vựng','Thi thử']){
  const path=page.getByRole('link',{name:'Bắt đầu '+name,exact:true});await expect(path).toBeVisible();
  const box=await path.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0)+1);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('home-studio-returning.png'),fullPage:false});
 if(info.project.name==='desktop'){
  await page.setViewportSize({width:768,height:1024});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const header=await page.locator('.app-header').boundingBox();
  const panelBox=await panel.boundingBox();
  expect(panelBox!.y).toBeGreaterThanOrEqual(header!.y+header!.height+12);
  await page.screenshot({path:info.outputPath('home-studio-tablet.png'),fullPage:false});
 }
});
