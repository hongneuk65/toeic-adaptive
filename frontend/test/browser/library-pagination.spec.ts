import { test, expect, type Page } from '@playwright/test';

const sources = Array.from({ length: 18 }, (_, index) => ({ id: index + 1, title: `Audio ${String(index + 1).padStart(2, '0')}`, kind: index < 9 ? 'AUDIO' : 'YOUTUBE', url: '/fixture.mp3', videoId: null, ownerId: null, published: true }));
const settings = { defaultSegmentSeconds: 180, maxSegmentSeconds: 300, maxRecordingSeconds: 60 };
async function libraryFixture(page: Page) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); const path = url.pathname.replace(/^\/api/, '');
    const json = (value: unknown) => route.fulfill({ json: value });
    if (path === '/auth/me') return json({ id: 1, role: 'USER', email: 'library@example.invalid' });
    if (path === '/auth/learning-status') return json({ hasLearningActivity: true, onboardingChoice: null, onboardingRequired: false });
    if (path === '/auth/google/config') return json({ enabled: false });
    if (path === '/mastery/activities') return json({ generatedAt: '2026-11-01', sections: { reading: [], listening: [], vocabulary: [], theory: [] } });
    if (path === '/reading') return json({ articles: Array.from({ length: 18 }, (_, index) => ({ id: index + 1, title: `Article ${String(index + 1).padStart(2, '0')}`, text: 'Office notices', ownerId: null, status: 'READY', version: { id: index + 1, title: `Article ${index + 1}`, kind: 'NOTICE', topic: 'Office', difficulty: index < 9 ? 'EASY' : 'HARD' } })), attempts: [], limits: { maxText: 10000, maxQuestions: 5 } });
    if (path === '/listening') {
      const current = Number(url.searchParams.get('page') || 1); const size = Number(url.searchParams.get('pageSize') || 8);
      const kind = url.searchParams.get('kind'); const query = url.searchParams.get('search');
      const filtered = sources.filter(source => (!kind || source.kind === kind) && (!query || source.title.includes(query)));
      return json({ sources: filtered.slice((current - 1) * size, current * size), sessions: [], settings, asrAvailable: false, pagination: { page: current, pageSize: size, total: filtered.length, totalPages: Math.ceil(filtered.length / size) } });
    }
    if (path === '/flashcards/folders/1') return json({ id: 1, name: 'Office words', count: 25, authorName: 'Library', isOwner: false });
    if (path === '/flashcards/folders/1/cards') return json(Array.from({ length: 25 }, (_, index) => ({ id: index + 1, word: `word${String(index + 1).padStart(2, '0')}`, meaning: `nghĩa ${String(index + 1).padStart(2, '0')}` })));
    if (path === '/flashcards/folders/1/reviews') return json([]);
    if (path === '/flashcards/folders') return json(Array.from({ length: 18 }, (_, index) => ({ id: index + 1, name: `Folder ${String(index + 1).padStart(2, '0')}`, count: 12, code: `F${index}`, authorName: 'Library', isOwner: index < 9 })));
    return json([]);
  });
}

test('Reading has numbered pages and filters restart at the first result page', async ({ page }) => {
  await libraryFixture(page); await page.goto('/reading');
  const cards = page.locator('.prep-library-catalog > button');
  await expect(cards).toHaveCount(8);
  const pages = page.getByRole('navigation', { name: 'Trang thư viện Reading' });
  await pages.getByRole('button', { name: 'Trang 3', exact: true }).click();
  await expect(cards).toHaveCount(2); await expect(cards.first()).toContainText('Article 17');
  await page.getByLabel('Lọc độ khó Reading').selectOption('HARD');
  await expect(cards).toHaveCount(8); await expect(cards.first()).toContainText('Article 10');
  await expect(pages.getByRole('button', { name: 'Trang 1', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('Listening uses numbered server pages and resets filters without rendering every item', async ({ page }) => {
  await libraryFixture(page); await page.goto('/listening');
  const cards = page.locator('.prep-library-catalog > button');
  await expect(cards).toHaveCount(8);
  const pages = page.getByRole('navigation', { name: 'Trang thư viện Listening' });
  const request = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/listening') && new URL(request.url()).searchParams.get('page') === '3');
  await pages.getByRole('button', { name: 'Trang 3', exact: true }).click();
  expect(new URL((await request).url()).searchParams.get('pageSize')).toBe('8');
  await expect(cards).toHaveCount(2); await expect(cards.first()).toContainText('Audio 17');
  await page.getByLabel('Loại nguồn bài nghe').selectOption('AUDIO');
  await expect(cards).toHaveCount(8); await expect(cards.first()).toContainText('Audio 01');
});

test('Vocabulary folders paginate and search starts with its first matching folder', async ({ page }) => {
  await libraryFixture(page); await page.goto('/flashcards');
  const folders = page.locator('.prep-folder-catalog > li'); await expect(folders).toHaveCount(8);
  const pages = page.getByRole('navigation', { name: 'Trang thư mục từ vựng' });
  await pages.getByRole('button', { name: 'Trang 3', exact: true }).click();
  await expect(folders).toHaveCount(2); await expect(folders.first()).toContainText('Folder 17');
  await page.getByLabel('Tìm thư mục từ vựng').fill('Folder 01');
  await expect(folders).toHaveCount(1); await expect(folders.first()).toContainText('Folder 01');
});

test('Listening recovers a valid page once when a saved catalog shrinks', async ({ page }) => {
  await libraryFixture(page);
  const requested: number[] = [];
  let shrinking = false;
  await page.route('**/api/listening?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page') || 1);
    requested.push(current);
    if (!shrinking) return route.fallback();
    const remaining = sources.slice(0, 5);
    return route.fulfill({ json: { sources: current === 1 ? remaining : [], sessions: [], settings, asrAvailable: false, pagination: { page: current, pageSize: 8, total: 5, totalPages: 1 } } });
  });
  await page.goto('/listening');
  await expect(page.locator('.prep-library-catalog > button')).toHaveCount(8);
  requested.length = 0; shrinking = true;
  await page.getByRole('navigation', { name: 'Trang thư viện Listening' }).getByRole('button', { name: 'Trang 3', exact: true }).click();
  await expect(page.locator('.prep-library-catalog > button')).toHaveCount(5);
  await expect(page.locator('.prep-library-catalog > button').first()).toContainText('Audio 01');
  expect(requested).toEqual([3, 1]);
  await expect(page.getByRole('navigation', { name: 'Trang thư viện Listening' })).toHaveCount(0);
});

test('word grid has numbered pages without changing the focused recall card', async ({ page }) => {
  await libraryFixture(page); await page.goto('/flashcards/1');
  await expect(page.getByRole('heading', { name: 'nghĩa 01', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thẻ tiếp', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'nghĩa 02', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tất cả thẻ', exact: true }).click();
  const cards = page.getByRole('group', { name: /^Thẻ word/ });
  await expect(cards).toHaveCount(12);
  await page.getByRole('navigation', { name: 'Trang thẻ từ vựng' }).getByRole('button', { name: 'Trang 3', exact: true }).click();
  await expect(cards).toHaveCount(1); await expect(cards.first()).toContainText('word25');
  await page.getByRole('button', { name: 'Ôn tập trung', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'nghĩa 02', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tất cả thẻ', exact: true }).click();
  await page.getByLabel('Tìm từ vựng').fill('word01');
  await expect(cards).toHaveCount(1); await expect(cards.first()).toContainText('word01');
});

test('numbered pages stay inside a narrow knowledge catalog', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await libraryFixture(page);
  await page.route('**/api/theory/catalog', route => route.fulfill({ json: Array.from({ length: 84 }, (_, index) => ({ id: index + 1, title: `Lesson ${index + 1}`, part: 5, topic: { id: 'grammar', title: 'Grammar', description: '' }, skill: { code: 'GRAMMAR', name: 'Grammar' } })) }));
  await page.goto('/theory');
  const pages = page.getByRole('navigation', { name: 'Trang bài học' });
  await expect(pages.getByRole('button', { name: 'Trang 7', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await pages.getByRole('button', { name: 'Trang 7', exact: true }).click();
  await expect(pages.getByRole('button', { name: 'Trang 7', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
