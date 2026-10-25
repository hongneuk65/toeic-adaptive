import { expect, test } from '@playwright/test';

const skills = [
  { skillId: 1, skillCode: 'P5_SUBJECT_VERB_AGREE', skillName: 'Hòa hợp chủ vị', part: 5, masteryScore: .5, practiceCount: 8, lastPracticed: '2026-10-01T00:00:00Z' },
  { skillId: 2, skillCode: 'P5_PARTS_OF_SPEECH', skillName: 'Từ loại', part: 5, masteryScore: .6, practiceCount: 0, lastPracticed: null },
];
const review = { ...skills[0], priority: 'review', score: .8, reasons: ['Đã đến mốc ôn gợi ý để kiểm tra lại kiến thức.'], reviewDueAt: '2026-10-04T00:00:00Z', lesson: { id: 17, title: 'Hòa hợp chủ vị', part: 5 }, foundations: [{ skillId: 2, skillName: 'Từ loại', status: 'unassessed' }] };

test('learning plan explains review, opens the selected skill and survives profile refresh', async ({ page }, testInfo) => {
  const requestedSkills: number[] = [];
  let answers = 0;
  let refreshed = false;
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'fixture@example.invalid' });
    if (path === '/mastery/me') {
      if (answers) refreshed = true;
      return json({ userId: 1, skills, overallMastery: .5, partBreakdown: [], topicGroups: [], learningPlan: { version: 'learning-plan-v1', generatedAt: '2026-10-22T00:00:00Z', items: answers ? [] : [review] } });
    }
    if (path === '/das3h/adaptive-question') {
      const id = Number(url.searchParams.get('skillId'));
      requestedSkills.push(id);
      return json({ selectedQuestion: { id: id + 100, part: 5, content: 'Please choose the correct word.', optionA: 'is', optionB: 'are', optionC: 'be', optionD: 'being' }, predictedProb: .75, targetProb: .75, evaluatedCandidatesCount: 10, isExploration: false });
    }
    if (path === '/das3h/answer-adaptive') {
      expect(route.request().postDataJSON().skillId).toBe(1);
      answers++;
      return json({ isCorrect: true, correctAnswer: 'A', explanation: 'The singular subject takes is.' });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/recommendations');
  const card = page.locator('.learning-plan-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Đến lượt ôn lại');
  await expect(card).toContainText(review.reasons[0]);
  await expect(card.locator('time')).toHaveText('04/10/2026');
  await expect(card.getByRole('link', { name: 'Học kiến thức →' })).toHaveAttribute('href', '/theory?lesson=17');
  await page.screenshot({ path: testInfo.outputPath('learning-plan.png'), fullPage: true });
  await card.getByRole('button', { name: 'Luyện nền tảng Từ loại' }).click();
  const dialog = page.getByRole('dialog', { name: 'Luyện kỹ năng', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Từ loại (Part 5)' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await card.getByRole('button', { name: 'Luyện Hòa hợp chủ vị', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Hòa hợp chủ vị (Part 5)' })).toBeVisible();
  await dialog.getByRole('button', { name: 'A. is', exact: true }).click();
  await dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await expect(dialog.getByText('Đã lưu kết quả luyện tập.')).toBeVisible();
  await expect.poll(() => refreshed).toBe(true);
  await expect(dialog.getByRole('heading', { name: 'Hòa hợp chủ vị (Part 5)' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true })).toBeVisible();
  expect(requestedSkills.filter((id, index) => !index || id !== requestedSkills[index - 1])).toEqual([2, 1]);
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByText('Chưa có kỹ năng sẵn sàng để gợi ý')).toBeVisible();
  await expect(page.locator('.learning-plan-card')).toHaveCount(0);
  expect(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
});

test('explicit empty learning plan does not replace it with legacy topic priorities', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'fixture@example.invalid' } });
    if (path === '/mastery/me') return route.fulfill({ json: { userId: 1, skills, overallMastery: .5, partBreakdown: [], topicGroups: [{ id: 'word-forms', title: 'Từ loại', parts: [5], skillIds: [2], observedSkillCount: 0, totalSkillCount: 1, estimatedSuccess: null, evidenceStatus: 'unassessed', priority: 'diagnostic', recommendedSkillId: 2, lesson: null }], learningPlan: { version: 'learning-plan-v1', generatedAt: '2026-10-22T00:00:00Z', items: [] } } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/recommendations');
  await expect(page.getByText('Chưa có kỹ năng sẵn sàng để gợi ý')).toBeVisible();
  await expect(page.locator('.topic-card')).toHaveCount(0);
  await page.locator('.topic-browse > summary').click();
  await expect(page.locator('.topic-library-item')).toContainText('Từ loại');
});
