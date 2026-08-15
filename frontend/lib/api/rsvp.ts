import { request } from './request'
import type {
  PaginatedRsvpRecipients,
  PublicRsvpDetails,
  RsvpInvitationStatus,
  RsvpPassStatus,
  RsvpRecipient,
  RsvpRecipientSegment,
  RsvpResponseStatus,
  RsvpStats,
  RsvpWorkflow,
  RsvpWorkflowStatus,
} from './types'

function collection<T>(data: { results: T[] } | T[]): T[] {
  return Array.isArray(data) ? data : data.results ?? []
}

export interface CreateRsvpWorkflowPayload {
  event: number
  invitation_template: number | null
  pass_template: number | null
  response_deadline: string | null
  invitation_send_at: string | null
  auto_send_pass: boolean
  pass_send_at: string | null
  invitation_name_zone_x?: number
  invitation_name_zone_y?: number
  invitation_name_zone_w?: number
  invitation_name_zone_h?: number
}

export interface RsvpRecipientFilters {
  workflow: number
  page?: number
  search?: string
  response_status?: RsvpResponseStatus
  invitation_status?: RsvpInvitationStatus
  pass_status?: RsvpPassStatus
  segment?: RsvpRecipientSegment
}

export const rsvpApi = {
  getRsvpWorkflows: (filters: { status?: RsvpWorkflowStatus; search?: string } = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    const query = params.toString()
    return request<{ results: RsvpWorkflow[] } | RsvpWorkflow[]>(`/rsvp/workflows/${query ? `?${query}` : ''}`).then(collection)
  },
  getRsvpWorkflow: (id: number) => request<RsvpWorkflow>(`/rsvp/workflows/${id}/`),
  createRsvpWorkflow: (payload: CreateRsvpWorkflowPayload | FormData) =>
    request<RsvpWorkflow>('/rsvp/workflows/', { method: 'POST', body: payload instanceof FormData ? payload : JSON.stringify(payload) }),
  updateRsvpWorkflow: (id: number, payload: Partial<CreateRsvpWorkflowPayload> | FormData) =>
    request<RsvpWorkflow>(`/rsvp/workflows/${id}/`, { method: 'PATCH', body: payload instanceof FormData ? payload : JSON.stringify(payload) }),
  deleteRsvpWorkflow: (id: number) =>
    request<void>(`/rsvp/workflows/${id}/`, { method: 'DELETE' }),
  populateRsvpRecipients: (id: number, guestIds?: string[]) =>
    request<{ added: number; total: number }>(`/rsvp/workflows/${id}/populate-recipients/`, {
      method: 'POST',
      body: JSON.stringify(guestIds ? { guest_ids: guestIds } : {}),
    }),
  launchRsvpWorkflow: (id: number) =>
    request<{ launched: boolean; scheduled: boolean; task_id: string | null; invitation_send_at?: string }>(`/rsvp/workflows/${id}/launch/`, { method: 'POST' }),
  pauseRsvpWorkflow: (id: number) =>
    request<RsvpWorkflow>(`/rsvp/workflows/${id}/pause/`, { method: 'POST' }),
  resumeRsvpWorkflow: (id: number) =>
    request<RsvpWorkflow>(`/rsvp/workflows/${id}/resume/`, { method: 'POST' }),
  completeRsvpWorkflow: (id: number) =>
    request<RsvpWorkflow>(`/rsvp/workflows/${id}/complete/`, { method: 'POST' }),
  remindAwaitingRsvpGuests: (id: number) =>
    request<{ queued: number }>(`/rsvp/workflows/${id}/remind-awaiting/`, { method: 'POST' }),
  getRsvpStats: (id: number) => request<RsvpStats>(`/rsvp/workflows/${id}/stats/`),
  getRsvpRecipients: (filters: RsvpRecipientFilters) => {
    const params = new URLSearchParams({ workflow: String(filters.workflow) })
    if (filters.page) params.set('page', String(filters.page))
    if (filters.search) params.set('search', filters.search)
    if (filters.response_status) params.set('response_status', filters.response_status)
    if (filters.invitation_status) params.set('invitation_status', filters.invitation_status)
    if (filters.pass_status) params.set('pass_status', filters.pass_status)
    if (filters.segment) params.set('segment', filters.segment)
    return request<PaginatedRsvpRecipients>(`/rsvp/recipients/?${params}`)
  },
  retryRsvpInvitation: (recipientId: number) =>
    request<{ queued: boolean }>(`/rsvp/recipients/${recipientId}/retry-invitation/`, { method: 'POST' }),
  retryRsvpPass: (recipientId: number) =>
    request<{ queued: boolean }>(`/rsvp/recipients/${recipientId}/retry-pass/`, { method: 'POST' }),
  bulkRetryRsvpRecipients: (recipientIds: number[], kind: 'invitation' | 'pass') =>
    request<{ queued: number; skipped_cooldown: number; skipped_ineligible: number }>(
      '/rsvp/recipients/bulk-retry/',
      { method: 'POST', body: JSON.stringify({ recipient_ids: recipientIds, kind }) },
    ),
  getPublicRsvp: (token: string) =>
    request<PublicRsvpDetails>(`/rsvp/respond/${token}/`),
  submitPublicRsvp: (token: string, answer: 'yes' | 'no', asoEbiRequested = false, asoEbiQuantity = 0) =>
    request<{
      accepted: boolean
      already_responded?: boolean
      response_status: RsvpResponseStatus
      pass_queued?: boolean
    }>(`/rsvp/respond/${token}/`, {
      method: 'POST',
      body: JSON.stringify({
        answer,
        aso_ebi_requested: answer === 'yes' && asoEbiRequested,
        aso_ebi_quantity: answer === 'yes' && asoEbiRequested ? asoEbiQuantity : 0,
      }),
    }),
}
