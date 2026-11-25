import { AuthShell } from '../components/ui/AuthShell';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { EmailCodeStep } from '../components/EmailCodeStep';
import { useAuth } from '../auth/useAuth';
import { learningReturnTo } from '../auth/return-to';

type RegisterResponse =
  | { email: string; verificationRequired: false }
  | { email: string; verificationRequired: true; expiresInSeconds?: number; resendAfterSeconds?: number; sendError?: string };

type Pending = { email: string; notice: string | null; error: string | null; cooldown: number };

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    try {
      const res = await api<RegisterResponse>('/auth/register', { method: 'POST', data: { email: email.trim(), password } });
      if (!res.verificationRequired) {
        navigate('/login', { state: { registered: true } });
        return;
      }
      setPending({
        email: res.email,
        notice: res.sendError ? null : `Đã gửi mã xác nhận gồm 6 chữ số tới ${res.email}. Mã có hiệu lực ${Math.round((res.expiresInSeconds ?? 600) / 60)} phút.`,
        error: res.sendError ?? null,
        cooldown: res.sendError ? 0 : res.resendAfterSeconds ?? 60,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại. Email có thể đã được sử dụng.'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    const res = await api<{ accessToken: string }>('/auth/register/verify', { method: 'POST', data: { email: pending!.email, code } });
    const user = await login(res.accessToken);
    navigate(user.role === 'ADMIN' ? '/admin' : learningReturnTo(undefined), { replace: true });
  };

  if (pending) {
    return (
      <AuthShell title="Xác nhận email" description={`Nhập mã đã gửi tới ${pending.email} để hoàn tất đăng ký.`} footer={<>Đã có tài khoản? <Link className="font-semibold text-accent-coral hover:underline" to="/login">Đăng nhập</Link></>}>
        <EmailCodeStep
          email={pending.email}
          initialNotice={pending.notice}
          initialError={pending.error}
          initialCooldown={pending.cooldown}
          submitLabel="Xác nhận và bắt đầu học"
          busyLabel="Đang xác nhận..."
          onSubmit={verify}
          onResend={() => api<{ resendAfterSeconds: number }>('/auth/register/resend', { method: 'POST', data: { email: pending.email } })}
          onChangeEmail={() => { setPending(null); setPassword(''); setConfirmPassword(''); }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Tạo tài khoản" description="Tạo tài khoản học TOEIC." footer={<>Đã có tài khoản? <Link className="font-semibold text-accent-coral hover:underline" to="/login">Đăng nhập</Link></>}>
      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <GoogleSignIn />
      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label htmlFor="register-email" className="form-label">Email</label>
          <input id="register-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="ban@example.com" />
        </div>
        <div>
          <label htmlFor="register-password" className="form-label">Mật khẩu</label>
          <input id="register-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Tối thiểu 6 ký tự" />
        </div>
        <div>
          <label htmlFor="register-confirm" className="form-label">Xác nhận mật khẩu</label>
          <input id="register-confirm" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" placeholder="Nhập lại mật khẩu" />
        </div>
        <button type="submit" disabled={loading} className="primary-button w-full">{loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
      </form>
    </AuthShell>
  );
};
