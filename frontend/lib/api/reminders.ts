import { request } from './request';
import type { EventReminder, WhatsAppTemplate, TemplateCategory } from './types';

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
  getWhatsAppTemplates: async (params?: Record<string, string>): Promise<WhatsAppTemplate[]> => {
    const base = new URLSearchParams({ active_only: '1', ...params }).toString()
    const res = await request<WhatsAppTemplate[] | { results: WhatsAppTemplate[] }>(`/whatsapp-templates/?${base}`)
    return Array.isArray(res) ? res : res.results
  },
  getWhatsAppTemplatesPaged: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ count: number; next: string | null; previous: string | null; results: WhatsAppTemplate[] }>(`/whatsapp-templates/${qs}`)
  },
  getAvailableTemplateVars: () =>
    request<{ key: string; label: string }[]>('/whatsapp-templates/available-vars/'),
  createWhatsAppTemplate: (data: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'category_name'>) =>
    request<WhatsAppTemplate>('/whatsapp-templates/', { method: 'POST', body: JSON.stringify(data) }),
  updateWhatsAppTemplate: (id: number, data: Partial<Omit<WhatsAppTemplate, 'id' | 'created_at' | 'category_name'>>) =>
    request<WhatsAppTemplate>(`/whatsapp-templates/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWhatsAppTemplate: (id: number) =>
    request<void>(`/whatsapp-templates/${id}/`, { method: 'DELETE' }),
  getTemplateCategories: async (): Promise<TemplateCategory[]> => {
    const res = await request<TemplateCategory[] | { results: TemplateCategory[] }>('/template-categories/')
    return Array.isArray(res) ? res : res.results
  },
  createTemplateCategory: (name: string) =>
    request<TemplateCategory>('/template-categories/', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteTemplateCategory: (id: number) =>
    request<void>(`/template-categories/${id}/`, { method: 'DELETE' }),
};
