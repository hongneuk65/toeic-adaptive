import { expect, test, type Page } from '@playwright/test';

type Call = { path: string; body: unknown };

async function fixture(page: Page, options: { otp?: boolean; loginStatus?: number } = {}) {
  const calls: Call[] = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const body = route.request().postData() ? route.request().postDataJSON() : null;
    calls.push({ path, body });
    if (path === '/auth/google/config' || path === '/auth/github/config') return route.fulfill({ json: { enabled: false } });
    if (path === '/auth/otp/config') return route.fulfill({ json: { enabled: options.otp !== false } });
    if (path === '/auth/register') return route.fulfill({ status: 201, json: options.otp === false
      ? { email: 'hoc.vien@example.com', verificationRequired: false }
      : { email: 'hoc.vien@example.com', verificationRequired: true, expiresInSeconds: 600, resendAfterSeconds: 60 } });
    if (path === '/auth/register/resend' || path === '/auth/password/forgot') return route.fulfill({ status: 201, json: { expiresInSeconds: 600, resendAfterSeconds: 60 } });
    if (path === '/auth/register/verify' || path === '/auth/password/reset') {
      if ((body as { code: string }).code !== '246810') return route.fulfill({ status: 401, json: { message: 'Mã chưa đúng. Còn 4 lần thử.' } });
      return route.fulfill({ status: 201, json: { accessToken: 'fixture' } });
    }
    if (path === '/auth/login') return route.fulfill({ status: options.loginStatus ?? 201, json: options.loginStatus === 403 ? { message: 'Email chưa được xác nhận.' } : { accessToken: 'fixture' } });
    if (path === '/auth/me') return route.fulfill({ json: { id: 1, role: 'USER', email: 'hoc.vien@example.com' } });
    return route.fulfill({ status: 404, json: {} });
  });
  return calls;
}

test('a new learner registers, enters the emailed code and lands in the app', async ({ page }) => {
  const calls = await fixture(page);
  await page.goto('/register');
  await page.getByLabel('Email').fill('hoc.vien@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('secret12');
  await page.getByLabel('Xác nhận mật khẩu').fill('secret12');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByRole('heading', { name: 'Xác nhận email' })).toBeVisible();
  await expect(page.getByText('Đã gửi mã xác nhận gồm 6 chữ số tới hoc.vien@example.com', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Gửi lại mã sau \d+ giây/ })).toBeDisabled();
  const codeInput = page.getByLabel('Mã gồm 6 chữ số');
  await codeInput.fill('12a345');
  await expect(codeInput).toHaveValue('12345');
  await codeInput.fill('135790');
  await page.getByRole('button', { name: 'Xác nhận và bắt đầu học' }).click();
  await expect(page.getByRole('alert')).toContainText('Còn 4 lần thử');
  await codeInput.fill('246810');
  await page.getByRole('button', { name: 'Xác nhận và bắt đầu học' }).click();
  await expect(page).not.toHaveURL(/\/register$/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('fixture');
  expect(calls.find(c => c.path === '/auth/register')?.body).toEqual({ email: 'hoc.vien@example.com', password: 'secret12' });
  expect(calls.filter(c => c.path === '/auth/register/verify').map(c => c.body)).toEqual([
    { email: 'hoc.vien@example.com', code: '135790' }, { email: 'hoc.vien@example.com', code: '246810' },
  ]);
});

test('registration goes straight to sign-in when the server cannot send email', async ({ page }) => {
  await fixture(page, { otp: false });
  await page.goto('/register');
  await page.getByLabel('Email').fill('hoc.vien@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('secret12');
  await page.getByLabel('Xác nhận mật khẩu').fill('secret12');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Đã tạo tài khoản', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveCount(0);
});

test('an unverified account is asked for the code at sign-in', async ({ page }) => {
  const calls = await fixture(page, { loginStatus: 403 });
  await page.goto('/login');
  await page.getByLabel('Email').fill('hoc.vien@example.com');
  await page.getByLabel('Mật khẩu').fill('secret12');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xác nhận email' })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi lại mã' }).click();
  await expect(page.getByText('Đã gửi mã mới tới hoc.vien@example.com', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Mã gồm 6 chữ số').fill('246810');
  await page.getByRole('button', { name: 'Xác nhận và đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  expect(calls.filter(c => c.path === '/auth/register/resend').map(c => c.body)).toEqual([{ email: 'hoc.vien@example.com' }]);
});

test('a learner resets a forgotten password with an emailed code', async ({ page }) => {
  const calls = await fixture(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill('hoc.vien@example.com');
  await page.getByRole('link', { name: 'Quên mật khẩu?' }).click();
  await expect(page.getByLabel('Email')).toHaveValue('hoc.vien@example.com');
  await page.getByRole('button', { name: 'Gửi mã đặt lại' }).click();
  await expect(page.getByText('một mã gồm 6 chữ số vừa được gửi', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Mã gồm 6 chữ số').fill('246810');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('newpass1');
  await page.getByLabel('Nhập lại mật khẩu mới').fill('newpass2');
  await expect(page.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeDisabled();
  await page.getByLabel('Nhập lại mật khẩu mới').fill('newpass1');
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await expect(page).not.toHaveURL(/forgot-password/);
  expect(calls.find(c => c.path === '/auth/password/reset')?.body).toEqual({ email: 'hoc.vien@example.com', code: '246810', password: 'newpass1' });
});
