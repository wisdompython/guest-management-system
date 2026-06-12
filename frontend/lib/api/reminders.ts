import { request } from './request';
import type { EventReminder, WhatsAppTemplate } from './types';

export const remindersApi = {
  getReminders: async (eventId: number): Promise<EventReminder[]> => {
    const res = await request<EventReminder[] | { results: EventReminder[] }>(`/reminders/?event=${eventId}`)
    return Array.isArray(res) ? res : res.results
  },
  createReminder: (data: { event: number; hours_before: number; template_name: string }) =>
    request<EventReminder>('/reminders/', { method: 'POST', body: JSON.stringify(data) }),
  updateReminder: (id: number, data: Partial<EventReminder>) =>
    request<EventReminder>(`/reminders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReminder: (id: number) =>
    request<void>(`/reminders/${id}/`, { method: 'DELETE' }),
  sendReminderNow: (id: number) =>
    request<{ queued: number }>(`/reminders/${id}/send_now/`, { method: 'POST' }),
  getWhatsAppTemplates: async (): Promise<WhatsAppTemplate[]> => {
    const res = await request<WhatsAppTemplate[] | { results: WhatsAppTemplate[] }>('/whatsapp-templates/?active_only=1')
    return Array.isArray(res) ? res : res.results
  },
  createWhatsAppTemplate: (data: Omit<WhatsAppTemplate, 'id' | 'created_at'>) =>
    request<WhatsAppTemplate>('/whatsapp-templates/', { method: 'POST', body: JSON.stringify(data) }),
  deleteWhatsAppTemplate: (id: number) =>
    request<void>(`/whatsapp-templates/${id}/`, { method: 'DELETE' }),
};
