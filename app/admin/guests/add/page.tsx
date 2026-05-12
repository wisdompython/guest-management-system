'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event, CreateGuestPayload } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

export default function AddGuestPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const form = e.currentTarget
    const getValue = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value

    const payload: CreateGuestPayload = {
      full_name:    getValue('full_name'),
      phone_number: getValue('phone_number'),
      email:        getValue('email'),
      ticket_type:  getValue('ticket_type') as CreateGuestPayload['ticket_type'],
      table_number: getValue('table_number'),
      seat_number:  getValue('seat_number'),
      event:        getValue('event') ? Number(getValue('event')) : null,
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
          <p className="text-xs text-[var(--muted)] mt-0.5">Fields marked * are required.</p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Full Name *</label>
            <input name="full_name" type="text" required placeholder="e.g. Adaeze Okonkwo" className={field} />
          </div>

          <div>
            <label className={label}>Phone Number *</label>
            <input name="phone_number" type="tel" required placeholder="+234 800 000 0000" className={field} />
          </div>

          <div>
            <label className={label}>Email</label>
            <input name="email" type="email" placeholder="optional" className={field} />
          </div>

          <div className="sm:col-span-2">
            <label className={label}>Event *</label>
            <select name="event" required className={field}>
              <option value="">Select an event…</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={label}>Ticket Type</label>
            <select name="ticket_type" defaultValue="general" className={field}>
              <option value="general">General</option>
              <option value="vip">VIP</option>
              <option value="vvip">VVIP</option>
            </select>
          </div>

          <div>
            <label className={label}>Table Number</label>
            <input name="table_number" type="text" placeholder="optional" className={field} />
          </div>

          <div>
            <label className={label}>Seat Number</label>
            <input name="seat_number" type="text" placeholder="optional" className={field} />
          </div>
        </div>

        <div className="flex gap-3 border-t border-[var(--line)] px-6 py-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add Guest'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/guests')}
            className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
