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
    { label: 'Total Guests', value: loading ? '--' : guests.length, tone: 'from-[#f4d7a1] to-[#f8efe0]' },
    { label: 'Checked In', value: loading ? '--' : checkedIn, tone: 'from-[#bfe4dd] to-[#eef8f6]' },
    { label: 'Passes Generated', value: loading ? '--' : withPass, tone: 'from-[#c7d6f7] to-[#f4f7ff]' },
    { label: 'WhatsApp Sent', value: loading ? '--' : whatsappSent, tone: 'from-[#ead5ff] to-[#fbf6ff]' },
  ]

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 rounded-[28px] bg-[#f7f0e4] px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--brand)]">Operations overview</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)]">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">A quick read on attendance, pass readiness, and the events your team is actively managing.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-[var(--muted)] sm:grid-cols-4">
          <div>
            <p className="font-display text-2xl text-[var(--ink)]">{events.length}</p>
            <p>events</p>
          </div>
          <div>
            <p className="font-display text-2xl text-[var(--ink)]">{checkedIn}</p>
            <p>checked in</p>
          </div>
          <div>
            <p className="font-display text-2xl text-[var(--ink)]">{withPass}</p>
            <p>passes ready</p>
          </div>
          <div>
            <p className="font-display text-2xl text-[var(--ink)]">{whatsappSent}</p>
            <p>sent out</p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, tone }) => (
          <div key={label} className={`rounded-[26px] border border-black/5 bg-gradient-to-br ${tone} px-5 py-5`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{label}</p>
            <p className="mt-4 font-display text-5xl leading-none text-[var(--ink)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 overflow-hidden rounded-[28px] border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Events in motion</h2>
            <p className="text-sm text-[var(--muted)]">Recent events and how many guests they currently hold.</p>
          </div>
          <Link href="/admin/events" className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-stone-50">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--muted)]">Loading...</div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--muted)]">No events yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Venue</th>
                <th className="px-5 py-3 text-left font-semibold">Guests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {events.slice(0, 5).map((ev) => (
                <tr key={ev.id} className="hover:bg-stone-50/70">
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{ev.name}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{ev.venue || '--'}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{ev.guest_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/guests/add" className="rounded-[26px] border border-stone-200 bg-[#fffaf0] px-6 py-5 transition hover:-translate-y-0.5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">New registration</p>
          <p className="mt-3 font-display text-3xl text-[var(--ink)]">Add Guest</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Register one guest manually and assign them to an event in a few fields.</p>
        </Link>
        <Link href="/admin/guests/bulk-upload" className="rounded-[26px] border border-stone-200 bg-[#eef7f5] px-6 py-5 transition hover:-translate-y-0.5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Team import</p>
          <p className="mt-3 font-display text-3xl text-[var(--ink)]">Bulk Upload</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Bring in larger guest lists, then let the system generate their assets for you.</p>
        </Link>
      </div>
    </div>
  )
}
