import { test, expect } from '@playwright/test';
test('progress switches charts, filters and exposes counts without overflow', async ({ page }, info) => {
  const requests: string[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken','fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({json:{id:1,email:'fixture@example.invalid',role:'USER'}});
    if (url.pathname.endsWith('/mastery/me')) return route.fulfill({json:{userId:1,skills:[],topicGroups:[],partBreakdown:[],overallMastery:0}});
    if (url.pathname.endsWith('/mastery/progress')) {
      requests.push(url.search);
      const points=Array.from({length:7},(_,i)=>({date:`2026-11-0${i+1}`,attempts:i===2?0:10,newQuestions:i===2?0:5,newCorrect:Math.min(5,i+1),revisits:i===2?0:5,repeatedErrors:Math.max(0,5-i),corrected:Math.min(5,i)}));
      return route.fulfill({json:{days:7,points,truncated:false}});
    }
    return route.fulfill({json:[]});
  });
  await page.goto('/recommendations');
  const section=page.getByRole('region',{name:'Tiến bộ của bạn'});
  await expect(section.getByRole('img')).toBeVisible();
  await section.getByRole('button',{name:'Lỗi lặp lại',exact:true}).click();
  await expect(section.getByText('Cách đọc biểu đồ', { exact: true })).toBeVisible();
  await expect(section).toContainText('chưa chứng minh đã sửa lỗi trên câu mới');
  await section.getByRole('button',{name:'Số câu luyện',exact:true}).click();
  await expect(section).toContainText('60 lượt trả lời');
  await section.getByText('Lọc theo Part và độ khó', { exact: true }).click();
  await section.getByLabel('Phần thi').selectOption('5');
  await section.getByLabel('Độ khó').selectOption('EASY');
  await expect.poll(()=>requests.some(r=>r.includes('part=5')&&r.includes('difficulty=EASY'))).toBe(true);
  await section.getByText('Xem số liệu từng ngày', {exact:true}).click();
  await expect(section.getByRole('table')).toBeVisible();
  expect(await page.locator('body').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await section.screenshot({path:info.outputPath('learning-progress.png')});
  await section.getByRole('button',{name:'Tỷ lệ đúng',exact:true}).click();
  await expect(section.getByRole('img')).toBeVisible();
  await section.screenshot({path:info.outputPath('learning-progress-accuracy.png')});
});
test('progress failure stays local and can retry to an empty state',async({page})=>{
  let fail=true;
  await page.addInitScript(()=>localStorage.setItem('accessToken','fixture'));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/auth/me'))return route.fulfill({json:{id:1,role:'USER'}});
    if(path.endsWith('/mastery/me'))return route.fulfill({json:{skills:[],topicGroups:[]}});
    if(path.endsWith('/mastery/progress'))return fail?route.fulfill({status:503,json:{message:'Unavailable'}}):route.fulfill({json:{days:30,points:[],truncated:false}});
    return route.fulfill({json:[]});
  });
  await page.goto('/recommendations');
  const section=page.getByRole('region',{name:'Tiến bộ của bạn'});
  await expect(section.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Buổi học tiếp theo'})).toBeVisible();
  fail=false;await section.getByRole('button',{name:'Thử lại'}).click();
  await expect(section).toContainText('Chưa có kết quả trong khoảng này');
});
