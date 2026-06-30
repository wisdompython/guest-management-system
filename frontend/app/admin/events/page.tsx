'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { api, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function exportEvent(eventId: number) {
  window.location.href = `${BASE_URL}/guests/export/?event=${eventId}`
}

type StatusFilter = 'all' | 'upcoming' | 'ended'
type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'guests_desc' | 'checkin_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc',    label: 'Date (newest first)' },
  { value: 'date_asc',     label: 'Date (oldest first)' },
  { value: 'name_asc',     label: 'Name (A–Z)' },
  { value: 'guests_desc',  label: 'Guest count (high–low)' },
  { value: 'checkin_desc', label: 'Check-in % (high–low)' },
]

const selectCls = 'rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none'

export default function EventsPage() {
  const [events, setEvents]   = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [sort, setSort]             = useState<SortKey>('date_desc')

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filteredEvents = useMemo(() => {
    let result = events

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((ev) => ev.name.toLowerCase().includes(q) || ev.venue?.toLowerCase().includes(q))
    }

    if (status !== 'all') {
      result = result.filter((ev) => (status === 'ended' ? ev.is_ended : !ev.is_ended))
    }

    if (dateFrom) {
      result = result.filter((ev) => ev.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((ev) => ev.date <= dateTo)
    }

    const sorted = [...result]
    switch (sort) {
      case 'date_desc':    sorted.sort((a, b) => b.date.localeCompare(a.date)); break
      case 'date_asc':     sorted.sort((a, b) => a.date.localeCompare(b.date)); break
      case 'name_asc':     sorted.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'guests_desc':  sorted.sort((a, b) => b.guest_count - a.guest_count); break
      case 'checkin_desc': sorted.sort((a, b) => {
        const pctA = a.guest_count > 0 ? a.checked_in_count / a.guest_count : 0
        const pctB = b.guest_count > 0 ? b.checked_in_count / b.guest_count : 0
        return pctB - pctA
      }); break
    }
    return sorted
  }, [events, search, status, dateFrom, dateTo, sort])

  const hasActiveFilters = search.trim() !== '' || status !== 'all' || dateFrom !== '' || dateTo !== ''

  function clearFilters() {
    setSearch(''); setStatus('all'); setDateFrom(''); setDateTo('')
  }

  async function handleToggleEnded(ev: Event) {
    setTogglingId(ev.id)
    try {
      const updated = await api.updateEvent(ev.id, { is_ended: !ev.is_ended })
      setEvents((prev) => prev.map((e) => e.id === ev.id ? updated : e))
    } catch {}
    finally { setTogglingId(null) }
  }

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
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
            {hasActiveFilters ? `${filteredEvents.length} of ${events.length} events` : `${events.length} total events`}
          </p>
        </div>
        <Link href="/admin/events/add" data-tour="events-new-button" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
          + New Event
        </Link>
      </div>

      {events.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[12px] px-4 py-3"
          style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or venue…"
            className="min-w-[180px] flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
          />

          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={selectCls} style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}>
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg px-2.5 py-2 text-xs focus:outline-none"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
            <span>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg px-2.5 py-2 text-xs focus:outline-none"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
            className={selectCls} style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="rounded-lg px-3 py-2 text-xs font-semibold transition hover:opacity-70"
              style={{ color: 'var(--muted)' }}>
              Clear
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--panel)' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No events yet</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Create your first event to start managing guests.</p>
            </div>
            <Link href="/admin/events/add"
              className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--brand)' }}>
              + Create Event
            </Link>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--panel)' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No events match your filters</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Try adjusting your search, status, or date range.</p>
            </div>
            <button onClick={clearFilters}
              className="rounded-full px-5 py-2 text-xs font-semibold transition hover:opacity-90"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--bg)' }}>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Venue</th>
                <th className="px-5 py-3 text-left">Guests</th>
                <th className="px-5 py-3 text-left">Check-ins</th>
                <th className="px-5 py-3 text-left">Design</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="group cursor-pointer transition-colors hover:bg-[var(--panel)]" style={{ borderTop: '1px solid var(--line)' }}
                  onClick={(e) => { if ((e.target as HTMLElement).closest('button,a')) return; window.location.href = `/admin/events/${ev.id}/edit` }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>
                    <div className="flex items-center gap-2">
                      {ev.name}
                      {ev.is_ended && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(156,163,175,0.15)', color: 'var(--muted)' }}>
                          Ended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5" style={{ color: 'var(--muted)' }}>{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="max-w-[140px] truncate px-5 py-3.5" style={{ color: 'var(--muted)' }}>{ev.venue || '--'}</td>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>{ev.guest_count}</td>
                  <td className="px-5 py-3.5">
                    {ev.guest_count > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 max-w-[80px] rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ background: 'var(--brand)', width: `${Math.round((ev.checked_in_count / ev.guest_count) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                          {ev.checked_in_count}/{ev.guest_count}
                        </span>
                      </div>
                    ) : <span className="text-xs" style={{ color: 'var(--muted-2)' }}>—</span>}
                  </td>
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
                      <button onClick={() => handleToggleEnded(ev)} disabled={togglingId === ev.id}
                        className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40"
                        style={{ color: ev.is_ended ? 'var(--brand)' : 'var(--muted)' }}>
                        {togglingId === ev.id ? '…' : ev.is_ended ? 'Reopen' : 'End'}
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.name)} disabled={deleting === ev.id}
                        className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40" style={{ color: 'var(--danger)' }}>Delete</button>
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
