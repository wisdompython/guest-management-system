'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { StatCards } from '@/components/dashboard/StatCards'
import { ArrivalsFeed } from '@/components/dashboard/ArrivalsFeed'
import { EventsPanel } from '@/components/dashboard/EventsPanel'

interface DashboardStats { checked_in: number; pending: number; wa_sent: number; wa_unsent: number }

export default function DashboardPage() {
  const router = useRouter()
  const { isScanner } = useAuth()
  const [recentArrivals, setRecentArrivals] = useState<Guest[]>([])
  const [stats, setStats]       = useState<DashboardStats | null>(null)
  const [events, setEvents]     = useState<Event[]>([])
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [loading, setLoading]   = useState(true)
  const [guestsLoading, setGuestsLoading] = useState(false)
  const [time, setTime]         = useState(new Date())

  useEffect(() => {
    if (isScanner) router.replace('/admin/check-in')
  }, [isScanner, router])

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
    if (!activeEvent) { setRecentArrivals([]); setStats(null); return }
    setGuestsLoading(true)
    // page_size=10 for recent arrivals feed; stats come from server-side aggregates (full queryset)
    Promise.all([
      api.getGuests({ event: String(activeEvent.id), ordering: '-checked_in', status: 'checked_in', page_size: '10' }),
      api.getGuests({ event: String(activeEvent.id), page_size: '1' }),
    ])
      .then(([arrivals, overview]) => {
        setRecentArrivals(arrivals.results)
        setStats(overview.stats ?? null)
      })
      .catch(console.error)
      .finally(() => setGuestsLoading(false))
  }, [activeEvent?.id])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const total         = stats ? stats.checked_in + stats.pending : 0
  const checkedIn     = stats?.checked_in ?? 0
  const waSent        = stats?.wa_sent ?? 0
  const attendancePct = total > 0 ? Math.round((checkedIn / total) * 100) : 0

  const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Top bar */}
      <div className="flex-shrink-0 px-4 py-3"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-center gap-2">
          {/* Event switcher — grows but never pushes buttons off screen */}
          <div className="min-w-0 flex-1 overflow-hidden">
            {events.length > 1 ? (
              <select
                value={activeEvent?.id ?? ''}
                onChange={(e) => setActiveEvent(events.find((ev) => ev.id === Number(e.target.value)) ?? null)}
                className="w-full max-w-[200px] text-sm font-semibold focus:outline-none px-2 py-1"
                style={{ background: 'var(--field)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
            ) : (
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                {loading ? '—' : activeEvent ? activeEvent.name : 'No active event'}
                {activeEvent && <span style={{ color: 'var(--brand)' }}> · Live</span>}
              </p>
            )}
            {/* Date + time on its own line, venue truncated */}
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
              {activeEvent
                ? new Date(activeEvent.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '--'}
              {' · '}{timeStr}
              {activeEvent?.venue ? ' · ' + activeEvent.venue : ''}
            </p>
          </div>

          {/* Action buttons — fixed width, never shrink */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link href="/admin/check-in"
              className="flex items-center justify-center w-8 h-8 transition hover:opacity-80"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}
              title="Open scanner">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                <rect x="7" y="7" width="3" height="3" rx="0.5"/><rect x="14" y="7" width="3" height="3" rx="0.5"/>
                <rect x="7" y="14" width="3" height="3" rx="0.5"/>
              </svg>
            </Link>
            <Link href="/admin/whatsapp"
              className="px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 whitespace-nowrap"
              style={{ background: 'var(--brand)' }}>
              WhatsApp
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
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
