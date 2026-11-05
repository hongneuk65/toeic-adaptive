import { expect,test } from '@playwright/test';
async function signed(page:import('@playwright/test').Page){
 await page.addInitScript(()=>{localStorage.setItem('accessToken','theme-fixture');if(!sessionStorage.getItem('theme-test-init')){localStorage.setItem('toeic:color-theme','light');sessionStorage.setItem('theme-test-init','1');}});
 await page.route('**/api/**',route=>{const p=new URL(route.request().url()).pathname;const json=(v:unknown)=>route.fulfill({json:v});if(p.endsWith('/auth/me'))return json({id:1,role:'USER',email:'theme@example.invalid'});if(p.endsWith('/auth/learning-status'))return json({hasLearningActivity:false,onboardingRequired:false,onboardingChoice:'SELF_STUDY'});if(p.endsWith('/mastery/activities'))return json({sections:{reading:[],listening:[],theory:[],vocabulary:[]}});if(p.endsWith('/reading'))return json({articles:[],attempts:[],limits:{}});if(p.endsWith('/listening'))return json({sources:[],sessions:[],settings:{},asrAvailable:false});if(p.endsWith('/mastery/me'))return json({skills:[]});return json({enabled:false});});
}
test('theme toggles day/night, survives navigation and reload',async({page},info)=>{
 await signed(page);await page.goto('/dashboard');
 await page.getByRole('button',{name:'Bật giao diện tối',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(await page.locator('.ambient-background-photo').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('garden-study-night.webp');
 const panel=await page.locator('.home-studio-panel').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color}));expect(panel.bg).not.toBe('rgb(255, 254, 250)');
 const card=await page.locator('.home-studio-path>a').first().evaluate(e=>getComputedStyle(e).backgroundColor);expect(card).not.toBe('rgb(255, 254, 250)');expect(card).not.toBe('rgb(255, 255, 255)');
 await expect(page.locator('.home-studio-path>a').first()).toHaveCSS('background-color','rgba(27, 43, 58, 0.88)');
 await page.screenshot({path:info.outputPath('dark-home.png'),fullPage:false});
 await page.goto('/reading');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.getByRole('heading',{name:'Luyện đọc',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('dark-reading.png'),fullPage:false});
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'Bật giao diện sáng',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('system dark preference works before login and can be overridden',async({page},info)=>{
 await page.emulateMedia({colorScheme:'dark'});await page.goto('/login');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'Bật giao diện sáng',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.getByRole('button',{name:'Bật giao diện tối',exact:true}).click();
 await expect(page.locator('#login-email')).toHaveCSS('background-color','rgb(24, 39, 53)');
 await page.screenshot({path:info.outputPath('dark-login.png'),fullPage:false});
});


test('register keeps the login surface hierarchy in dark mode',async({page},info)=>{
 await page.emulateMedia({colorScheme:'dark'});
 await page.route('**/auth/google/config',route=>route.fulfill({json:{enabled:false}}));
 await page.goto('/register');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('.prep-auth-form')).toHaveCSS('background-color','rgba(27, 43, 58, 0.96)');
 await expect(page.locator('.form-input').first()).toHaveCSS('background-color','rgb(24, 39, 53)');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('dark-register.png'),fullPage:false});
});
