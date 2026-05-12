'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    api.getEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete event "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await api.deleteEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch {}
    finally { setDeleting(null) }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10">

      <div className="mb-8 flex items-center justify-between border-b border-[var(--line)] pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Event setup</p>
          <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Events</h1>
        </div>
        <Link
          href="/admin/events/add"
          className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
        >
          New Event
        </Link>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">Date</th>
                <th className="px-6 py-3 text-left font-semibold">Venue</th>
                <th className="px-6 py-3 text-left font-semibold">Guests</th>
                <th className="px-6 py-3 text-left font-semibold">Design</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-[var(--bg)]">
                  <td className="px-6 py-3.5 font-medium text-[var(--ink)]">{ev.name}</td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-[var(--muted)]">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="max-w-[140px] truncate px-6 py-3.5 text-[var(--muted)]">{ev.venue || '--'}</td>
                  <td className="px-6 py-3.5 text-[var(--muted)]">{ev.guest_count}</td>
                  <td className="px-6 py-3.5">
                    {ev.design_template ? (
                      <a
                        href={ev.design_template.startsWith('http') ? ev.design_template : `${BASE_URL.replace('/api', '')}${ev.design_template}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)] hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-[var(--line)]">None</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/events/${ev.id}/edit`}
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:text-[var(--brand)]"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(ev.id, ev.name)}
                        disabled={deleting === ev.id}
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400 transition hover:text-red-600 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
