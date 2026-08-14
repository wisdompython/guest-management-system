import { authApi } from './auth';
import { guestsApi } from './guests';
import { eventsApi, fontsApi } from './events';
import { remindersApi } from './reminders';
import { rsvpApi } from './rsvp';

export const api = {
  ...authApi,
  ...guestsApi,
  ...eventsApi,
  ...fontsApi,
  ...remindersApi,
  ...rsvpApi,
};

export type {
  EventReminder, WhatsAppTemplate, TemplateCategory, Guest, GuestList, GuestListStats,
  Event, CreateGuestPayload, RsvpWorkflow, RsvpWorkflowStatus, RsvpStats, RsvpRecipient,
  RsvpRecipientSegment, RsvpResponseStatus, RsvpInvitationStatus, RsvpPassStatus,
  PaginatedRsvpRecipients, PublicRsvpDetails,
} from './types';
