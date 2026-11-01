import { expect, test } from '@playwright/test';
test('signed-in home keeps its introduction compact and progress close', async ({ page }) => {
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
  const hero=await page.locator('.prep-home-hero').boundingBox();
  expect(hero!.height).toBeLessThanOrEqual(440);
  const progress=await page.getByRole('heading',{name:'Hôm nay, mình học gì?',exact:true}).boundingBox();
  expect(progress!.y).toBeLessThan(550);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
