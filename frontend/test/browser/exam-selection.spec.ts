import { test, expect } from '@playwright/test';
test('exam catalog selection and unavailable modes', async ({ page }, info) => {
  let requestBody: unknown;
  await page.addInitScript(() => localStorage.setItem('accessToken','fixture'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({json:{id:1,email:'fixture@example.invalid',role:'USER'}});
    if (path.endsWith('/exam/catalog')) return route.fulfill({json:{source:'SANTA_EDNET',totalQuestions:700,byPart:Array.from({length:7},(_,i)=>({part:i+1,count:i===0?0:100})),modes:[{examType:'MINI',questionCount:100,available:true},{examType:'FULL',questionCount:200,available:false}]}});
    if (path.endsWith('/exam/start')) {requestBody=route.request().postDataJSON();return route.fulfill({status:503,json:{message:'Fixture start failed'}});}
    return route.fulfill({json:[]});
  });
  await page.goto('/exam?parts=2,3,3,9,bad');
  await expect(page.getByRole('checkbox',{name:/Part 2/})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:/Part 3/})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:/Part 1/})).toBeDisabled();
  await expect(page.getByRole('checkbox',{name:/Part 5/})).not.toBeChecked();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.locator('body').evaluate(el=>el.clientWidth));
  await page.screenshot({path:info.outputPath('exam-selection.png'),fullPage:true});
  await page.getByRole('button',{name:'Bắt đầu làm bài'}).click();
  await expect(page.getByRole('alert')).toContainText('Fixture start failed');
  expect(requestBody).toEqual({examType:'CUSTOM',parts:[2,3]});
  await page.getByRole('radio',{name:/Đề đầy đủ/}).check();
  await expect(page.getByRole('button',{name:'Bắt đầu làm bài'})).toBeDisabled();
  await page.getByRole('radio',{name:/Đề rút gọn/}).check();
  await expect(page.getByRole('button',{name:'Bắt đầu làm bài'})).toBeEnabled();
});
