import { expect, test, type Page } from '@playwright/test';

async function fixture(page: Page, mode: 'new' | 'legacy' | 'submitted' | 'failed' = 'new') {
  const question = {
    type: 'DETAIL', prompt: 'When does the office open?', options: ['At nine', 'At ten', 'At noon', 'At eight'], evidenceRequired: false,
    ...(mode !== 'legacy' ? { learningLevel: 'REMEMBER', learning: { level: 'ANALYZE', objective: 'hidden-objective-marker', sourceCardIds: ['hidden-source-marker'] } } : {}),
  };
  const version = { id: 1, articleId: 1, revision: 1, title: 'Office hours', text: 'The office opens at nine.', topic: 'Workplace', kind: 'NOTICE', difficulty: 'EASY', origin: 'AI', reviewed: false, questions: [question] };
  const attempt = { id: 1, versionId: 1, tryNumber: 1, currentIndex: 0, answers: {}, hints: [], elapsedSeconds: 0, correct: null, total: null, submittedAt: mode === 'submitted' ? '2026-10-22T00:00:00Z' : null, version: mode === 'submitted' ? { ...version, questions: [{ ...question, learningLevel: undefined }] } : version };
  let retries = 0;
  await page.addInitScript(() => localStorage.setItem('accessToken', 'reading-fixture'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'fixture@example.invalid' });
    if (path === '/auth/google/config') return json({ enabled: false });
    if (path === '/reading') return json({ articles: [], attempts: [], limits: { maxText: 10000, maxQuestions: 5, generations: 5, tutorCalls: 10 } });
    if (path === '/reading/attempts/1') return json(attempt);
    if (path === '/reading/personal') return json({ id: 1 });
    if (path === '/reading/articles/1/retry') { retries++; return json({ id: 1 }); }
    if (path === '/reading/articles/1') return json({ id: 1, title: 'Office hours', text: 'The office opens at nine.', ownerId: 1, status: 'FAILED', generationAttempts: retries + 1, error: 'Không thể kiểm tra câu hỏi. Hãy thử lại.', version: null });
    return json({ message: `Unexpected route ${path}` }, 404);
  });
}

test('public cognitive label does not expose submitted-only metadata', async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto('/reading?attempt=1');
  await expect(page.getByText('Mục tiêu luyện tập: Nhớ thông tin', { exact: true })).toBeVisible();
  await expect(page.getByText(/chưa duyệt chuyên môn, chỉ luyện tập/)).toBeVisible();
  await expect(page.getByText('hidden-objective-marker')).toHaveCount(0);
  await expect(page.getByText('hidden-source-marker')).toHaveCount(0);
  await expect(page.getByText('Mục tiêu luyện tập: Phân tích')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('reading-generation.png'), fullPage: true });
});

test('legacy questions have no invented cognitive label', async ({ page }) => {
  await fixture(page, 'legacy');
  await page.goto('/reading?attempt=1');
  await expect(page.getByText('When does the office open?')).toBeVisible();
  await expect(page.getByText(/Mục tiêu luyện tập:/)).toHaveCount(0);
});

test('submitted question can use full learning metadata level', async ({ page }) => {
  await fixture(page, 'submitted');
  await page.goto('/reading?attempt=1');
  await expect(page.getByText('Mục tiêu luyện tập: Phân tích', { exact: true })).toBeVisible();
});

test('personal creation keeps request contract and offers retry after generation failure', async ({ page }) => {
  await fixture(page, 'failed');
  await page.goto('/reading');
  await page.getByText('Tạo bài từ văn bản của bạn', { exact: true }).click();
  await expect(page.getByText(/trích dẫn bằng chứng nguyên văn/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Tên bài Reading cá nhân', exact: true }).fill('Office hours');
  const text = 'The office opens at nine. '.repeat(10);
  await page.getByRole('textbox', { name: 'Văn bản Reading cá nhân', exact: true }).fill(text);
  const request = page.waitForRequest(request => request.url().endsWith('/reading/personal'));
  await page.getByRole('button', { name: 'Tạo bài luyện riêng', exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ title: 'Office hours', text });
  await expect(page.getByRole('alert').filter({ hasText: 'Không thể kiểm tra câu hỏi' })).toBeVisible();
  await page.getByRole('button', { name: 'Thử tạo lại (1/3)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thử tạo lại (2/3)', exact: true })).toBeVisible();
});
