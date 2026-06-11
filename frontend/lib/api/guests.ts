import { request } from './request';
import type { Guest, GuestList, CreateGuestPayload } from './types';

export const guestsApi = {
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
    request<{ queued: boolean; guest_id: string }>(`/guests/${id}/regenerate_assets/`, { method: 'POST' }),
  sendWhatsApp: (id: string) =>
    request<{ sent: boolean; guest: Guest }>(`/guests/${id}/send_whatsapp/`, { method: 'POST' }),
  bulkSendWhatsApp: (eventId: number, resend = false) =>
    request<{ sent: number; failed: number; failures: { guest_id: string; name: string }[] }>('/guests/bulk_send_whatsapp/', { method: 'POST', body: JSON.stringify({ event_id: eventId, resend }) }),
  sendMessage: (id: string, message: string) =>
    request<{ sent: boolean }>(`/guests/${id}/send_message/`, { method: 'POST', body: JSON.stringify({ message }) }),
  scanGuest: (token: string) =>
    request<Guest>(`/guests/scan/?token=${encodeURIComponent(token)}`),
};
