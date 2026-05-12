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

  const checkedIn    = guests.filter((g) => g.status === 'checked_in').length
  const whatsappSent = guests.filter((g) => g.whatsapp_sent).length
  const withPass     = guests.filter((g) => g.pass_image).length

  const stats = [
    { label: 'Total Guests',  value: loading ? '--' : guests.length,     icon: '👥' },
    { label: 'Checked In',    value: loading ? '--' : checkedIn,          icon: '✓'  },
    { label: 'Passes Ready',  value: loading ? '--' : withPass,           icon: '🎫' },
    { label: 'WhatsApp Sent', value: loading ? '--' : whatsappSent,       icon: '💬' },
  ]

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">

      {/* Page title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Dashboard</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>Welcome back — here's what's happening.</p>
        </div>
        <Link href="/admin/guests/add" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
          + Add Guest
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="rounded-[12px] p-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</p>
              <span className="text-base">{icon}</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Events table */}
      <div className="mb-6 overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Events in motion</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Recent events and guest counts</p>
          </div>
          <Link href="/admin/events" className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
            View all
          </Link>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--bg)' }}>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Venue</th>
                <th className="px-5 py-3 text-left">Guests</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 5).map((ev) => (
                <tr key={ev.id} className="transition-colors hover:bg-[var(--bg)]" style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--ink)' }}>{ev.name}</td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--muted)' }}>{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--muted)' }}>{ev.venue || '--'}</td>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>{ev.guest_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/guests/add" className="group rounded-[12px] p-5 transition hover:border-[var(--brand)]" style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>New registration</p>
          <p className="mt-2 text-lg font-bold" style={{ color: 'var(--ink)' }}>Add Guest</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Register one guest and assign them to an event.</p>
        </Link>
        <Link href="/admin/guests/bulk-upload" className="group rounded-[12px] p-5 transition hover:border-[var(--brand)]" style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>Team import</p>
          <p className="mt-2 text-lg font-bold" style={{ color: 'var(--ink)' }}>Bulk Upload</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Import a full guest list from CSV in seconds.</p>
        </Link>
      </div>
    </div>
  )
}
