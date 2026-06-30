'use client'

import { Event } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted-2)]'
const select = 'w-full rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#1a2030] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const labelCls = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

const OPTIONAL_FIELDS = [
  { key: 'phone_number', label: 'Phone Number', type: 'tel',   placeholder: '+234 800 000 0000' },
  { key: 'email',        label: 'Email',         type: 'email', placeholder: 'optional' },
  { key: 'table_number', label: 'Table Number',  type: 'text',  placeholder: 'optional' },
  { key: 'seat_number',  label: 'Seat Number',   type: 'text',  placeholder: 'optional' },
] as const

interface Props {
  events: Event[]
  selectedEvent: Event | null
  submitting: boolean
  uniqueRequired: string[]
  ticketOptions: { value: string; label: string }[]
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onEventChange: (id: string) => void
  onCancel: () => void
}

export function GuestForm({
  events, selectedEvent, submitting, uniqueRequired, ticketOptions,
  onSubmit, onEventChange, onCancel,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[var(--line)] px-6 py-4">
        <h2 data-tour="guest-form-header" className="text-sm font-semibold text-[var(--ink)]">Guest information</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Fields marked * are required.</p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Full Name *</label>
          <input data-tour="guest-name-field" name="full_name" type="text" required placeholder="e.g. Adaeze Okonkwo" className={field} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Event *</label>
          <select data-tour="guest-event-select" name="event" required className={select} onChange={(e) => onEventChange(e.target.value)}>
            <option value="">Select an event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Ticket Type</label>
          <select name="ticket_type" className={select}>
            {ticketOptions.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {OPTIONAL_FIELDS.map(({ key, label, type, placeholder }) => {
          const isRequired = uniqueRequired.includes(key)
          return (
            <div key={key}>
              <label className={labelCls}>
                {label} {isRequired ? '*' : <span className="normal-case font-normal tracking-normal" style={{ color: 'var(--muted-2)' }}>(optional)</span>}
              </label>
              <input name={key} type={type} required={isRequired}
                placeholder={isRequired ? placeholder.replace('optional', '') : placeholder}
                className={field} />
            </div>
          )
        })}
      </div>

      {selectedEvent && (
        <div className="mx-6 mb-4 flex flex-wrap gap-2 rounded-[10px] px-4 py-3 text-xs"
          style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>Event settings:</span>
          <span>WhatsApp: <b>{selectedEvent.whatsapp_enabled ? 'On' : 'Off'}</b></span>
          <span>·</span>
          <span>Ticket types: <b>{ticketOptions.map(t => t.label).join(', ')}</b></span>
        </div>
      )}

      <div className="flex gap-3 border-t border-[var(--line)] px-6 py-4">
        <button data-tour="guest-submit-button" type="submit" disabled={submitting}
          className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">
          {submitting ? 'Adding…' : 'Add Guest'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]">
          Cancel
        </button>
      </div>
    </form>
  )
}
