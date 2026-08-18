import { request } from './request';
import type { Guest, GuestList, CreateGuestPayload, GuestPreferencesDetails } from './types';

export const guestsApi = {
  getGuests: (params?: Record<string, string>, signal?: AbortSignal) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<GuestList>(`/guests/${qs}`, signal ? { signal } : undefined);
  },
  getGuest: (id: string) => request<Guest>(`/guests/${id}/`),
  createGuest: (data: CreateGuestPayload) =>
    request<Guest>('/guests/', { method: 'POST', body: JSON.stringify(data) }),
  deleteGuest: (id: string) =>
    request<void>(`/guests/${id}/`, { method: 'DELETE' }),
  bulkDeleteGuests: (ids: string[]) =>
    request<{ deleted: number }>('/guests/bulk-delete/', { method: 'POST', body: JSON.stringify({ ids }) }),
  deleteAllGuests: (eventId: number) =>
    request<{ deleted: number }>('/guests/bulk-delete/', { method: 'POST', body: JSON.stringify({ event_id: eventId }) }),
  checkIn: (id: string, target: 'guest' | 'plus_one' | 'both' = 'guest') =>
    request<Guest>(`/guests/${id}/check_in/`, { method: 'POST', body: JSON.stringify({ target }) }),
  regenerateAssets: (id: string) =>
    request<{ queued: boolean; guest_id: string }>(`/guests/${id}/regenerate_assets/`, { method: 'POST' }),
  sendWhatsApp: (id: string) =>
    request<{ queued: boolean; guest_id: string }>(`/guests/${id}/send_whatsapp/`, { method: 'POST' }),
  bulkRegenerateAssets: (eventId: number) =>
    request<{ queued: number; event_id: number }>('/guests/bulk_regenerate_assets/', { method: 'POST', body: JSON.stringify({ event_id: eventId }) }),
  bulkSendWhatsApp: (eventId: number, resend = false) =>
    request<{ queued: boolean; event_id: number; task_id: string }>('/guests/bulk_send_whatsapp/', { method: 'POST', body: JSON.stringify({ event_id: eventId, resend }) }),
  sendMessage: (id: string, message: string) =>
    request<{ sent: boolean }>(`/guests/${id}/send_message/`, { method: 'POST', body: JSON.stringify({ message }) }),
  scanGuest: (token: string) =>
    request<Guest>(`/guests/scan/?token=${encodeURIComponent(token)}`),
  getGuestPreferences: (token: string) =>
    request<GuestPreferencesDetails>(`/guest-preferences/${token}/`),
  submitGuestPreferences: (token: string, payload: {
    plus_one_attending: boolean
    plus_one_full_name: string
    plus_one_phone_number: string
    aso_ebi_requested: boolean
    aso_ebi_quantity: number
    celebrant_name: string
  }) => request<{
    saved: boolean
    submitted_at: string
  }>(`/guest-preferences/${token}/`, { method: 'POST', body: JSON.stringify(payload) }),
};
