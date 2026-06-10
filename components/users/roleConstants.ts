import type { UserRole } from '@/lib/api'

export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin',    label: 'Super Admin' },
  { value: 'event_manager',  label: 'Event Manager' },
  { value: 'check_in_staff', label: 'Check-In Staff' },
  { value: 'viewer',         label: 'Viewer' },
]

export const ROLE_STYLE: Record<UserRole, { color: string; bg: string }> = {
  super_admin:    { color: '#92400e', bg: '#fef3c7' },
  event_manager:  { color: '#1e40af', bg: '#dbeafe' },
  check_in_staff: { color: '#065f46', bg: '#d1fae5' },
  viewer:         { color: '#374151', bg: '#f3f4f6' },
}

export const ROLE_DESC: Record<UserRole, string> = {
  super_admin:    'Full access — manage users, roles, events, guests, settings.',
  event_manager:  'Create/edit events and manage guests. Cannot manage users.',
  check_in_staff: 'Can perform check-ins and view guest list. Read-only otherwise.',
  viewer:         'Read-only access across everything. No mutations allowed.',
}
