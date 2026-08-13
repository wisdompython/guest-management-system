export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> ?? {}),
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    // Session expired — redirect to login from any page
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?session=expired'
    }
    throw new Error('Session expired. Please log in again.')
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const firstFieldError = Object.values(error).find((value) => Array.isArray(value) && value.length)
    throw new Error(error.detail ?? (Array.isArray(firstFieldError) ? String(firstFieldError[0]) : `Request failed: ${res.status}`));
  }
  if (res.status === 204) return undefined as T
  return res.json();
}
