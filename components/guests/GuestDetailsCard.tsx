'use client'

import { Guest } from '@/lib/api'

interface Props {
  guest: Guest
}

export function GuestDetailsCard({ guest }: Props) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Guest Details</h2>
        </div>
        <dl className="divide-y divide-[var(--line)]">
          {[
            { label: 'Full Name',   value: guest.full_name },
            { label: 'Phone',       value: guest.phone_number },
            { label: 'Email',       value: guest.email || '—' },
            { label: 'Event',       value: guest.event_name || '—' },
            { label: 'Ticket',      value: guest.ticket_type.toUpperCase() },
            { label: 'Table',       value: guest.table_number || '—' },
            { label: 'Seat',        value: guest.seat_number || '—' },
            { label: 'Registered',  value: new Date(guest.registered_at).toLocaleString() },
            { label: 'Checked In',  value: guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 px-6 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] w-28 flex-shrink-0">{label}</dt>
              <dd className="text-sm text-[var(--ink)] text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={`rounded-[20px] border p-4 flex items-center gap-4 ${
        guest.whatsapp_sent ? 'border-emerald-800 bg-emerald-900/20' : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]'
      }`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
          guest.whatsapp_sent ? 'bg-emerald-900/40' : 'bg-[var(--bg)]'
        }`}>💬</div>
        <div>
          <p className={`text-sm font-semibold ${guest.whatsapp_sent ? 'text-emerald-400' : 'text-[var(--muted)]'}`}>
            {guest.whatsapp_sent ? 'Pass sent via WhatsApp' : 'WhatsApp pass not sent yet'}
          </p>
          {guest.whatsapp_sent_at && (
            <p className="text-xs text-emerald-600 mt-0.5">Sent {new Date(guest.whatsapp_sent_at).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  )
}
