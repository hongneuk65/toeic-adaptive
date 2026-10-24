import { expect, test, type Page } from '@playwright/test';

async function fixture(page: Page, correct = false, failFirstSupport = false) {
  const requestedSkills: number[] = [];
  const answers: { attemptId: string; questionId: number; skillId: number }[] = [];
  const supports: { attemptId: string; questionId: number; skillId: number }[] = [];
  let supportUnavailable = failFirstSupport;
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'fixture@example.invalid' });
    if (path === '/mastery/me') return json({ userId: 1, skills: [1, 2].map(id => ({ skillId: id, skillCode: `S${id}`, skillName: `Kỹ năng ${id}`, part: 5, masteryScore: .4, practiceCount: 2, lastPracticed: null })), partBreakdown: [], overallMastery: .4, topicGroups: [{ id: 'grammar', title: 'Ngữ pháp', description: 'Luyện hai kỹ năng', parts: [5], skillIds: [1, 2], observedSkillCount: 2, totalSkillCount: 2, estimatedSuccess: .4, evidenceStatus: 'limited', priority: 'focus', recommendedSkillId: 1, lesson: null }] });
    if (path === '/das3h/adaptive-question') {
      const id = Number(url.searchParams.get('skillId')); requestedSkills.push(id);
      return json({ selectedQuestion: { id: 100 + requestedSkills.length, part: 5, content: 'The manager ___ available.', optionA: 'is', optionB: 'are', optionC: 'be', optionD: 'being' }, predictedProb: .7, targetProb: .75, evaluatedCandidatesCount: 10, isExploration: false });
    }
    if (path === '/das3h/answer-adaptive') {
      answers.push(route.request().postDataJSON());
      return json({ isCorrect: correct, correctAnswer: 'A', explanation: 'Use a singular verb for the singular subject.' });
    }
    if (path === '/das3h/practice-support') {
      supports.push(route.request().postDataJSON());
      if (supportUnavailable) return route.fulfill({ status: 503, json: { message: 'Chưa tải được hướng dẫn.' } });
      return json({ version: 'practice-support-v1', skillId: 1, skillName: 'Hòa hợp chủ vị', steps: [
        { title: 'Xác định chủ ngữ', body: 'Tìm danh từ trung tâm của cụm chủ ngữ.' },
        { title: 'Kiểm tra số ít hoặc số nhiều', body: 'Bỏ qua cụm bổ nghĩa để xác định số của chủ ngữ.' },
        { title: 'Đối chiếu động từ', body: 'Kiểm tra dạng động từ với chủ ngữ chính.' },
      ], lesson: { id: 17, title: 'Hòa hợp chủ vị', part: 5 } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/recommendations');
  await page.getByRole('button', { name: 'Luyện Ngữ pháp', exact: true }).click();
  return { requestedSkills, answers, supports, enableSupport: () => { supportUnavailable = false; }, dialog: page.getByRole('dialog', { name: 'Luyện kỹ năng', exact: true }) };
}

test('wrong answer offers lazy progressive support and repeats the same skill instead of rotating', async ({ page }, testInfo) => {
  const state = await fixture(page);
  await expect(state.dialog.getByRole('button', { name: 'Hướng dẫn từng bước' })).toHaveCount(0);
  await state.dialog.getByRole('button', { name: 'B. are', exact: true }).click();
  await state.dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  const support = state.dialog.getByRole('region', { name: 'Củng cố sau câu trả lời' });
  await expect(support).toBeVisible();
  expect(state.supports).toHaveLength(0);
  const trigger = support.getByRole('button', { name: 'Hướng dẫn từng bước' });
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(support.getByRole('heading', { name: 'Xác định chủ ngữ', exact: true })).toBeVisible();
  await expect(support.getByRole('heading', { name: 'Đối chiếu động từ', exact: true })).toHaveCount(0);
  await expect(support.getByRole('button', { name: 'Thu gọn hướng dẫn' })).toHaveAttribute('aria-expanded', 'true');
  await support.getByRole('button', { name: 'Bước tiếp theo', exact: true }).click();
  await expect(support.getByRole('heading', { name: 'Kiểm tra số ít hoặc số nhiều', exact: true })).toBeVisible();
  await support.getByRole('button', { name: 'Bước tiếp theo', exact: true }).click();
  await expect(support.getByRole('heading', { name: 'Đối chiếu động từ', exact: true })).toBeVisible();
  await expect(support.getByRole('heading', { name: 'Đối chiếu động từ', exact: true })).toBeFocused();
  expect(await state.dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
  await expect(support.getByRole('button', { name: 'Bước tiếp theo', exact: true })).toHaveCount(0);
  await expect(support.getByRole('link', { name: 'Ôn kiến thức: Hòa hợp chủ vị →' })).toHaveAttribute('href', '/theory?lesson=17');
  expect(state.supports.length).toBeGreaterThan(0);
  expect(state.supports.every(request => JSON.stringify(request) === JSON.stringify({ questionId: state.answers[0].questionId, skillId: 1, attemptId: state.answers[0].attemptId }))).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('practice-support.png'), fullPage: true });
  const priorQuestions = state.requestedSkills.length;
  await support.getByRole('button', { name: 'Luyện thêm kỹ năng này' }).click();
  await expect(support).toHaveCount(0);
  await expect(state.dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true })).toBeVisible();
  expect(await state.dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy();
  await expect.poll(() => state.requestedSkills.length).toBeGreaterThan(priorQuestions);
  expect(state.requestedSkills.every(id => id === 1)).toBeTruthy();
  expect(state.answers).toHaveLength(1);
  expect(await state.dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
});

test('support can retry without writing another answer and correct answers do not offer it', async ({ page }) => {
  const state = await fixture(page, false, true);
  await state.dialog.getByRole('button', { name: 'B. are', exact: true }).click();
  await state.dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await state.dialog.getByRole('button', { name: 'Hướng dẫn từng bước' }).click();
  await expect(state.dialog.getByRole('alert')).toContainText('Chưa tải được hướng dẫn');
  const priorRequests = state.supports.length;
  state.enableSupport();
  await state.dialog.getByRole('button', { name: 'Thử lại hướng dẫn' }).click();
  await expect(state.dialog.getByRole('heading', { name: 'Xác định chủ ngữ', exact: true })).toBeVisible();
  expect(state.supports.length).toBeGreaterThan(priorRequests);
  expect(state.supports.every(request => JSON.stringify(request) === JSON.stringify(state.supports[0]))).toBeTruthy();
  expect(state.answers).toHaveLength(1);
});

test('correct answers retain ordinary progression without remedial support', async ({ page }) => {
  const state = await fixture(page, true);
  await state.dialog.getByRole('button', { name: 'A. is', exact: true }).click();
  await state.dialog.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click();
  await expect(state.dialog.getByText('Chính xác', { exact: true })).toBeVisible();
  await expect(state.dialog.getByRole('button', { name: 'Hướng dẫn từng bước' })).toHaveCount(0);
  await state.dialog.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await expect(state.dialog.getByRole('heading', { name: 'Kỹ năng 2 (Part 5)', exact: true })).toBeVisible();
  expect(state.supports).toHaveLength(0);
});
