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
  'full_name' | 'phone_number' | 'email' | 'ticket_type' | 'table_number' | 'seat_number' | 'aso_ebi_requested' | 'aso_ebi_quantity' | 'event'
> & {
  scheduled_send_at?: string | null;
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
  whatsapp_enabled: boolean;
  whatsapp_template: number | null;
  whatsapp_template_name: string | null;
  pass_send_at: string | null;
  rsvp_workflow_id: number | null;
  is_ended: boolean;
  guest_count: number;
  checked_in_count: number;
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
  aso_ebi_requests: number;
  aso_ebi_quantity: number;
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
  has_phone: boolean;
  response_status: RsvpResponseStatus;
  invitation_status: RsvpInvitationStatus;
  pass_status: RsvpPassStatus;
  invitation_sent_at: string | null;
  responded_at: string | null;
  pass_queued_at: string | null;
  reminder_count: number;
  last_reminded_at: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
}

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
  collect_aso_ebi: boolean;
  aso_ebi_requested: boolean;
  aso_ebi_quantity: number;
  response_deadline: string | null;
  response_status: RsvpResponseStatus;
  responded_at: string | null;
  can_respond: boolean;
  closed_reason: 'deadline_passed' | 'workflow_inactive' | 'already_responded' | null;
}
