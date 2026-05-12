'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event, CreateGuestPayload } from '@/lib/api'

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
    const getValue = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value

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
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add Guest</h1>
        <p className="text-sm text-gray-500 mt-0.5">Register a single guest manually.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="full_name"
              type="text"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              name="phone_number"
              type="tel"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Event <span className="text-red-500">*</span>
            </label>
            <select
              name="event"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select an event…</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ticket Type</label>
            <select
              name="ticket_type"
              defaultValue="general"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="general">General</option>
              <option value="vip">VIP</option>
              <option value="vvip">VVIP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Table Number</label>
            <input
              name="table_number"
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Seat Number</label>
            <input
              name="seat_number"
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Adding…' : 'Add Guest'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/guests')}
            className="flex-1 border border-gray-200 hover:border-gray-400 text-gray-700 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
