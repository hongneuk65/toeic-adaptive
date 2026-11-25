import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/ui/AuthShell';
import { EmailCodeStep } from '../components/EmailCodeStep';
import { api, getErrorMessage } from '../lib/api';
import { useAuth } from '../auth/useAuth';
import { learningReturnTo } from '../auth/return-to';

type Sent = { email: string; notice: string; cooldown: number };

/** Quên mật khẩu: nhập email, nhận mã 6 số, nhập mã cùng mật khẩu mới. */
export const ForgotPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(typeof location.state?.email === 'string' ? location.state.email : '');
  const [sent, setSent] = useState<Sent | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = () => api<{ expiresInSeconds: number; resendAfterSeconds: number }>('/auth/password/forgot', { method: 'POST', data: { email: email.trim() } });

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null); setBusy(true);
    try {
      const res = await request();
      const target = email.trim();
      setSent({ email: target, cooldown: res.resendAfterSeconds, notice: `Nếu ${target} đã đăng ký, một mã gồm 6 chữ số vừa được gửi tới email này. Mã có hiệu lực ${Math.round(res.expiresInSeconds / 60)} phút.` });
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa gửi được mã. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const footer = <>Nhớ mật khẩu? <Link className="font-semibold text-accent-coral hover:underline" to="/login">Đăng nhập</Link></>;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  if (sent) {
    return (
      <AuthShell title="Đặt lại mật khẩu" description="Nhập mã đã gửi tới email và mật khẩu mới." footer={footer}>
        <EmailCodeStep
          email={sent.email}
          initialNotice={sent.notice}
          initialCooldown={sent.cooldown}
          submitLabel="Đặt lại mật khẩu"
          busyLabel="Đang lưu..."
          canSubmit={password.length >= 6 && password === confirmPassword}
          onSubmit={async code => {
            const res = await api<{ accessToken: string }>('/auth/password/reset', { method: 'POST', data: { email: sent.email, code, password } });
            const user = await login(res.accessToken);
            navigate(user.role === 'ADMIN' ? '/admin' : learningReturnTo(undefined), { replace: true });
          }}
          onResend={request}
          onChangeEmail={() => setSent(null)}
        >
          <div>
            <label htmlFor="reset-password" className="form-label">Mật khẩu mới</label>
            <input id="reset-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)} className="form-input" placeholder="Tối thiểu 6 ký tự" />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="form-label">Nhập lại mật khẩu mới</label>
            <input id="reset-confirm" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="form-input" aria-invalid={mismatch} />
            {mismatch && <p className="mt-1 text-xs text-rose-700">Mật khẩu nhập lại không khớp.</p>}
          </div>
        </EmailCodeStep>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Quên mật khẩu" description="Nhập email đã đăng ký để nhận mã đặt lại mật khẩu." footer={footer}>
      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={send} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="form-label">Email</label>
          <input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="form-input" placeholder="ban@example.com" />
        </div>
        <button type="submit" disabled={busy} className="primary-button w-full">{busy ? 'Đang gửi mã...' : 'Gửi mã đặt lại'}</button>
      </form>
    </AuthShell>
  );
};
