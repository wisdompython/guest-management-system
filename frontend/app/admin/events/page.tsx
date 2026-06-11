'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function exportEvent(eventId: number) {
  window.location.href = `${BASE_URL}/guests/export/?event=${eventId}`
}

export default function EventsPage() {
  const [events, setEvents]   = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setLoading(false))
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
    <div className="px-6 py-6 lg:px-8 lg:py-7">

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Events</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>{events.length} total events</p>
        </div>
        <Link href="/admin/events/add" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
          + New Event
        </Link>
      </div>

      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--bg)' }}>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Venue</th>
                <th className="px-5 py-3 text-left">Guests</th>
                <th className="px-5 py-3 text-left">Design</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="transition-colors hover:bg-[var(--bg)]" style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>{ev.name}</td>
                  <td className="whitespace-nowrap px-5 py-3.5" style={{ color: 'var(--muted)' }}>{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="max-w-[140px] truncate px-5 py-3.5" style={{ color: 'var(--muted)' }}>{ev.venue || '--'}</td>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>{ev.guest_count}</td>
                  <td className="px-5 py-3.5">
                    {ev.design_template ? (
                      <a href={ev.design_template.startsWith('http') ? ev.design_template : `${BASE_URL.replace('/api', '')}${ev.design_template}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold hover:underline" style={{ color: 'var(--brand)' }}>
                        View ↗
                      </a>
                    ) : <span className="text-xs" style={{ color: 'var(--muted-2)' }}>None</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/events/${ev.id}/edit`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--brand)' }}>Edit</Link>
                      <button onClick={() => exportEvent(ev.id)}
                        className="text-xs font-semibold hover:underline" style={{ color: 'var(--muted)' }}>
                        Export
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.name)} disabled={deleting === ev.id}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">Delete</button>
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
