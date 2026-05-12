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
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch { /* leave row */ }
    finally { setDeleting(null) }
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} total events</p>
        </div>
        <Link
          href="/admin/events/add"
          className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition-colors"
        >
          + New Event
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Venue</th>
                <th className="px-5 py-3 text-left font-semibold">Guests</th>
                <th className="px-5 py-3 text-left font-semibold">Design</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{ev.name}</td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-gray-500 truncate max-w-[140px]">{ev.venue || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{ev.guest_count}</td>
                  <td className="px-5 py-3">
                    {ev.design_template ? (
                      <a
                        href={ev.design_template.startsWith('http') ? ev.design_template : `${BASE_URL.replace('/api', '')}${ev.design_template}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">None</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/events/${ev.id}/edit`}
                      className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(ev.id, ev.name)}
                      disabled={deleting === ev.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      Delete
                    </button>
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
