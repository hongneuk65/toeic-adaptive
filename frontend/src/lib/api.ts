const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function getErrorMessage(error: unknown, fallback = 'Không thể thực hiện yêu cầu'): string {
  return error instanceof Error ? error.message : fallback;
}

async function checkResponse(response: Response) {
  if (response.ok) return;
  const data = await response.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  throw new Error(message || `Lỗi yêu cầu: ${response.status}`);
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

  await checkResponse(res);
  return res.status === 204 ? undefined as T : res.json();
}

export async function apiStream(endpoint: string, data: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify(data),
    signal,
  });

  await checkResponse(response);

  if (!response.body) {
    throw new Error('Máy chủ không trả về luồng dữ liệu cho câu trả lời AI.');
  }

  return response;
}
