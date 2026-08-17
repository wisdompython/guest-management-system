import { authApi } from './auth';
import { guestsApi } from './guests';
import { eventsApi, fontsApi } from './events';
import { remindersApi } from './reminders';
import { rsvpApi } from './rsvp';
import { operationsApi } from './operations';

export const api = {
  ...authApi,
  ...guestsApi,
  ...eventsApi,
  ...fontsApi,
  ...remindersApi,
  ...rsvpApi,
  ...operationsApi,
};

export type {
  EventReminder, WhatsAppTemplate, TemplateCategory, Guest, GuestList, GuestListStats,
  Event, CreateGuestPayload, RsvpWorkflow, RsvpWorkflowStatus, RsvpStats, RsvpRecipient,
  RsvpRecipientSegment, RsvpResponseStatus, RsvpInvitationStatus, RsvpPassStatus,
  PaginatedRsvpRecipients, PublicRsvpDetails,
  QueueMonitorSnapshot,
} from './types';
