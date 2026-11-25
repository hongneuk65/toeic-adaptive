import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export const GITHUB_RETURN_KEY = 'toeic:github-return-to';

/** Nút "Đăng nhập bằng GitHub"; ẩn khi máy chủ chưa cấu hình GitHub OAuth. */
export function GithubSignIn({ returnTo }: { returnTo?: unknown }) {
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api<{ enabled: boolean; authorizeUrl?: string }>('/auth/github/config', { signal: controller.signal })
      .then(res => setAuthorizeUrl(res.enabled && res.authorizeUrl?.startsWith('https://github.com/') ? res.authorizeUrl : null))
      .catch(() => setAuthorizeUrl(null));
    return () => controller.abort();
  }, []);
  if (!authorizeUrl) return null;
  return <button type="button" className="secondary-button mb-4 w-full" onClick={() => {
    try { if (typeof returnTo === 'string') sessionStorage.setItem(GITHUB_RETURN_KEY, returnTo); } catch { /* không bắt buộc */ }
    window.location.assign(authorizeUrl);
  }}>Đăng nhập bằng GitHub</button>;
}
