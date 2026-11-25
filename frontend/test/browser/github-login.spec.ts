import { expect, test, type Page } from '@playwright/test';

const state = 'c'.repeat(64);
const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=Iv1.fixture&redirect_uri=http%3A%2F%2Flocalhost%2Flogin%2Fgithub&scope=read%3Auser+user%3Aemail&state=${state}`;

async function fixture(page: Page, onLogin: (body: { code: string; state: string }) => unknown, calls: Array<{ path: string; body: unknown }>) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const body = route.request().postData() ? route.request().postDataJSON() : null;
    calls.push({ path, body });
    if (path === '/auth/google/config' || path === '/auth/otp/config') return route.fulfill({ json: { enabled: false } });
    if (path === '/auth/github/config') return route.fulfill({ json: { enabled: true, authorizeUrl } });
    if (path === '/auth/github') return route.fulfill({ json: onLogin(body) });
    if (path === '/auth/github/link') {
      if ((body as { password: string }).password !== 'mat-khau-cu') return route.fulfill({ status: 401, json: { message: 'Mật khẩu hiện tại chưa đúng. Vui lòng thử lại.' } });
      return route.fulfill({ json: { accessToken: 'linked' } });
    }
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'hoc.vien@example.com' } });
    return route.fulfill({ status: 404, json: {} });
  });
}

test('the GitHub button sends the learner to GitHub with the server state', async ({ page }) => {
  let opened = '';
  await fixture(page, () => ({}), []);
  await page.route('https://github.com/**', route => { opened = route.request().url(); return route.fulfill({ body: 'github' }); });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Đăng nhập bằng GitHub' }).click();
  await expect.poll(() => opened).toContain('https://github.com/login/oauth/authorize');
  expect(new URL(opened).searchParams.get('state')).toBe(state);
});

test('the GitHub callback exchanges the code once and signs in', async ({ page }) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  await fixture(page, () => ({ accessToken: 'github-token' }), calls);
  await page.goto(`/login/github?code=abc123&state=${state}`);
  await expect(page).not.toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('github-token');
  expect(calls.filter(c => c.path === '/auth/github').map(c => c.body)).toEqual([{ code: 'abc123', state }]);
});

test('an existing email account must confirm its password before GitHub is linked', async ({ page }) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  await fixture(page, () => ({ linkRequired: true, email: 'hoc.vien@example.com', linkToken: 'link-token', hasPassword: true }), calls);
  await page.goto(`/login/github?code=abc123&state=${state}`);
  await expect(page.getByText('đã có tài khoản')).toBeVisible();
  await page.getByLabel('Mật khẩu hiện tại').fill('sai');
  await page.getByRole('button', { name: 'Liên kết và đăng nhập' }).click();
  await expect(page.getByRole('alert')).toContainText('Mật khẩu hiện tại chưa đúng');
  await page.getByLabel('Mật khẩu hiện tại').fill('mat-khau-cu');
  await page.getByRole('button', { name: 'Liên kết và đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('linked');
  expect(calls.filter(c => c.path === '/auth/github/link').map(c => (c.body as { linkToken: string }).linkToken)).toEqual(['link-token', 'link-token']);
});

test('a cancelled GitHub sign-in explains itself and the button hides when GitHub is off', async ({ page }) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  await fixture(page, () => ({}), calls);
  await page.goto('/login/github?error=access_denied&state=x');
  await expect(page.getByRole('alert')).toContainText('Bạn đã hủy đăng nhập GitHub');
  expect(calls.some(c => c.path === '/auth/github')).toBe(false);
  await page.unroute('**/api/**');
  await page.route('**/api/**', route => route.fulfill({ json: { enabled: false } }));
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập bằng GitHub' })).toHaveCount(0);
});
