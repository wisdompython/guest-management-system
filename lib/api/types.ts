export type UserRole = 'super_admin' | 'event_manager' | 'check_in_staff' | 'viewer';

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
  qr_code: string | null;
  pass_image: string | null;
  status: GuestStatus;
  checked_in_at: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  registered_at: string;
}

export interface GuestList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Guest[];
}

export type CreateGuestPayload = Pick<
  Guest,
  'full_name' | 'phone_number' | 'email' | 'ticket_type' | 'table_number' | 'seat_number' | 'event'
>;

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
  whatsapp_enabled: boolean;
  guest_count: number;
  created_at: string;
}

export interface Font {
  id: number;
  name: string;
  file: string;
  uploaded_at: string;
}
