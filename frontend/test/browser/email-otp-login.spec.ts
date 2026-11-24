import { expect, test } from '@playwright/test';

test('learner signs in with a code sent by email', async ({ page }) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const body = route.request().postData() ? route.request().postDataJSON() : null;
    calls.push({ path, body });
    if (path === '/auth/google/config') return route.fulfill({ json: { enabled: false } });
    if (path === '/auth/otp/config') return route.fulfill({ json: { enabled: true } });
    if (path === '/auth/otp/request') return route.fulfill({ json: { sent: true, expiresInSeconds: 600, resendAfterSeconds: 60 } });
    if (path === '/auth/otp/verify') {
      if ((body as { code: string }).code !== '246810') return route.fulfill({ status: 401, json: { message: 'Mã chưa đúng. Còn 4 lần thử.' } });
      return route.fulfill({ json: { accessToken: 'fixture' } });
    }
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'hoc.vien@example.com' } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Đăng nhập bằng mã gửi qua email' }).click();
  await page.getByLabel('Email').fill('hoc.vien@example.com');
  await page.getByRole('button', { name: 'Gửi mã đăng nhập' }).click();
  await expect(page.getByRole('status')).toContainText('Đã gửi mã 6 số tới hoc.vien@example.com');
  await expect(page.getByRole('button', { name: /Gửi lại mã sau \d+ giây/ })).toBeDisabled();
  const codeInput = page.getByLabel('Mã gồm 6 chữ số');
  await codeInput.fill('12a345');
  await expect(codeInput).toHaveValue('12345');
  await codeInput.fill('135790');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Còn 4 lần thử');
  await codeInput.fill('246810');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('fixture');
  expect(calls.filter(c => c.path === '/auth/otp/request').map(c => c.body)).toEqual([{ email: 'hoc.vien@example.com' }]);
});

test('the email code option stays hidden when email sending is not configured', async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/otp/config') return route.fulfill({ json: { enabled: false } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập bằng mã gửi qua email' })).toHaveCount(0);
});
