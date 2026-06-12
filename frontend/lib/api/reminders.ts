import { request } from './request';
import type { EventReminder } from './types';

export const remindersApi = {
  getReminders: (eventId: number) =>
    request<EventReminder[]>(`/reminders/?event=${eventId}`),
  createReminder: (data: { event: number; hours_before: number; template_name: string }) =>
    request<EventReminder>('/reminders/', { method: 'POST', body: JSON.stringify(data) }),
  updateReminder: (id: number, data: Partial<EventReminder>) =>
    request<EventReminder>(`/reminders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReminder: (id: number) =>
    request<void>(`/reminders/${id}/`, { method: 'DELETE' }),
  sendReminderNow: (id: number) =>
    request<{ queued: number }>(`/reminders/${id}/send_now/`, { method: 'POST' }),
};
