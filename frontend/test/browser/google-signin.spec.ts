import { expect, test } from '@playwright/test';

for (const path of ['/login', '/register']) {
  test(`Google sign-in supports password confirmation on ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let linked = false;
    let postedPassword: string | undefined;
    await page.route('https://accounts.google.com/gsi/client?hl=vi', route => route.fulfill({ contentType: 'application/javascript', body: `
      let options;window.google={accounts:{id:{initialize(value){options=value},renderButton(host){const b=document.createElement('button');b.textContent='Tiếp tục với Google';b.onclick=()=>options.callback({credential:'verified-in-server-test'});host.appendChild(b)}}}};
    ` }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url()).pathname;
      if (url === '/api/auth/google/config') return route.fulfill({ json: { enabled: true, clientId: 'test.apps.googleusercontent.com', nonce: 'a'.repeat(64) } });
      if (url === '/api/auth/google') {
        const data = route.request().postDataJSON(); postedPassword = data.password;
        if (!data.password) return route.fulfill({ status: 409, json: { message: 'Email này đã có tài khoản. Nhập mật khẩu hiện tại để liên kết Google một lần.' } });
        linked = true;
        return route.fulfill({ json: { accessToken: 'application-jwt' } });
      }
      if (url === '/api/auth/me') return route.fulfill({ json: { id: 42, email: 'learner@gmail.com', role: 'USER' } });
      if (url === '/api/history') return route.fulfill({ json: { items: [], total: 0, pageSize: 12 } });
      if (url === '/api/reading') return route.fulfill({ json: { articles: [], attempts: [], limits: {} } });
      if (url === '/api/listening') return route.fulfill({ json: { sources: [], sessions: [], settings: {} } });
      if (url === '/api/mastery/me') return route.fulfill({ json: { skills: [], partBreakdown: [], overallMastery: 0 } });
      return route.fulfill({ json: [] });
    });
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp tục với Google' }).click();
    await expect(page.getByRole('alert')).toContainText('liên kết Google');
    await page.getByLabel('Mật khẩu tài khoản hiện tại').fill('existing-password');
    await page.getByRole('button', { name: 'Liên kết và tiếp tục' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(linked).toBe(true); expect(postedPassword).toBe('existing-password');
    expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('application-jwt');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Học TOEIC');
    expect(errors).toEqual([]);
  });
}

test('Google disabled keeps email sign-in usable without loading the external SDK', async ({ page }) => {
  let sdkRequested = false;
  await page.route('https://accounts.google.com/**', route => { sdkRequested = true; return route.abort(); });
  await page.route('**/api/auth/google/config', route => route.fulfill({ json: { enabled: false } }));
  await page.goto('/login');
  await expect(page.getByRole('region', { name: 'Đăng nhập bằng Google' })).toHaveCount(0);
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled();
  expect(sdkRequested).toBe(false);
});

test('SDK failure provides retry and does not prevent email login', async ({ page }) => {
  await page.route('**/api/auth/google/config', route => route.fulfill({ json: { enabled: true, clientId: 'test.apps.googleusercontent.com', nonce: 'a'.repeat(64) } }));
  await page.route('https://accounts.google.com/**', route => route.abort());
  await page.goto('/login');
  await expect(page.getByRole('alert')).toContainText('Chưa tải được');
  await expect(page.getByRole('button', { name: 'Thử lại đăng nhập Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled();
});
