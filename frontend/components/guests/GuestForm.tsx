'use client'

import { useEffect, useState } from 'react'

import { Event } from '@/lib/api'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import AsoEbiYardSelector from '@/components/rsvp/AsoEbiYardSelector'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-[var(--chip)] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted-2)]'
const select = 'w-full rounded-[12px] border border-[var(--line)] bg-[var(--field)] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
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
  const [asoEbiRequested, setAsoEbiRequested] = useState(false)
  const [asoEbiYards, setAsoEbiYards] = useState(2)

  useEffect(() => {
    setAsoEbiRequested(false)
    setAsoEbiYards(2)
  }, [selectedEvent?.id])

  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--chip)]">
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
          <SearchableSelect
            data-tour="guest-event-select"
            options={events.map((ev) => ({
              value: String(ev.id),
              label: ev.name,
              sublabel: ev.date ? new Date(ev.date).toLocaleDateString() : undefined,
            }))}
            value={selectedEvent ? String(selectedEvent.id) : ''}
            onChange={onEventChange}
            placeholder="Select an event…"
            searchPlaceholder="Search events…"
          />
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

        {selectedEvent?.collect_aso_ebi && (
          <div className="sm:col-span-2 rounded-[14px] border border-[var(--line)] bg-[var(--bg)] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                name="aso_ebi_requested"
                type="checkbox"
                checked={asoEbiRequested}
                onChange={(e) => setAsoEbiRequested(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--ink)]">Guest wants Aso Ebi</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Turn this on to record how many yards are needed.</span>
              </span>
            </label>
            {asoEbiRequested && (
              <div className="mt-4">
                <AsoEbiYardSelector name="aso_ebi_quantity" id="guest-aso-ebi-yards" value={asoEbiYards} onChange={setAsoEbiYards} />
              </div>
            )}
          </div>
        )}

        {selectedEvent?.whatsapp_enabled && (
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Schedule pass send <span className="normal-case font-normal tracking-normal" style={{ color: 'var(--muted-2)' }}>(optional — leave blank to send immediately)</span>
            </label>
            <input name="scheduled_send_at" type="datetime-local" className={field} />
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="mx-6 mb-4 flex flex-wrap gap-2 rounded-[10px] px-4 py-3 text-xs"
          style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>Event settings:</span>
          <span>WhatsApp: <b>{selectedEvent.whatsapp_enabled ? 'On' : 'Off'}</b></span>
          <span>·</span>
          <span>Ticket types: <b>{ticketOptions.map(t => t.label).join(', ')}</b></span>
          {selectedEvent.collect_aso_ebi && <><span>·</span><span>Aso Ebi requests: <b>On</b></span></>}
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
