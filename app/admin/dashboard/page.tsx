'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'

export default function DashboardPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getGuests(), api.getEvents()])
      .then(([g, e]) => { setGuests(g.results); setEvents(e) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const checkedIn  = guests.filter(g => g.status === 'checked_in').length
  const whatsappSent = guests.filter(g => g.whatsapp_sent).length
  const withPass   = guests.filter(g => g.pass_image).length

  const stats = [
    { label: 'Total Guests',    value: loading ? '—' : guests.length },
    { label: 'Checked In',      value: loading ? '—' : checkedIn },
    { label: 'Passes Generated',value: loading ? '—' : withPass },
    { label: 'WhatsApp Sent',   value: loading ? '—' : whatsappSent },
  ]

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your events and guests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl px-5 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Events */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Events</h2>
          <Link href="/admin/events" className="text-xs text-indigo-600 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Venue</th>
                <th className="px-5 py-3 text-left font-semibold">Guests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.slice(0, 5).map(ev => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{ev.name}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-gray-500">{ev.venue || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{ev.guest_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/guests/add" className="bg-white border border-gray-100 hover:border-indigo-300 rounded-2xl px-6 py-5 transition-colors group">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">+ Add Guest</p>
          <p className="text-xs text-gray-400 mt-0.5">Register a single guest manually</p>
        </Link>
        <Link href="/admin/guests/bulk-upload" className="bg-white border border-gray-100 hover:border-indigo-300 rounded-2xl px-6 py-5 transition-colors group">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">↑ Bulk Upload</p>
          <p className="text-xs text-gray-400 mt-0.5">Import guests from a CSV file</p>
        </Link>
      </div>
    </div>
  )
}
