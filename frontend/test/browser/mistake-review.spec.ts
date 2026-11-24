import { expect, test } from '@playwright/test';

const plan = {
  skills: [{ skillId: 1, skillName: 'Thì động từ', part: 5, masteryScore: .32, recentWrongRate: .5, dueCount: 5, reason: '5 câu cần ôn · sai 50% lượt gần đây · mức nắm vững 32%',
    questions: [{ questionId: 201, wrongCount: 2, attempts: 2, lastWrongAt: '2026-11-23T10:00:00.000Z', predictedProbability: .35 },
      { questionId: 202, wrongCount: 1, attempts: 1, lastWrongAt: '2026-11-22T10:00:00.000Z', predictedProbability: .45 }] }],
  openMistakes: 7, dueMistakes: 6, hiddenDueMistakes: 4,
};

async function fixture(page: import('@playwright/test').Page, review: unknown, log: { opened: number[]; answered: unknown[] }) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'fixture@example.invalid' });
    if (path === '/mastery/me') return json({ userId: 1, skills: [{ skillId: 1, skillCode: 'P5_TENSE', skillName: 'Thì động từ', part: 5, masteryScore: .32, practiceCount: 6, lastPracticed: null }], partBreakdown: [], overallMastery: .32, learningPlan: { items: [] }, topicGroups: [] });
    if (path === '/das3h/mistake-review') return json(review);
    if (path === '/das3h/review-question') {
      const id = Number(url.searchParams.get('questionId'));
      log.opened.push(id);
      return json({ selectedQuestion: { id, part: 5, content: `Review question ${id}`, optionA: 'go', optionB: 'went', optionC: 'gone', optionD: 'going', passage: null, audioUrl: null, imageUrl: null }, predictedProb: .4, targetProb: null, evaluatedCandidatesCount: 1, isExploration: false, reviewMode: true });
    }
    if (path === '/das3h/answer-adaptive') {
      log.answered.push(route.request().postDataJSON());
      return json({ isCorrect: true, correctAnswer: 'B', explanation: 'Quá khứ đơn.' });
    }
    return route.fulfill({ status: 404, json: {} });
  });
}

test('mistake review shows only weak skills and walks through the chosen questions', async ({ page }, testInfo) => {
  const log = { opened: [] as number[], answered: [] as unknown[] };
  await fixture(page, plan, log);
  await page.goto('/recommendations');
  const section = page.getByRole('region', { name: 'Ôn câu hay sai' });
  await expect(section.locator('.mistake-review-card')).toHaveCount(1);
  await expect(section).toContainText('1 câu đã sai từ 2 lần');
  await expect(section).toContainText('Dự đoán làm đúng khoảng 40%');
  await expect(section).toContainText('Còn 4 câu sai khác');
  await section.getByRole('button', { name: 'Ôn 2 câu Thì động từ', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Luyện kỹ năng', exact: true });
  await expect(dialog.getByText('Ôn câu hay sai · Câu 1/2', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Review question 201', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'B. went', exact: true }).click();
  await dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await dialog.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await expect(dialog.getByText('Ôn câu hay sai · Câu 2/2', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Review question 202', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'B. went', exact: true }).click();
  await dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await expect(dialog.getByText('Đã ôn hết các câu trong nhóm này.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Câu tiếp theo', exact: true })).toHaveCount(0);
  // Development StrictMode may mount the loader twice; the order of distinct questions matters.
  expect(log.opened.filter((id, index, all) => index === 0 || id !== all[index - 1])).toEqual([201, 202]);
  expect(log.answered).toMatchObject([{ questionId: 201, skillId: 1, selectedAnswer: 'B' }, { questionId: 202, skillId: 1, selectedAnswer: 'B' }]);
  expect(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('mistake-review.png'), fullPage: true });
});

test('mistake review stays hidden when nothing is due', async ({ page }) => {
  await fixture(page, { skills: [], openMistakes: 0, dueMistakes: 0, hiddenDueMistakes: 0 }, { opened: [], answered: [] });
  await page.goto('/recommendations');
  await expect(page.getByRole('heading', { name: 'Buổi học tiếp theo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ôn câu hay sai' })).toHaveCount(0);
});
