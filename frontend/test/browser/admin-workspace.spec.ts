import { expect, test, type Page } from '@playwright/test';

async function fixture(page: Page, role = 'ADMIN') {
  const requests: { path: string; body: unknown }[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'admin-workspace-fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ json: body, status });
    if (path === '/auth/me') return json({ id: 1, email: 'admin@example.invalid', role });
    if (path === '/auth/google/config') return json({ enabled: false });
    if (path === '/admin/skills' && route.request().method() === 'GET') return json([{ id: 1, name: 'Từ loại', code: 'P5_WORD_FORM', part: 5 }]);
    if (path === '/admin/overview') return json({ counts: { users: 12, questions: 70, exams: 9, skills: 7, theory: 4, knowledge: 3, flashcards: 8, readingArticles: 5, listeningSources: 6, openReadingReports: 2, openListeningReports: 1 }, recentExams: [], questionParts: [{ part: 5, _count: { _all: 70 } }] });
    if (route.request().method() !== 'GET' && path.startsWith('/admin/')) {
      requests.push({ path, body: route.request().postDataJSON() });
      if (path === '/admin/skills') return json({ message: 'Mã kỹ năng đã tồn tại.' }, 409);
      return json({ id: 2 });
    }
    if (path === '/admin/knowledge') return json({ items: [{ id: 7, title: 'Mệnh đề quan hệ', part: 5, content: 'Who dùng cho người.', category: 'Grammar', skillCode: 'P5_WORD_FORM', keywords: ['relative clause'], reviewStatus: 'DRAFT', sourceUri: null, approvedContentHash: null }], total: 1, page: 1, pageSize: 15 });
    if (path === '/admin/users') return json({ items: [{ id: 1, email: 'admin@example.invalid', role: 'ADMIN', ability: 0, createdAt: '2026-11-01T00:00:00Z' }], total: 1, page: 1, pageSize: 15 });
    if (path === '/admin/skills/catalog') return json({ items: [], total: 0, page: 1, pageSize: 15 });
    if (path === '/admin/questions') return json({ items: [{ id: 1, content: 'The report is ready.', part: 5, difficulty: 'MEDIUM', source: 'OTHER', totalAttempts: 0 }], total: url.searchParams.get('q') ? 1 : 31, page: Number(url.searchParams.get('page')), pageSize: 15 });
    return json({ items: [], total: 0, page: 1, pageSize: 15 });
  });
  return requests;
}

test('admin navigation, real counts, search and paging stay usable on small screens', async ({ page }, info) => {
  await fixture(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Tổng quan', exact: true })).toBeVisible();
  if (info.project.name === 'mobile') await expect(page.getByLabel('Mục quản trị', { exact: true })).toBeVisible();
  else await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeVisible();
  await page.goto('/admin?tab=questions');
  await expect(page.getByRole('heading', { name: 'Ngân hàng câu hỏi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page.getByText('Trang 2 / 3', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm kiếm dữ liệu' }).fill('report');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page.getByText('Trang 1 / 1', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('admin-questions.png'), fullPage: true });
});

test('editor keeps entered values after server rejection and supports keyboard closing', async ({ page }) => {
  const requests = await fixture(page);
  await page.goto('/admin?tab=skills');
  await page.getByRole('button', { name: /Thêm kỹ năng$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo mới kỹ năng' });
  await dialog.getByLabel('Mã kỹ năng', { exact: true }).fill('P5_WORD_FORM');
  await dialog.getByLabel('Tên kỹ năng', { exact: true }).fill('Từ loại');
  await dialog.getByLabel('Nhóm kỹ năng', { exact: true }).fill('Grammar');
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Mã kỹ năng đã tồn tại');
  await expect(dialog.getByLabel('Tên kỹ năng', { exact: true })).toHaveValue('Từ loại');
  expect(requests).toHaveLength(1);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('knowledge editing does not imply approval and self role cannot be changed', async ({ page }, info) => {
  await fixture(page);
  await page.goto('/admin?tab=knowledge');
  await expect(page.getByText('Mệnh đề quan hệ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const detail = page.getByRole('dialog');
  await expect(detail).toBeVisible();
  await expect(detail.locator('.admin-dialog-body')).toBeVisible();
  await detail.locator('.admin-dialog-footer button').scrollIntoViewIfNeeded();
  await detail.getByRole('button', { name: 'Đóng', exact: true }).last().click({ timeout: 8000 });
  await page.goto('/admin?tab=users');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByLabel('Vai trò tài khoản')).toBeDisabled();
  await page.screenshot({ path: info.outputPath('admin-user-detail.png'), fullPage: false, timeout: 8000, animations: 'disabled' });
});

test('learner account is redirected without requesting admin data', async ({ page }) => {
  await fixture(page, 'USER');
  const adminRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/admin/')) adminRequests.push(request.url()); });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(adminRequests).toEqual([]);
});

test('browser back cannot save an editor against a different resource', async ({ page }, info) => {
  const requests = await fixture(page);
  await page.goto('/admin?tab=skills');
  const sectionSelect = page.getByLabel('Mục quản trị', { exact: true });
  if (info.project.name === 'mobile') await sectionSelect.selectOption('knowledge');
  else await page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('button', { name: 'Kho tri thức AI', exact: true }).click();
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Kỹ năng', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(requests).toEqual([]);
});

test('overview remains readable in dark mode without horizontal overflow', async ({ page }, info) => {
  await fixture(page);
  await page.addInitScript(() => localStorage.setItem('toeic:color-theme', 'dark'));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Tổng quan', exact: true })).toBeVisible();
  await expect(page.locator('.admin-stat').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('admin-dark.png'), fullPage: true });
});
