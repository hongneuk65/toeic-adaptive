import { expect, test } from '@playwright/test';

const grammar = { id: 'grammar', title: 'Ngữ pháp nền tảng', description: 'Từ loại và cấu trúc câu.' };
const listening = { id: 'listening', title: 'Hỏi đáp và phản hồi', description: 'Nghe và chọn phản hồi phù hợp.' };
const lessons = Array.from({ length: 15 }, (_, index) => ({ id: index + 1, title: index === 0 ? 'Danh từ và động từ' : `Bài ngữ pháp ${index + 1}`, part: index === 14 ? 6 : 5, topic: grammar, skill: { code: 'P5_WORD_FORM', name: 'Từ loại' } }));
lessons.push({ id: 16, title: 'Câu hỏi Where', part: 2, topic: listening, skill: { code: 'P2_WH', name: 'Câu hỏi Wh-' } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'test@example.invalid' } });
    if (path === '/theory/catalog') return route.fulfill({ json: lessons });
    if (path === '/theory/1') return route.fulfill({ json: { ...lessons[0], content: '## Vị trí danh từ\nDanh từ có thể đứng sau mạo từ.' } });
    if (path === '/theory/1/quiz') return route.fulfill({ json: [] });
    return route.fulfill({ json: [] });
  });
});

test('browse topic, Part, accent-insensitive search and pagination', async ({ page }) => {
  await page.goto('/theory');
  await expect(page.getByRole('heading', { name: 'Bạn muốn củng cố điều gì?' })).toBeVisible();
  await expect(page.locator('.theory-lesson')).toHaveCount(12);
  await page.getByRole('button', { name: 'Sau →', exact: true }).click();
  await expect(page.locator('.theory-lesson')).toHaveCount(4);
  await page.getByRole('button', { name: /1 bài học Hỏi đáp/ }).click();
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Câu hỏi Where/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tất cả chủ đề' }).click();
  await page.getByLabel('Phần thi liên quan').selectOption('6');
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
  await page.getByLabel('Tìm bài học').fill('khong co ket qua');
  await expect(page.getByRole('heading', { name: 'Chưa có bài phù hợp' })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ bộ lọc', exact: true }).click();
  await page.getByLabel('Tìm bài học').fill('danh tu');
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('deep link opens reader and returns to filtered library with quiz route intact', async ({ page }) => {
  await page.goto('/theory?topic=grammar&lesson=1');
  await expect(page.getByRole('heading', { name: 'Danh từ và động từ', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vị trí danh từ' })).toBeVisible();
  await page.getByRole('button', { name: '← Thư viện bài học' }).click();
  await expect(page).toHaveURL(/topic=grammar$/);
  await page.getByRole('button', { name: /Danh từ và động từ/ }).click();
  await page.getByRole('button', { name: 'Làm quiz củng cố →' }).click();
  await expect(page).toHaveURL(/\/theory\/1\/quiz$/);
});
