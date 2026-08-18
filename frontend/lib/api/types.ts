export type UserRole = 'super_admin' | 'event_manager' | 'check_in_staff' | 'scanner' | 'viewer';

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

export interface QueueMonitorSnapshot {
  generated_at: string;
  broker: {
    available: boolean;
    error: string;
    queues: Array<{ name: string; pending: number | null }>;
  };
  workers: {
    available: boolean;
    error: string;
    workers: Array<{
      name: string;
      online: boolean;
      queues: string[];
      concurrency: number | null;
      active: number;
      reserved: number;
      scheduled: number;
    }>;
    tasks: Array<{
      id: string;
      name: string;
      worker: string;
      state: 'active' | 'reserved' | 'scheduled';
      queue: string;
      time_start: number | null;
      eta: string | null;
    }>;
  };
  periodic_dispatchers: Array<{
    name: string;
    task: string;
    enabled: boolean;
    last_run_at: string | null;
    seconds_since_last_run: number | null;
    overdue_seconds: number | null;
    total_runs: number;
    healthy: boolean;
  }>;
  recent_tasks: Array<{
    id: string;
    name: string;
    status: string;
    worker: string;
    created_at: string;
    started_at: string | null;
    finished_at: string;
    runtime_ms: number | null;
    error: string;
  }>;
  deliveries: Array<{
    recipient_id: number;
    workflow_id: number;
    event: string;
    guest: string;
    phone: string;
    channel: 'invitation' | 'pass';
    status: 'queued' | 'sending' | 'failed';
    template: string;
    queued_at: string | null;
    retries: number;
    error: string;
    updated_at: string;
  }>;
  message_rate: {
    configured_per_worker_per_minute: number;
    workers_consuming_messages: number;
    estimated_global_ceiling_per_minute: number;
  };
  send_budget: {
    daily_limit: number;
    remaining: number;
    window_hours: number;
  };
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
  aso_ebi_requested: boolean;
  aso_ebi_quantity: number;
  plus_one_attending: boolean;
  has_named_plus_one: boolean;
  plus_one_guest_id: string | null;
  named_plus_one_name: string;
  is_plus_one: boolean;
  primary_guest_name: string;
  celebrant_name: string;
  preferences_link: string;
  preferences_submitted_at: string | null;
  plus_one_checked_in: boolean;
  plus_one_checked_in_at: string | null;
  qr_code: string | null;
  pass_image: string | null;
  status: GuestStatus;
  checked_in_at: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  scheduled_send_at: string | null;
  registered_at: string;
}

export interface GuestListStats {
  checked_in: number;
  pending: number;
  wa_sent: number;
  wa_unsent: number;
}

export interface GuestList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Guest[];
  stats: GuestListStats;
}

export type CreateGuestPayload = Pick<
  Guest,
  'full_name' | 'phone_number' | 'email' | 'ticket_type' | 'table_number' | 'seat_number' | 'aso_ebi_requested' | 'aso_ebi_quantity' | 'plus_one_attending' | 'celebrant_name' | 'event'
> & {
  scheduled_send_at?: string | null;
  plus_one_full_name?: string;
  plus_one_phone_number?: string;
};

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
  rsvp_message: string;
  color_of_day: string;
  rsvp_primary_color: string;
  rsvp_background_color: string;
  rsvp_card_color: string;
  rsvp_text_color: string;
  rsvp_background_image: string | null;
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
  collect_aso_ebi: boolean;
  allow_plus_one: boolean;
  preferences_enabled: boolean;
  collect_celebrant: boolean;
  celebrant_options: string[];
  whatsapp_enabled: boolean;
  rsvp_enabled: boolean;
  whatsapp_template: number | null;
  whatsapp_template_name: string | null;
  pass_send_at: string | null;
  rsvp_workflow_id: number | null;
  is_ended: boolean;
  guest_count: number;
  checked_in_count: number;
  confirmed_count: number;
  plus_one_count: number;
  plus_one_checked_in_count: number;
  total_checked_in_count: number;
  estimated_guest_count: number;
  aso_ebi_request_count: number;
  aso_ebi_quantity: number;
  preferences_submitted_count: number;
  celebrant_breakdown: Array<{
    name: string;
    guests: number;
    plus_ones: number;
    estimated_guests: number;
  }>;
  created_at: string;
}

export interface Font {
  id: number;
  name: string;
  file: string;
  uploaded_at: string;
}

export interface EventReminder {
  id: number;
  event: number;
  hours_before: number;
  template_name: string;
  is_active: boolean;
  created_at: string;
  logs_sent: number;
  includes_event_pass: boolean;
}

export interface TemplateCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface WhatsAppTemplate {
  id: number;
  name: string;
  display_name: string;
  description: string;
  category: number | null;
  category_name: string | null;
  body_text: string;
  body_params: string[];
  has_header_image: boolean;
  is_active: boolean;
  created_at: string;
}

export type RsvpWorkflowStatus = 'draft' | 'active' | 'paused' | 'completed';
export type RsvpResponseStatus = 'awaiting' | 'confirmed' | 'declined';
export type RsvpInvitationStatus = 'not_sent' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type RsvpPassStatus = 'held' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'not_issued';

export interface RsvpStats {
  invited: number;
  awaiting: number;
  confirmed: number;
  declined: number;
  invitation_delivered: number;
  invitation_failed: number;
  passes_sent: number;
  passes_failed: number;
  delivery_failed: number;
  confirmed_no_pass: number;
  aso_ebi_requests: number;
  aso_ebi_quantity: number;
  plus_ones: number;
  estimated_guests: number;
  response_rate: number;
  confirmation_rate: number;
}

export interface RsvpWorkflow {
  id: number;
  event: number;
  event_name: string;
  event_date: string;
  invitation_template: number | null;
  invitation_template_name: string | null;
  pass_template: number | null;
  pass_template_name: string | null;
  invitation_design: string | null;
  invitation_name_zone_x: number | null;
  invitation_name_zone_y: number | null;
  invitation_name_zone_w: number | null;
  invitation_name_zone_h: number | null;
  status: RsvpWorkflowStatus;
  response_deadline: string | null;
  invitation_send_at: string | null;
  auto_send_pass: boolean;
  pass_send_at: string | null;
  launched_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  stats: RsvpStats;
}

export interface RsvpRecipient {
  id: number;
  workflow: number;
  guest: string;
  guest_name: string;
  event_name: string;
  ticket_type: string;
  table_number: string;
  aso_ebi_requested: boolean;
  aso_ebi_quantity: number;
  plus_one_attending: boolean;
  is_plus_one: boolean;
  primary_guest_name: string;
  celebrant_name: string;
  has_phone: boolean;
  response_status: RsvpResponseStatus;
  invitation_status: RsvpInvitationStatus;
  invitation_image: string | null;
  pass_status: RsvpPassStatus;
  invitation_sent_at: string | null;
  invitation_queued_at: string | null;
  responded_at: string | null;
  pass_queued_at: string | null;
  reminder_count: number;
  last_reminded_at: string | null;
  last_error: string;
  invitation_error: string;
  pass_error: string;
  invitation_auto_retries: number;
  pass_auto_retries: number;
  invitation_last_template_name: string;
  pass_last_template_name: string;
  created_at: string;
  updated_at: string;
}

export type RsvpRecipientSegment =
  | 'invited_awaiting'
  | 'confirmed_with_pass'
  | 'confirmed_no_pass'
  | 'delivery_failed';

export interface PaginatedRsvpRecipients {
  count: number;
  next: string | null;
  previous: string | null;
  results: RsvpRecipient[];
}

export interface PublicRsvpDetails {
  guest_name: string;
  event_name: string;
  event_date: string;
  venue: string;
  rsvp_message: string;
  color_of_day: string;
  rsvp_primary_color: string;
  rsvp_background_color: string;
  rsvp_card_color: string;
  rsvp_text_color: string;
  rsvp_background_image: string | null;
  collect_aso_ebi: boolean;
  allow_plus_one: boolean;
  collect_celebrant: boolean;
  celebrant_options: string[];
  aso_ebi_requested: boolean;
  aso_ebi_quantity: number;
  plus_one_attending: boolean;
  plus_one_full_name: string;
  plus_one_phone_number: string;
  celebrant_name: string;
  invitation_image: string | null;
  response_deadline: string | null;
  response_status: RsvpResponseStatus;
  responded_at: string | null;
  can_respond: boolean;
  closed_reason: 'deadline_passed' | 'workflow_inactive' | 'already_responded' | null;
}

export interface GuestPreferencesDetails {
  guest_name: string;
  event_name: string;
  event_date: string;
  venue: string;
  allow_plus_one: boolean;
  collect_aso_ebi: boolean;
  collect_celebrant: boolean;
  celebrant_options: string[];
  plus_one_attending: boolean;
  plus_one_full_name: string;
  plus_one_phone_number: string;
  aso_ebi_requested: boolean;
  aso_ebi_quantity: number;
  celebrant_name: string;
  submitted_at: string | null;
  can_respond: boolean;
}
