const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const AUTH_EXPIRED_EVENT = 'toeic:auth-expired';
export class ApiError extends Error {
  readonly status: number;
  readonly retryAfter?: string | null;
  constructor(message: string, status: number, retryAfter?: string | null) { super(message); this.name = 'ApiError'; this.status = status; this.retryAfter = retryAfter; }
}

export function getErrorMessage(error: unknown, fallback = 'Không thể thực hiện yêu cầu'): string {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) return 'Chưa kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.';
  return error instanceof Error ? error.message : fallback;
}

async function checkResponse(response: Response, requestToken: string | null) {
  if (response.ok) return;
  const value: unknown = await response.json().catch(() => ({}));
  const data = value && typeof value === 'object' ? value as { message?: unknown } : {};
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  if (response.status === 401 && requestToken && localStorage.getItem('accessToken') === requestToken) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { token: requestToken } }));
  }
  throw new ApiError(response.status === 401 && requestToken ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.' : typeof message === 'string' && message ? message : `Lỗi yêu cầu: ${response.status}`, response.status, response.headers.get('Retry-After'));
}

function requestHeaders(initial?: HeadersInit) {
  const headers = new Headers(initial);
  headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem('accessToken');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export async function api<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, ...request } = options;
  const config: RequestInit = {
    ...request,
    headers: requestHeaders(options.headers),
  };
  if (data !== undefined) config.body = JSON.stringify(data);

  const res = await fetch(`${BASE_URL}${endpoint}`, config);

  await checkResponse(res, new Headers(config.headers).get('Authorization')?.replace(/^Bearer /, '') ?? null);
  return res.status === 204 ? undefined as T : res.json();
}

export async function apiStream(endpoint: string, data: unknown, signal?: AbortSignal): Promise<Response> {
  const headers = requestHeaders();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    signal,
  });

  await checkResponse(response, headers.get('Authorization')?.replace(/^Bearer /, '') ?? null);

  if (!response.body) {
    throw new Error('Máy chủ không trả về luồng dữ liệu cho câu trả lời AI.');
  }

  return response;
}

export async function apiUpload<T>(endpoint: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const headers = new Headers(); const token = localStorage.getItem('accessToken');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const body = new FormData(); body.append('file', file);
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  const response = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers, body });
  await checkResponse(response, token); return response.json();
}
