'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Event } from '@/lib/api'

export default function RemindersPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setLoading(false))
  }, [])

  const upcoming = events.filter((e) => new Date(e.date) >= new Date())
  const past     = events.filter((e) => new Date(e.date) <  new Date())

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--line)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>
          Comms
        </p>
        <h1 data-tour="reminders-title" className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>Reminders</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Configure WhatsApp reminders per event. Each reminder fires automatically before the event date.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading events…</p>
      ) : events.length === 0 ? (
        <div className="rounded-[14px] px-6 py-8 text-center" style={{ border: '1px solid var(--line)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No events yet. Create an event first.</p>
          <Link href="/admin/events/add" className="mt-3 inline-block text-xs font-semibold"
            style={{ color: 'var(--brand)' }}>+ New Event</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <EventGroup title="Upcoming events" events={upcoming} />
          )}
          {past.length > 0 && (
            <EventGroup title="Past events" events={past} muted />
          )}
        </div>
      )}
    </div>
  )
}

function EventGroup({ title, events, muted }: { title: string; events: Event[]; muted?: boolean }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-2)' }}>
        {title}
      </p>
      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        {events.map((ev, i) => (
          <div key={ev.id}
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--bg)]"
            style={{ borderTop: i > 0 ? '1px solid var(--line)' : undefined }}>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: muted ? 'var(--muted)' : 'var(--ink)' }}>
                {ev.name}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-2)' }}>
                {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {ev.venue ? ` · ${ev.venue}` : ''}
              </p>
            </div>
            <Link href={`/admin/events/${ev.id}/reminders`} data-tour="reminders-configure-button"
              className="ml-4 flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition hover:opacity-80"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              Configure →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
