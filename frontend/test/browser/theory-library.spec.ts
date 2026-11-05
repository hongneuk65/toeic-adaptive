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
    if (path === '/auth/google/config') return route.fulfill({ json: { enabled: false } });
    if (path === '/mastery/activities') return route.fulfill({ json: { generatedAt: '2026-10-24T00:00:00Z', sections: { theory: [], vocabulary: [], reading: [], listening: [] } } });
    if (path === '/theory/catalog') return route.fulfill({ json: lessons });
    if (path === '/theory/1') return route.fulfill({ json: { ...lessons[0], content: `## Vị trí danh từ

Danh từ có thể đứng sau mạo từ.` } });
    if (path === '/theory/1/quiz') return route.fulfill({ json: [] });
    return route.fulfill({ json: [] });
  });
});

test('browse topic, Part, accent-insensitive search and pagination', async ({ page }) => {
  await page.goto('/theory');
  await expect(page.getByRole('heading', { name: 'Thư viện kiến thức' })).toBeVisible();
  await expect(page.locator('.theory-lesson')).toHaveCount(12);
  await page.getByRole('navigation', { name: 'Trang bài học' }).getByRole('button', { name: 'Trang 2', exact: true }).click();
  await expect(page.locator('.theory-lesson')).toHaveCount(4);
  await page.getByLabel('Chủ đề kiến thức').selectOption('listening');
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Câu hỏi Where/ })).toBeVisible();
  await page.getByLabel('Chủ đề kiến thức').selectOption('');
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
  await page.getByRole('button', { name: 'Thư viện bài học' }).click();
  await expect(page).toHaveURL(/topic=grammar$/);
  await page.getByRole('button', { name: /Danh từ và động từ/ }).click();
  await page.getByRole('button', { name: 'Làm quiz củng cố' }).click();
  await expect(page).toHaveURL(/\/theory\/1\/quiz$/);
});


test('rapid topic and Part changes preserve the latest URL filters', async ({ page }) => {
  await page.goto('/theory?topic=listening');
  await expect(page.getByRole('button', { name: /Câu hỏi Where/ })).toBeVisible();
  // Dispatch both interactions in one task, before the router's transition renders.
  await page.getByLabel('Chủ đề kiến thức').evaluate(topicSelect => {
    (topicSelect as HTMLSelectElement).value = '';
    topicSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const select = document.querySelector<HTMLSelectElement>('.theory-part-filter select')!;
    select.value = '6';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page).toHaveURL(/\/theory\?part=6$/);
  await expect(page.getByLabel('Phần thi liên quan')).toHaveValue('6');
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Bài ngữ pháp 15/ })).toBeVisible();
});


test('switches between topic and Part browsing while retaining active filters', async ({ page }) => {
  await page.goto('/theory?topic=grammar&part=5');
  await expect(page.getByRole('button', { name: 'Theo chủ đề', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Theo Part', exact: true }).click();
  await expect(page).toHaveURL(/topic=grammar&part=5&view=part$/);
  await expect(page.getByRole('button', { name: 'Theo Part', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Chủ đề kiến thức')).toHaveValue('grammar');
  await expect(page.getByLabel('Phần thi liên quan')).toHaveValue('5');
  await expect(page.locator('.theory-lesson')).toHaveCount(12);
  await page.getByRole('navigation', { name: 'Trang bài học' }).getByRole('button', { name: 'Trang 2', exact: true }).click();
  await expect(page.locator('.theory-lesson')).toHaveCount(2);
  await page.getByLabel('Phần thi liên quan').selectOption('6');
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Bài ngữ pháp 15/ })).toBeVisible();
  await page.getByRole('button', { name: 'Theo chủ đề', exact: true }).click();
  await expect(page).toHaveURL(/topic=grammar&part=6$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('quiz returns to the same filtered library and search', async ({ page }) => {
  await page.goto('/theory?topic=grammar&part=5');
  await page.getByLabel('Tìm bài học').fill('danh tu');
  await page.getByRole('button', { name: /Danh từ và động từ/ }).click();
  await page.getByRole('button', { name: 'Làm quiz củng cố' }).click();
  await page.getByRole('button', { name: 'Đọc lại kiến thức' }).click();
  await expect(page).toHaveURL(/topic=grammar&part=5&lesson=1$/);
  await page.getByRole('button', { name: 'Thư viện bài học' }).click();
  await expect(page.getByLabel('Tìm bài học')).toHaveValue('danh tu');
  await expect(page.locator('.theory-lesson')).toHaveCount(1);
});

test('quiz focuses unanswered questions and retries an immutable submission', async ({ page }) => {
  const payloads: unknown[] = [];
  const questions = [1, 2].map(id => ({ id, part: 5, content: `Question ${id}`, optionA: 'First', optionB: 'Second', optionC: 'Third', optionD: 'Fourth' }));
  await page.route('**/api/theory/1/quiz', route => route.fulfill({ json: questions }));
  await page.route('**/api/theory/1/quiz/submit', route => {
    payloads.push(route.request().postDataJSON());
    return payloads.length === 1 ? route.fulfill({ status: 503, json: { message: 'Chưa kết nối được' } }) : route.fulfill({ json: { totalQuestions: 2, correctCount: 2, scorePercentage: 100, details: questions.map(q => ({ questionId: q.id, selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true })) } });
  });
  await page.goto('/theory/1/quiz');
  await page.locator('input[name="question-1"]').first().check();
  await page.getByRole('button', { name: 'Nộp bài quiz', exact: true }).click();
  await expect(page.locator('input[name="question-2"]').first()).toBeFocused();
  await page.locator('input[name="question-2"]').first().check();
  await page.getByRole('button', { name: 'Nộp bài quiz', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chưa kết nối được');
  await expect(page.getByRole('radio').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Gửi lại bài đã chọn', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Kết quả quiz' })).toBeFocused();
  expect(payloads).toHaveLength(2);
  expect(payloads[1]).toEqual(payloads[0]);
});
