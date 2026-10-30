import { expect, test } from '@playwright/test';

const fresh = { hasLearningActivity: false, onboardingChoice: null, onboardingRequired: true };
function setup(page: import('@playwright/test').Page, initial = fresh, fail = false) {
  let status = initial;
  let saved = false;
  return page.addInitScript(() => localStorage.setItem('accessToken', 'fixture')).then(() => page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'test@example.invalid' } });
    if (path === '/auth/learning-status') return fail ? route.fulfill({ status: 503, json: { message: 'Unavailable' } }) : route.fulfill({ json: status });
    if (path === '/auth/onboarding') {
      if (fail) return route.fulfill({ status: 503, json: { message: 'Chưa thể lưu' } });
      status = { ...status, onboardingChoice: route.request().postDataJSON().choice, onboardingRequired: false }; saved = true;
      return route.fulfill({ json: status });
    }
    if (path === '/placement/overview') return route.fulfill({ json: { active: null, latest: null, preferences: { goal: 'BALANCED' }, catalog: { available: true, byPart: [], adaptiveParts: [5] } } });
    if (path === '/reading') return route.fulfill({ json: { articles: [], attempts: [] } });
    if (path === '/listening') return route.fulfill({ json: { sources: [], sessions: [] } });
    if (path === '/mastery/me') return route.fulfill({ json: { skills: [] } });
    if (path === '/mastery/activities') return route.fulfill({ json: { sections: { theory: [], vocabulary: [], reading: [], listening: [] } } });
    if (path === '/auth/google/config') return route.fulfill({ json: { enabled: false } });
    if (path === '/onboarding-saved') return route.fulfill({ json: { saved } });
    return route.fulfill({ json: [] });
  }));
}

test('new learner chooses self study once and keeps new learner CTA', async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/dashboard');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('onboarding.png'), fullPage: false });
  await expect(dialog.getByRole('button', { name: 'Làm test đầu vào', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Tự học trước', exact: true }).click();
  await expect(page).toHaveURL(/recommendations$/);
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.app-start-action')).toHaveText('Bắt đầu học');
  await page.reload();
  await expect(dialog).not.toBeVisible();
});

test('new learner can open placement after saving choice', async ({ page }) => {
  await setup(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Làm test đầu vào', exact: true }).click();
  await expect(page).toHaveURL(/placement$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('returning learner gets continue action without invitation', async ({ page }) => {
  await setup(page, { hasLearningActivity: true, onboardingChoice: null, onboardingRequired: false });
  await page.goto('/dashboard');
  await expect(page.locator('.app-start-action')).toHaveText('Học tiếp');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.prep-home-hero-cta')).toHaveText('Học tiếp');
});

test('unavailable status does not block learning or mislabel progress', async ({ page }) => {
  await setup(page, fresh, true);
  await page.goto('/dashboard');
  await expect(page.locator('.app-start-action')).toHaveText('Chọn bài học');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Chưa tải được trạng thái học của bạn.', { exact: false })).toBeVisible();
  await page.locator('.app-start-action').click();
  await expect(page).toHaveURL(/recommendations$/);
});

test('escape dismisses invitation without claiming a saved choice', async ({ page }) => {
  await setup(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.app-start-action')).toHaveText('Bắt đầu học');
});


test('failed choice stays in dialog and can retry without navigation', async ({ page }) => {
  await setup(page);
  let failed = true;
  await page.route('**/api/auth/onboarding', async route => {
    if (!failed) return route.fallback();
    failed = false;
    return route.fulfill({ status: 503, json: { message: 'Chưa thể lưu lựa chọn' } });
  });
  await page.goto('/dashboard');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Tự học trước', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Chưa thể lưu lựa chọn');
  await expect(page).toHaveURL(/dashboard$/);
  await dialog.getByRole('button', { name: 'Tự học trước', exact: true }).click();
  await expect(page).toHaveURL(/recommendations$/);
  await expect(dialog).not.toBeVisible();
});

test('active placement workspace is never interrupted by the invitation', async ({ page }) => {
  await setup(page);
  await page.goto('/placement');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.app-start-action')).toHaveText('Bắt đầu học');
});


test('slow choice times out and releases the optional invitation', async ({ page }) => {
  await setup(page);
  let release: (() => void) | undefined;
  await page.route('**/api/auth/onboarding', async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.abort().catch(() => {});
  });
  await page.clock.install();
  try {
    await page.goto('/dashboard');
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Tự học trước', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Tự học trước', exact: true })).toBeDisabled();
    await page.clock.fastForward(11000);
    await expect(dialog.getByRole('alert')).toContainText('Chưa nhận được phản hồi');
    await expect(dialog.getByRole('button', { name: 'Tự học trước', exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/dashboard$/);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  } finally { release?.(); }
});
