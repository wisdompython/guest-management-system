import { authApi } from './auth';
import { guestsApi } from './guests';
import { eventsApi, fontsApi } from './events';
import { remindersApi } from './reminders';

export const api = {
  ...authApi,
  ...guestsApi,
  ...eventsApi,
  ...fontsApi,
  ...remindersApi,
};

export type { EventReminder, WhatsAppTemplate, TemplateCategory, Guest, GuestList, GuestListStats, Event, CreateGuestPayload } from './types';
