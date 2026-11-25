import { AuthShell } from '../components/ui/AuthShell';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError, api, getErrorMessage } from '../lib/api';
import { learningReturnTo } from '../auth/return-to';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { EmailCodeStep } from '../components/EmailCodeStep';
import { GithubSignIn } from '../components/GithubSignIn';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [unverified, setUnverified] = useState<{ email: string; notice: string | null; cooldown: number } | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    api<{ enabled: boolean }>('/auth/otp/config', { signal: controller.signal })
      .then(res => setOtpEnabled(res.enabled === true)).catch(() => setOtpEnabled(false));
    return () => controller.abort();
  }, []);

  const finishLogin = async (token: string) => {
    const user = await login(token);
    navigate(user.role === 'ADMIN' ? '/admin' : learningReturnTo(location.state?.returnTo), { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      await finishLogin(res.accessToken);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && otpEnabled) {
        setUnverified({ email: email.trim(), notice: null, cooldown: 0 });
        return;
      }
      setErrorMessage(getErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại!'));
    } finally {
      setLoading(false);
    }
  };

  if (unverified) {
    return (
      <AuthShell title="Xác nhận email" description={`Tài khoản ${unverified.email} chưa được xác nhận. Gửi mã tới email rồi nhập mã để tiếp tục.`} footer={<>Chưa có tài khoản? <Link className="font-semibold text-accent-coral hover:underline" to="/register">Đăng ký</Link></>}>
        <EmailCodeStep
          email={unverified.email}
          initialNotice="Bấm Gửi lại mã để nhận mã xác nhận mới."
          submitLabel="Xác nhận và đăng nhập"
          busyLabel="Đang xác nhận..."
          onSubmit={async code => {
            const res = await api<{ accessToken: string }>('/auth/register/verify', { method: 'POST', data: { email: unverified.email, code } });
            await finishLogin(res.accessToken);
          }}
          onResend={() => api<{ resendAfterSeconds: number }>('/auth/register/resend', { method: 'POST', data: { email: unverified.email } })}
          onChangeEmail={() => setUnverified(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Đăng nhập" description="Tiếp tục việc học của bạn." footer={<>Chưa có tài khoản? <Link className="font-semibold text-accent-coral hover:underline" to="/register">Đăng ký</Link></>}>
      {location.state?.registered && <p role="status" className="mb-4 text-sm text-accent-navy">Đã tạo tài khoản. Đăng nhập để bắt đầu học.</p>}
      {errorMessage && <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}
      <GoogleSignIn />
      <GithubSignIn returnTo={location.state?.returnTo} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="form-label">Email</label>
          <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="ban@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="form-label">Mật khẩu</label>
            {otpEnabled && <Link to="/forgot-password" state={{ email }} className="text-sm font-semibold text-accent-coral hover:underline">Quên mật khẩu?</Link>}
          </div>
          <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Nhập mật khẩu" />
        </div>
        <button type="submit" disabled={loading} className="primary-button w-full">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
    </AuthShell>
  );
};
