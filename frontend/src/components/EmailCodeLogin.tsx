import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../lib/api';

interface Props {
  initialEmail: string;
  onToken: (token: string) => Promise<void>;
  onCancel: () => void;
}

/** Đăng nhập bằng mã 6 số gửi qua email; email mới sẽ được tạo tài khoản người học. */
export const EmailCodeLogin: React.FC<Props> = ({ initialEmail, onToken, onCancel }) => {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    setError(null); setNotice(null); setBusy(true);
    try {
      const res = await api<{ resendAfterSeconds: number; expiresInSeconds: number }>('/auth/otp/request', { method: 'POST', data: { email } });
      setStep('code'); setCode('');
      setCooldown(res.resendAfterSeconds);
      setNotice(`Đã gửi mã 6 số tới ${email.trim()}. Mã có hiệu lực ${Math.round(res.expiresInSeconds / 60)} phút.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa gửi được mã. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null); setBusy(true);
    try {
      const res = await api<{ accessToken: string }>('/auth/otp/verify', { method: 'POST', data: { email, code } });
      await onToken(res.accessToken);
    } catch (err) {
      setError(getErrorMessage(err, 'Mã chưa đúng. Vui lòng thử lại.'));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-accent-navy">{notice}</p>}
      {step === 'email' ? (
        <form onSubmit={event => { event.preventDefault(); void send(); }} className="space-y-5">
          <div>
            <label htmlFor="otp-email" className="form-label">Email</label>
            <input id="otp-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="form-input" placeholder="ban@example.com" />
          </div>
          <button type="submit" disabled={busy} className="primary-button w-full">{busy ? 'Đang gửi mã...' : 'Gửi mã đăng nhập'}</button>
        </form>
      ) : (
        <form onSubmit={event => { event.preventDefault(); void verify(); }} className="space-y-5">
          <div>
            <label htmlFor="otp-code" className="form-label">Mã gồm 6 chữ số</label>
            <input id="otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="form-input tracking-[0.4em] text-lg" placeholder="••••••" />
          </div>
          <button type="submit" disabled={busy || code.length !== 6} className="primary-button w-full">{busy ? 'Đang kiểm tra...' : 'Đăng nhập'}</button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className="text-action" disabled={busy || cooldown > 0} onClick={() => void send()}>
              {cooldown > 0 ? `Gửi lại mã sau ${cooldown} giây` : 'Gửi lại mã'}
            </button>
            <button type="button" className="text-action" disabled={busy} onClick={() => { setStep('email'); setNotice(null); setError(null); }}>Đổi email</button>
          </div>
        </form>
      )}
      <button type="button" className="secondary-button w-full" onClick={onCancel}>Đăng nhập bằng mật khẩu</button>
    </div>
  );
};
