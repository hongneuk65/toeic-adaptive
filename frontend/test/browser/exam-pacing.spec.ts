import { test, expect } from '@playwright/test';

test('measured response rest survives reload and unlocks Reading only after its deadline', async ({page}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem('accessToken','fixture');
    const key='exam-listening:77:audio:part-3-question-1';
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key,JSON.stringify({position:30,completed:false,audioEnded:true}));
  });
  const questions = [1,2,3].map(id=>({id,part:3,audioUrl:'/fixture-audio.mp3',content:`Listening question ${id}`,optionA:'One',optionB:'Two',optionC:'Three',optionD:'Four',stimulus:{version:1,groupId:'conversation',questionPosition:id,documents:[]}}));
  await page.route('**/api/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname.endsWith('/auth/me')) return route.fulfill({json:{id:1,role:'USER'}});
    if(pathname.endsWith('/exam/77')) return route.fulfill({json:{attemptId:77,examType:'FULL',startedAt:new Date().toISOString(),deadlineAt:new Date(Date.now()+3600000).toISOString(),totalQuestions:4,questions:[...questions,{id:4,part:5,content:'Reading question',optionA:'One',optionB:'Two',optionC:'Three',optionD:'Four'}],listeningPlan:{pacingVersion:'part-response-v1',targetSeconds:52.875,audioSeconds:30,restSeconds:22.875,groups:[{firstQuestionId:1,audioSeconds:30,restSeconds:22.875,questionCount:3}]}}});
    return route.fulfill({json:[]});
  });
  await page.goto('/exam/77');
  await expect(page.getByText('Thời gian chọn đáp án',{exact:true})).toBeVisible();
  await expect(page.locator('.exam-audio-rest-count')).toContainText('23');
  await expect(page.locator('.exam-listening-status').last()).toContainText('00:53');
  const readDeadline=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('exam-listening:77:audio:part-3-question-1')!).restDeadlineMs);
  const deadline=await readDeadline();
  await page.clock.runFor(10000);
  await page.reload();
  await expect(page.getByText('Thời gian chọn đáp án',{exact:true})).toBeVisible();
  expect(await readDeadline()).toBe(deadline);
  await expect(page.getByText('Reading question',{exact:true})).toHaveCount(0);
  await page.clock.runFor(14000);
  await expect(page.getByText('Reading question',{exact:true})).toBeVisible();
});
