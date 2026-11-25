import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../components/ui/AuthShell';
import { useAuth } from '../auth/useAuth';
import { learningReturnTo } from '../auth/return-to';
import { api, getErrorMessage } from '../lib/api';
import { GITHUB_RETURN_KEY } from '../components/GithubSignIn';

type GithubResult = { accessToken: string } | { linkRequired: true; email: string; linkToken: string; hasPassword: boolean };

/** GitHub chuyển về đây với ?code&state; mã chỉ dùng được một lần nên chỉ gửi đúng một lần. */
export const GithubCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const sent = useRef(false);
  const [error, setError] = useState<string | null>(() => params.get('error') ? 'Bạn đã hủy đăng nhập GitHub.'
    : !params.get('code') || !params.get('state') ? 'Thiếu thông tin đăng nhập GitHub. Vui lòng thử lại.' : null);
  const [link, setLink] = useState<{ email: string; linkToken: string; hasPassword: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const finish = async (token: string) => {
    let returnTo: string | null = null;
    try { returnTo = sessionStorage.getItem(GITHUB_RETURN_KEY); sessionStorage.removeItem(GITHUB_RETURN_KEY); } catch { /* không bắt buộc */ }
    const user = await login(token);
    navigate(user.role === 'ADMIN' ? '/admin' : learningReturnTo(returnTo ?? undefined), { replace: true });
  };

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const code = params.get('code'); const state = params.get('state');
    if (params.get('error') || !code || !state) return;
    window.history.replaceState(null, '', '/login/github');
    api<GithubResult>('/auth/github', { method: 'POST', data: { code, state } })
      .then(async res => { if ('accessToken' in res) await finish(res.accessToken); else setLink(res); })
      .catch(err => setError(getErrorMessage(err, 'Đăng nhập GitHub thất bại. Vui lòng thử lại.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!link) return;
    setError(null); setBusy(true);
    try {
      const res = await api<{ accessToken: string }>('/auth/github/link', { method: 'POST', data: { linkToken: link.linkToken, password } });
      await finish(res.accessToken);
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa liên kết được tài khoản. Vui lòng thử lại.'));
      setBusy(false);
    }
  };

  return <AuthShell title="Đăng nhập bằng GitHub" description={link ? 'Liên kết GitHub với tài khoản đã có.' : 'Đang xác minh tài khoản GitHub…'}
    footer={<Link className="font-semibold text-accent-coral hover:underline" to="/login">Quay lại đăng nhập</Link>}>
    {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!error && !link && <p role="status" className="text-sm text-ink-medium">Đang đăng nhập…</p>}
    {link && (link.hasPassword ? <form onSubmit={submitLink} className="space-y-5">
      <p className="text-sm text-ink-medium">Email <strong>{link.email}</strong> đã có tài khoản. Nhập mật khẩu hiện tại một lần để liên kết GitHub.</p>
      <div>
        <label htmlFor="github-link-password" className="form-label">Mật khẩu hiện tại</label>
        <input id="github-link-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="form-input" />
      </div>
      <button type="submit" disabled={busy || !password} className="primary-button w-full">{busy ? 'Đang liên kết...' : 'Liên kết và đăng nhập'}</button>
    </form> : <p role="alert" className="text-sm text-ink-medium">Email <strong>{link.email}</strong> đã có tài khoản đăng nhập bằng Google hoặc mã gửi qua email. Hãy đăng nhập bằng cách đó.</p>)}
  </AuthShell>;
};
