'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event, CreateGuestPayload } from '@/lib/api'
import { GuestForm } from '@/components/guests/GuestForm'

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
    e.preventDefault(); setError(''); setSubmitting(true)
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
      {error && <div className="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">{error}</div>}
      <GuestForm
        events={events} selectedEvent={selectedEvent} submitting={submitting}
        uniqueRequired={uniqueRequired} ticketOptions={ticketOptions}
        onSubmit={handleSubmit} onEventChange={handleEventChange}
        onCancel={() => router.push('/admin/guests')}
      />
    </div>
  )
}
