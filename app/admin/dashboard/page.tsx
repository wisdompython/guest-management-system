'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'

export default function DashboardPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    Promise.all([api.getGuests(), api.getEvents()])
      .then(([g, e]) => { setGuests(g.results); setEvents(e) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const total         = guests.length
  const checkedIn     = guests.filter((g) => g.status === 'checked_in').length
  const waSent        = guests.filter((g) => g.whatsapp_sent).length
  const attendancePct = total > 0 ? Math.round((checkedIn / total) * 100) : 0
  const activeEvent   = events[0] ?? null
  const recentGuests  = [...guests].sort((a, b) =>
    (b.checked_in_at ?? '').localeCompare(a.checked_in_at ?? '')
  ).slice(0, 10)

  const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Top bar */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {loading ? '—' : activeEvent ? activeEvent.name : 'No active event'}
            {activeEvent && <span style={{ color: 'var(--brand)' }}> · Live</span>}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {activeEvent
              ? new Date(activeEvent.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
              : '--'}
            {' '}· {timeStr}
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">

          <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>Attendance</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--brand)' }}>
              {loading ? '--' : checkedIn}
              <span className="text-lg font-normal ml-1" style={{ color: 'var(--muted)' }}>/ {total}</span>
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              {loading ? '--' : `${attendancePct}% checked in`}
            </p>
            <div className="mt-3 h-1" style={{ background: 'var(--line)' }}>
              <div className="h-1 transition-all" style={{ width: `${attendancePct}%`, background: 'var(--brand)' }} />
            </div>
          </div>

          <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>Pending</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {loading ? '--' : total - checkedIn}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              {loading ? '--' : `${total} total guests`}
            </p>
          </div>

          <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>WA Delivered</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {loading ? '--' : waSent}
              <span className="text-lg font-normal ml-1" style={{ color: 'var(--muted)' }}>/ {total}</span>
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              {loading ? '--' : `${total - waSent} not yet sent`}
            </p>
          </div>

          <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>Events</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {loading ? '--' : events.length}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              {activeEvent ? 'Active event running' : 'No active event'}
            </p>
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid gap-4 xl:grid-cols-2">

          {/* Arrivals feed */}
          <div style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: 'var(--brand)' }} />
                <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Arrivals feed</p>
              </div>
              <Link href="/admin/guests" className="text-[11px] transition hover:opacity-70" style={{ color: 'var(--brand)' }}>
                View all →
              </Link>
            </div>
            <div>
              {loading ? (
                <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading…</div>
              ) : recentGuests.length === 0 ? (
                <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>No arrivals yet.</div>
              ) : recentGuests.map((g) => {
                const initials = g.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                const checkedInTime = g.checked_in_at
                  ? new Date(g.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : null
                return (
                  <div key={g.id} className="flex items-center gap-3 px-5 py-2.5"
                    style={{ borderBottom: '1px solid var(--line)' }}>
                    <div className="w-10 text-[11px] font-mono tabular-nums" style={{ color: checkedInTime ? 'var(--ink)' : 'var(--muted-2)' }}>
                      {checkedInTime || '--:--'}
                    </div>
                    {checkedInTime
                      ? <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ background: 'rgba(34,201,160,0.12)', color: 'var(--brand)' }}>IN</span>
                      : <span className="w-8" />
                    }
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                      {initials}
                    </div>
                    <p className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {g.full_name}
                      <span className="ml-1.5 text-[11px] font-normal" style={{ color: 'var(--muted)' }}>
                        · {g.ticket_type.toUpperCase()}
                      </span>
                    </p>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                      {g.table_number ? `T-${g.table_number}` : '—'}
                    </span>
                    <span className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: g.status === 'checked_in' ? 'var(--brand)' : 'var(--muted-2)' }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Events + quick links */}
          <div className="flex flex-col gap-4">
            <div style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid var(--line)' }}>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Events</p>
                <Link href="/admin/events" className="text-[11px] transition hover:opacity-70" style={{ color: 'var(--brand)' }}>
                  View all →
                </Link>
              </div>
              {loading ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading…</div>
              ) : events.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>No events yet.</div>
              ) : events.slice(0, 4).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{ev.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      {new Date(ev.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {ev.venue ? ' · ' + ev.venue : ''}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                    {ev.guest_count}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/guests/add"
                className="p-4 transition hover:opacity-80"
                style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>New</p>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Add Guest</p>
              </Link>
              <Link href="/admin/guests/bulk-upload"
                className="p-4 transition hover:opacity-80"
                style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>Import</p>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Bulk Upload</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
