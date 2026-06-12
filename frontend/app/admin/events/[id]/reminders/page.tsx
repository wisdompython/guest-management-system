'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event } from '@/lib/api'
import { RemindersSection } from '@/components/events/RemindersSection'

export default function EventRemindersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)

  useEffect(() => {
    api.getEvent(Number(id)).then(setEvent).catch(console.error)
  }, [id])

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <button onClick={() => router.push('/admin/events')}
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-70"
          style={{ color: 'var(--brand)' }}>
          ← Events
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>
          Event reminders
        </p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>Reminders</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          {event ? event.name : '—'}
        </p>
      </div>

      <div className="mb-4 rounded-[14px] px-5 py-4 text-sm" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
        <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>How reminders work</p>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
          <li>• Each reminder fires automatically X hours before the event date.</li>
          <li>• Uses an approved Meta WhatsApp template — create and get it approved in Meta Business Manager first.</li>
          <li>• Each guest receives each reminder only once.</li>
          <li>• Use <strong style={{ color: 'var(--ink)' }}>Send now</strong> to trigger immediately for testing.</li>
        </ul>
      </div>

      <RemindersSection eventId={Number(id)} />
    </div>
  )
}
