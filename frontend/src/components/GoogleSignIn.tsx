import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { learningReturnTo } from '../auth/return-to';
import { api, ApiError, getErrorMessage } from '../lib/api';

interface GoogleIdentity {
  initialize(options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: { type: string; theme: string; size: string; text: string; width: number; locale: string }): void;
}
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }
let sdkPromise: Promise<GoogleIdentity> | undefined;
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (!sdkPromise) sdkPromise = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => { script.remove(); sdkPromise = undefined; reject(new Error('Chưa tải được đăng nhập Google. Kiểm tra kết nối rồi thử lại.')); };
    const timeout = window.setTimeout(fail, 15000);
    script.src = 'https://accounts.google.com/gsi/client?hl=vi';
    script.async = true;
    script.onload = () => { window.clearTimeout(timeout); if (window.google?.accounts.id) resolve(window.google.accounts.id); else fail(); };
    script.onerror = () => { window.clearTimeout(timeout); fail(); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function GoogleSignIn() {
  const host = useRef<HTMLDivElement>(null);
  const alive = useRef(false);
  const busy = useRef(false);
  const [state, setState] = useState<'loading' | 'disabled' | 'ready' | 'busy' | 'error'>('loading');
  const [error, setError] = useState('');
  const [credential, setCredential] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [revision, setRevision] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const completion = useRef<(value: string, password?: string) => Promise<void>>(async () => {});

  useEffect(() => {
    completion.current = async (value, currentPassword) => {
      if (busy.current) return;
      busy.current = true; setState('busy'); setError('');
      try {
        const result = await api<{ accessToken: string }>('/auth/google', { method: 'POST', credentials: 'include', data: { credential: value, ...(currentPassword ? { password: currentPassword } : {}) } });
        if (!alive.current) return;
        const user = await login(result.accessToken);
        navigate(user.role === 'ADMIN' ? '/admin' : learningReturnTo(location.state?.returnTo), { replace: true });
      } catch (cause) {
        if (!alive.current) return;
        if (cause instanceof ApiError && cause.status === 409) setCredential(value);
        setError(getErrorMessage(cause, 'Đăng nhập Google chưa thành công. Vui lòng thử lại.'));
        setState(cause instanceof ApiError && cause.status === 409 || currentPassword ? 'ready' : 'error');
      } finally { busy.current = false; }
    };
  }, [login, navigate, location.state]);

  useEffect(() => {
    let cancelled = false; alive.current = true;
    const controller = new AbortController();
    api<{ enabled: boolean; clientId?: string; nonce?: string }>('/auth/google/config', { signal: controller.signal, credentials: 'include' }).then(async config => {
      if (cancelled) return;
      if (!config.enabled) { setState('disabled'); return; }
      const google = await loadGoogle();
      if (cancelled || !host.current || !config.clientId || !config.nonce) return;
      google.initialize({ client_id: config.clientId, nonce: config.nonce, auto_select: false, callback: result => { if (!cancelled) void completion.current(result.credential); } });
      host.current.replaceChildren();
      google.renderButton(host.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(400, host.current.clientWidth || 300), locale: 'vi' });
      setState('ready');
    }).catch(cause => { if (!cancelled) { setError(getErrorMessage(cause)); setState('error'); } });
    return () => { cancelled = true; alive.current = false; controller.abort(); };
  }, [revision]);

  if (state === 'disabled') return null;
  return <section className="mb-6" aria-label="Đăng nhập bằng Google" aria-busy={state === 'loading' || state === 'busy'}>
    <div ref={host} className={credential || state === 'error' ? 'hidden' : 'flex min-h-11 justify-center'} inert={state !== 'ready' || !!credential} />
    {(state === 'loading' || state === 'busy') && <p role="status" className="mt-2 text-center text-sm text-slate-500">{state === 'loading' ? 'Đang tải đăng nhập Google…' : 'Đang xác minh tài khoản…'}</p>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {credential && <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void completion.current(credential, password); }}>
      <label htmlFor="google-link-password" className="form-label">Mật khẩu tài khoản hiện tại</label>
      <input id="google-link-password" type="password" autoComplete="current-password" className="form-input" value={password} onChange={event => setPassword(event.target.value)} maxLength={200} required disabled={state === 'busy'} autoFocus />
      <button className="primary-button w-full" disabled={state === 'busy'}>Liên kết và tiếp tục</button>
      <button type="button" className="w-full text-sm text-slate-600 underline" disabled={state === 'busy'} onClick={() => { setCredential(null); setPassword(''); setError(''); setState('loading'); setRevision(value => value + 1); }}>Chọn lại tài khoản Google</button>
    </form>}
    {state === 'error' && <button type="button" className="mt-2 w-full text-sm underline" onClick={() => { setError(''); setState('loading'); setRevision(value => value + 1); }}>Thử lại đăng nhập Google</button>}
    <div className="mt-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc dùng email<span className="h-px flex-1 bg-slate-200" /></div>
  </section>;
}
