const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<AuthUser>('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request<void>('/auth/logout/', { method: 'POST' }),
  me: () =>
    request<AuthUser>('/auth/me/'),

  // Users (super admin only)
  getUsers: () =>
    request<AuthUser[]>('/auth/users/'),
  createUser: (data: CreateUserPayload) =>
    request<AuthUser>('/auth/users/', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<Pick<AuthUser, 'email' | 'first_name' | 'last_name' | 'role' | 'is_active'>>) =>
    request<AuthUser>(`/auth/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    request<void>(`/auth/users/${id}/`, { method: 'DELETE' }),

  // Guests
  getGuests: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<GuestList>(`/guests/${qs}`);
  },
  getGuest: (id: string) => request<Guest>(`/guests/${id}/`),
  createGuest: (data: CreateGuestPayload) =>
    request<Guest>('/guests/', { method: 'POST', body: JSON.stringify(data) }),
  deleteGuest: (id: string) =>
    request<void>(`/guests/${id}/`, { method: 'DELETE' }),
  checkIn: (id: string) =>
    request<Guest>(`/guests/${id}/check_in/`, { method: 'POST' }),
  regenerateAssets: (id: string) =>
    request<{ qr_generated: boolean; pass_generated: boolean; guest: Guest }>(`/guests/${id}/regenerate_assets/`, { method: 'POST' }),
  scanGuest: (token: string) =>
    request<Guest>(`/guests/scan/?token=${encodeURIComponent(token)}`),

  // Events — normalise paginated or plain-array response to Event[]
  getEvents: () =>
    request<{ results: Event[] } | Event[]>('/events/').then((data) =>
      Array.isArray(data) ? data : data.results ?? []
    ),
  getEvent: (id: number) => request<Event>(`/events/${id}/`),
  createEvent: (data: Partial<Event>) =>
    request<Event>('/events/', { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id: number) =>
    request<void>(`/events/${id}/`, { method: 'DELETE' }),

  // Fonts
  getFonts: () =>
    request<{ results: Font[] } | Font[]>('/fonts/').then((data) =>
      Array.isArray(data) ? data : data.results ?? []
    ),
  deleteFont: (id: number) =>
    request<void>(`/fonts/${id}/`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type UserRole = 'super_admin' | 'event_manager' | 'check_in_staff' | 'viewer';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  password: string;
}
export type TicketType = string;
export type GuestStatus = 'registered' | 'checked_in';

export interface Guest {
  id: string;
  event: number | null;
  event_name: string;
  full_name: string;
  phone_number: string;
  email: string;
  ticket_type: TicketType;
  table_number: string;
  seat_number: string;
  qr_code: string | null;
  pass_image: string | null;
  status: GuestStatus;
  checked_in_at: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  registered_at: string;
}

export interface GuestList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Guest[];
}

export type CreateGuestPayload = Pick<
  Guest,
  'full_name' | 'phone_number' | 'email' | 'ticket_type' | 'table_number' | 'seat_number' | 'event'
>;

export interface TicketTypeDef {
  value: string;
  label: string;
}

export interface Event {
  id: number;
  name: string;
  date: string;
  venue: string;
  description: string;
  design_template: string | null;
  qr_zone_x: number | null;
  qr_zone_y: number | null;
  qr_zone_w: number | null;
  qr_zone_h: number | null;
  name_zone_x: number | null;
  name_zone_y: number | null;
  name_zone_w: number | null;
  name_zone_h: number | null;
  name_font: number | null;
  name_font_name: string | null;
  name_font_color: string;
  name_font_size_fraction: number;
  qr_bg_color: string;
  ticket_types: TicketTypeDef[];
  required_fields: string[];
  whatsapp_enabled: boolean;
  guest_count: number;
  created_at: string;
}

export interface Font {
  id: number;
  name: string;
  file: string;
  uploaded_at: string;
}
