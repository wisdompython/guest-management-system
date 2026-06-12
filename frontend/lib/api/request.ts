export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const AUTH_BASE = BASE_URL.replace(/\/api$/, '/api/auth');

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
}

async function ensureCsrf(): Promise<void> {
  if (getCsrfToken()) return
  await fetch(`${AUTH_BASE}/csrf/`, { credentials: 'include' })
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    await ensureCsrf()
  }
  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = {
    'X-CSRFToken': getCsrfToken(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> ?? {}),
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T
  return res.json();
}
