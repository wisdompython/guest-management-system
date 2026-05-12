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

  const checkedIn = guests.filter((g) => g.status === 'checked_in').length
  const whatsappSent = guests.filter((g) => g.whatsapp_sent).length
  const withPass = guests.filter((g) => g.pass_image).length

  const stats = [
    { label: 'Total Guests',   value: loading ? '--' : guests.length },
    { label: 'Checked In',     value: loading ? '--' : checkedIn },
    { label: 'Passes Ready',   value: loading ? '--' : withPass },
    { label: 'WhatsApp Sent',  value: loading ? '--' : whatsappSent },
  ]

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10">

      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--brand)' }}>Overview</p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink-strong)' }}>Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-[18px] px-5 py-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="mt-3 font-display text-5xl leading-none" style={{ color: 'var(--ink-strong)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Events table */}
      <div className="mb-5 overflow-hidden rounded-[20px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Recent events</h2>
          <Link href="/admin/events" className="text-xs font-semibold uppercase tracking-[0.16em] transition hover:opacity-70" style={{ color: 'var(--brand)' }}>
            View all
          </Link>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.16em]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                <th className="px-6 py-3 text-left font-semibold">Name</th>
                <th className="px-6 py-3 text-left font-semibold">Date</th>
                <th className="px-6 py-3 text-left font-semibold">Venue</th>
                <th className="px-6 py-3 text-left font-semibold">Guests</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 5).map((ev) => (
                <tr key={ev.id} className="transition-colors" style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-6 py-3.5 font-medium" style={{ color: 'var(--ink)' }}>{ev.name}</td>
                  <td className="px-6 py-3.5" style={{ color: 'var(--muted)' }}>{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5" style={{ color: 'var(--muted)' }}>{ev.venue || '--'}</td>
                  <td className="px-6 py-3.5" style={{ color: 'var(--muted)' }}>{ev.guest_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/guests/add" className="group rounded-[20px] px-6 py-6 transition hover:border-[var(--brand)]" style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--brand)' }}>New registration</p>
          <p className="mt-3 font-display text-3xl" style={{ color: 'var(--ink-strong)' }}>Add Guest</p>
          <p className="mt-2 text-sm leading-6 font-light" style={{ color: 'var(--muted)' }}>Register one guest manually and assign them to an event.</p>
        </Link>
        <Link href="/admin/guests/bulk-upload" className="group rounded-[20px] px-6 py-6 transition hover:border-[var(--brand)]" style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--brand)' }}>Team import</p>
          <p className="mt-3 font-display text-3xl" style={{ color: 'var(--ink-strong)' }}>Bulk Upload</p>
          <p className="mt-2 text-sm leading-6 font-light" style={{ color: 'var(--muted)' }}>Bring in larger guest lists, then let the system generate their assets.</p>
        </Link>
      </div>
    </div>
  )
}
