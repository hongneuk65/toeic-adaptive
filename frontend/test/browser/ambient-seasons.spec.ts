import { expect,test,type Page } from '@playwright/test';
async function setup(page:Page,weak=false){
 await page.addInitScript(({weak})=>{localStorage.setItem('accessToken','fixture');Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,get:()=>weak?2:8});Object.defineProperty(navigator,'deviceMemory',{configurable:true,get:()=>weak?2:8});}, {weak});
 await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;const json=(value:unknown)=>route.fulfill({json:value});if(path.endsWith('/auth/me'))return json({id:1,role:'USER'});if(path.endsWith('/auth/learning-status'))return json({hasLearningActivity:true,onboardingRequired:false});if(path.endsWith('/mastery/me'))return json({skills:[]});if(path.endsWith('/mastery/activities'))return json({sections:{theory:[],vocabulary:[],reading:[],listening:[]}});if(path.endsWith('/reading'))return json({articles:[],attempts:[],limits:{}});if(path.endsWith('/listening'))return json({sources:[],sessions:[],settings:{}});return json([]);});
}
test('seasons are automatic with no menu and the left branch moves gently',async({page},info)=>{
 await setup(page);await page.clock.install({time:new Date('2026-12-01T05:00:00Z')});
 await page.addInitScript(()=>{localStorage.setItem('toeic:ambient-season','summer');localStorage.setItem('toeic:ambient-paused','true');});
 await page.goto('/dashboard');
 await expect(page.locator('.ambient-settings')).toHaveCount(0);
 await expect(page.locator('.ambient-seasons')).toHaveAttribute('data-season','winter');
 await expect(page.locator('.ambient-season').first()).toHaveCSS('background-image',/garden-study-winter-v2.webp/);
 await expect(page.locator('.ambient-background')).toHaveAttribute('data-paused','false');
 await expect(page.locator('.ambient-left-branch')).toHaveCSS('animation-name','left-branch-breeze');
 expect(await page.locator('video,canvas').count()).toBe(0);
 expect(await page.locator('body').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('.ambient-left-branch')).toHaveCSS('animation-name','none');
 await page.screenshot({path:info.outputPath('winter-study.png'),fullPage:false});
});
test('auto seasons crossfade after image load and stop under reduced motion',async({page})=>{
 await setup(page);await page.clock.install();await page.goto('/dashboard');
 const initial=await page.locator('.ambient-seasons').getAttribute('data-season');
 await page.clock.runFor(109000);
 await expect(page.locator('.ambient-seasons')).toHaveAttribute('data-season',initial!);
 await expect(page.locator('.ambient-season-incoming')).toHaveCount(0);
 await page.clock.runFor(2000);
 await expect(page.locator('.ambient-season-incoming')).toHaveCount(1);
 await page.clock.runFor(10500);
 await expect(page.locator('.ambient-seasons')).not.toHaveAttribute('data-season',initial!);
 await expect(page.locator('.ambient-season')).toHaveCount(1);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('.ambient-background')).toHaveAttribute('data-paused','true');
 const stopped=await page.locator('.ambient-seasons').getAttribute('data-season');
 await page.clock.runFor(150000);
 await expect(page.locator('.ambient-seasons')).toHaveAttribute('data-season',stopped!);
});
test('low power devices keep the left branch and change seasons without a second scene',async({page})=>{
 await setup(page,true);await page.clock.install({time:new Date('2026-12-01T05:00:00Z')});await page.goto('/recommendations');
 await expect(page.locator('.ambient-seasons')).toHaveAttribute('data-lightweight','true');
 await expect(page.locator('.ambient-background')).toHaveAttribute('data-paused','false');
 await expect(page.locator('.ambient-canopy')).toHaveCount(0);
 await expect(page.locator('.ambient-left-branch')).toHaveCSS('animation-name','left-branch-breeze');
 await page.clock.fastForward(120001);
 await expect(page.locator('.ambient-seasons')).toHaveAttribute('data-season','spring');
 await expect(page.locator('.ambient-season')).toHaveCount(1);
});
