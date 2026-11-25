import React, { useEffect, useState } from 'react';
import { getErrorMessage } from '../lib/api';

interface Props {
  email: string;
  /** Thông báo hiển thị ngay khi mở bước nhập mã, ví dụ "Đã gửi mã tới…". */
  initialNotice?: string | null;
  initialError?: string | null;
  initialCooldown?: number;
  submitLabel: string;
  busyLabel: string;
  /** Trường nhập thêm, ví dụ mật khẩu mới khi đặt lại mật khẩu. */
  children?: React.ReactNode;
  canSubmit?: boolean;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<{ resendAfterSeconds: number }>;
  onChangeEmail: () => void;
}

/** Bước nhập mã 6 số gửi qua email, có gửi lại mã sau thời gian chờ. */
export const EmailCodeStep: React.FC<Props> = ({ email, initialNotice = null, initialError = null, initialCooldown = 0, submitLabel, busyLabel, children, canSubmit = true, onSubmit, onResend, onChangeEmail }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async () => {
    setError(null); setBusy(true);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(getErrorMessage(err, 'Mã chưa đúng. Vui lòng thử lại.'));
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null); setNotice(null); setBusy(true);
    try {
      const res = await onResend();
      setCode('');
      setCooldown(res.resendAfterSeconds);
      setNotice(`Đã gửi mã mới tới ${email}.`);
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa gửi được mã. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-accent-navy">{notice}</p>}
      <div>
        <label htmlFor="email-code" className="form-label">Mã gồm 6 chữ số</label>
        <input id="email-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} autoFocus
          onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="form-input tracking-[0.4em] text-lg" placeholder="••••••" />
        <p className="mt-1 text-xs text-ink-medium">Không thấy email? Hãy kiểm tra thư mục Spam hoặc Quảng cáo.</p>
      </div>
      {children}
      <button type="submit" disabled={busy || code.length !== 6 || !canSubmit} className="primary-button w-full">{busy ? busyLabel : submitLabel}</button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className="text-action" disabled={busy || cooldown > 0} onClick={() => void resend()}>
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown} giây` : 'Gửi lại mã'}
        </button>
        <button type="button" className="text-action" disabled={busy} onClick={onChangeEmail}>Đổi email</button>
      </div>
    </form>
  );
};
