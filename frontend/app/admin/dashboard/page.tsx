'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'
import { StatCards } from '@/components/dashboard/StatCards'
import { ArrivalsFeed } from '@/components/dashboard/ArrivalsFeed'
import { EventsPanel } from '@/components/dashboard/EventsPanel'

export default function DashboardPage() {
  const [guests, setGuests]   = useState<Guest[]>([])
  const [events, setEvents]   = useState<Event[]>([])
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [guestsLoading, setGuestsLoading] = useState(false)
  const [time, setTime]       = useState(new Date())

  useEffect(() => {
    api.getEvents()
      .then((e) => {
        setEvents(e)
        setActiveEvent(e[0] ?? null)
        if (e.length === 0) setLoading(false)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeEvent) { setGuests([]); return }
    setGuestsLoading(true)
    api.getGuests({ event: String(activeEvent.id), page_size: '200' })
      .then((g) => setGuests(g.results))
      .catch(console.error)
      .finally(() => setGuestsLoading(false))
  }, [activeEvent?.id])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const total         = guests.length
  const checkedIn     = guests.filter((g) => g.status === 'checked_in').length
  const waSent        = guests.filter((g) => g.whatsapp_sent).length
  const attendancePct = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  const recentArrivals = [...guests]
    .filter((g) => g.status === 'checked_in')
    .sort((a, b) => (b.checked_in_at ?? '').localeCompare(a.checked_in_at ?? ''))
    .slice(0, 10)

  const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Top bar */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-center gap-4">
          {/* Event switcher */}
          {events.length > 1 ? (
            <select
              value={activeEvent?.id ?? ''}
              onChange={(e) => setActiveEvent(events.find((ev) => ev.id === Number(e.target.value)) ?? null)}
              className="text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand)] px-2 py-1"
              style={{ background: '#1a2030', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          ) : (
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {loading ? '—' : activeEvent ? activeEvent.name : 'No active event'}
                {activeEvent && <span style={{ color: 'var(--brand)' }}> · Live</span>}
              </p>
            </div>
          )}
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {activeEvent
              ? new Date(activeEvent.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
              : '--'}
            {' · '}{timeStr}
            {activeEvent?.venue ? ' · ' + activeEvent.venue : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/check-in"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <rect x="7" y="7" width="3" height="3" rx="0.5"/><rect x="14" y="7" width="3" height="3" rx="0.5"/>
              <rect x="7" y="14" width="3" height="3" rx="0.5"/>
            </svg>
            Open scanner
          </Link>
          <Link href="/admin/whatsapp"
            className="px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}>
            WhatsApp
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <StatCards
          loading={loading || guestsLoading}
          checkedIn={checkedIn}
          total={total}
          waSent={waSent}
          eventsCount={events.length}
          attendancePct={attendancePct}
          activeEventLabel={activeEvent ? 'Active event running' : 'No active event'}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <ArrivalsFeed guests={recentArrivals} loading={loading || guestsLoading} />
          <EventsPanel events={events} loading={loading} />
        </div>
      </div>
    </div>
  )
}
