'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event, CreateGuestPayload } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted)]'
const labelCls = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

// Fields that can be toggled required/optional per event
const OPTIONAL_FIELDS = [
  { key: 'phone_number', label: 'Phone Number', type: 'tel',  placeholder: '+234 800 000 0000' },
  { key: 'email',        label: 'Email',         type: 'email', placeholder: 'optional' },
  { key: 'table_number', label: 'Table Number',  type: 'text', placeholder: 'optional' },
  { key: 'seat_number',  label: 'Seat Number',   type: 'text', placeholder: 'optional' },
] as const

export default function AddGuestPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error)
  }, [])

  function handleEventChange(id: string) {
    const ev = events.find((e) => String(e.id) === id) ?? null
    setSelectedEvent(ev)
  }

  // Derive required fields and ticket types from selected event
  const requiredFields: string[] = selectedEvent
    ? [
        'full_name',
        ...( selectedEvent.required_fields ?? [] ),
        ...( selectedEvent.whatsapp_enabled ? ['phone_number'] : [] ),
      ]
    : ['full_name', 'phone_number']

  const ticketOptions = selectedEvent?.ticket_types?.length
    ? selectedEvent.ticket_types as { value: string; label: string }[]
    : [{ value: 'general', label: 'General' }, { value: 'vip', label: 'VIP' }, { value: 'vvip', label: 'VVIP' }]

  const uniqueRequired = [...new Set(requiredFields)]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const form = e.currentTarget
    const getValue = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? ''

    const payload: CreateGuestPayload = {
      full_name:    getValue('full_name'),
      phone_number: getValue('phone_number'),
      email:        getValue('email'),
      ticket_type:  getValue('ticket_type'),
      table_number: getValue('table_number'),
      seat_number:  getValue('seat_number'),
      event:        selectedEvent ? selectedEvent.id : null,
    }

    try {
      await api.createGuest(payload)
      router.push('/admin/guests')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add guest.')
      setSubmitting(false)
    }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10">

      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Guest directory</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Add Guest</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Register a single guest and assign them to an event.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Guest information</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Fields marked * are required.</p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {/* Full name — always required */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Full Name *</label>
            <input name="full_name" type="text" required placeholder="e.g. Adaeze Okonkwo" className={field} />
          </div>

          {/* Event selector — must come early so config can drive field rendering */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Event *</label>
            <select name="event" required className={field}
              onChange={(e) => handleEventChange(e.target.value)}>
              <option value="">Select an event…</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          {/* Ticket type — driven by event config */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Ticket Type</label>
            <select name="ticket_type" className={field}>
              {ticketOptions.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Dynamic optional fields */}
          {OPTIONAL_FIELDS.map(({ key, label, type, placeholder }) => {
            const isRequired = uniqueRequired.includes(key)
            return (
              <div key={key}>
                <label className={labelCls}>
                  {label} {isRequired ? '*' : <span className="normal-case font-normal tracking-normal" style={{ color: 'var(--muted-2)' }}>(optional)</span>}
                </label>
                <input
                  name={key}
                  type={type}
                  required={isRequired}
                  placeholder={isRequired ? placeholder.replace('optional', '') : placeholder}
                  className={field}
                />
              </div>
            )
          })}
        </div>

        {/* Event config hint */}
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
          <button type="submit" disabled={submitting}
            className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {submitting ? 'Adding…' : 'Add Guest'}
          </button>
          <button type="button" onClick={() => router.push('/admin/guests')}
            className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
