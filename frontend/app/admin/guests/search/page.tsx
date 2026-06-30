'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'

const PAGE_SIZE = 20

type SortKey = '' | 'name' | '-name' | 'registered' | '-registered' | 'checked_in' | '-checked_in'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: '',            label: 'Best match' },
  { value: '-registered', label: 'Registered (newest)' },
  { value: 'registered',  label: 'Registered (oldest)' },
  { value: 'name',        label: 'Name (A–Z)' },
  { value: '-checked_in', label: 'Checked in (newest)' },
]

export default function GlobalGuestSearchPage() {
  useRequireAuth()
  const [query, setQuery] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortKey>('')
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState<Event[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const hasFilters = query.trim() !== '' || eventFilter !== '' || statusFilter !== ''

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { api.getEvents().then(setEvents).catch(console.error) }, [])
  useEffect(() => { setPage(1) }, [query, eventFilter, statusFilter, sort])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    if (!hasFilters) { setGuests([]); setCount(0); return }
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const params: Record<string, string> = { page_size: String(PAGE_SIZE), page: String(page) }
        if (query.trim())   params.search = query.trim()
        if (eventFilter)    params.event = eventFilter
        if (statusFilter)   params.status = statusFilter
        if (sort)            params.ordering = sort
        const data = await api.getGuests(params, controller.signal)
        setGuests(data.results)
        setCount(data.count)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') { setGuests([]); setCount(0) }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 350)
  }, [query, eventFilter, statusFilter, sort, page, hasFilters])

  function clearFilters() {
    setQuery(''); setEventFilter(''); setStatusFilter(''); setSort('')
  }

  const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-shrink-0 items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <Link href="/admin/guests"
          className="text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--muted)' }}>
          ← Guests
        </Link>
        <span style={{ color: 'var(--line)' }}>/</span>
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Global Search</h1>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3 px-5 py-3"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--muted)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone number across all events…"
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: 'var(--ink)' }}
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-xs" style={{ color: 'var(--muted)' }}>✕</button>
        )}
        {loading && <span className="text-xs" style={{ color: 'var(--muted)' }}>Searching…</span>}
        {!loading && hasFilters && (
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{count} result{count !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 px-5 py-2.5"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
          style={{ border: '1px solid var(--line)', background: 'var(--panel-2)', color: 'var(--ink)' }}>
          <option value="">All events</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
          style={{ border: '1px solid var(--line)', background: 'var(--panel-2)', color: 'var(--ink)' }}>
          <option value="">All statuses</option>
          <option value="registered">Pending</option>
          <option value="checked_in">Checked in</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
          style={{ border: '1px solid var(--line)', background: 'var(--panel-2)', color: 'var(--ink)' }}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {(eventFilter || statusFilter || sort) && (
          <button onClick={clearFilters}
            className="px-2.5 py-1.5 text-xs font-semibold transition hover:opacity-70"
            style={{ color: 'var(--muted)' }}>
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {!hasFilters ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24" style={{ color: 'var(--muted-2)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Type a name or phone number, or pick an event/status filter to search all events</p>
          </div>
        ) : guests.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No guests found</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Try a different name, phone number, or filter.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: 'var(--panel)', borderBottom: '1px solid var(--line)', color: 'var(--muted-2)' }}>
                <th className="px-5 py-2.5 text-left">Guest</th>
                <th className="px-5 py-2.5 text-left">Event</th>
                <th className="px-5 py-2.5 text-left">Contact</th>
                <th className="px-5 py-2.5 text-left">Ticket</th>
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => {
                const st = g.status === 'checked_in'
                return (
                  <tr key={g.id} className="transition-colors hover:bg-[var(--panel)]"
                    style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                          {initials(g.full_name)}
                        </div>
                        <div>
                          <Link href={`/admin/guests/${g.id}`}
                            className="font-semibold hover:underline" style={{ color: 'var(--ink)' }}>
                            {g.full_name}
                          </Link>
                          <p className="text-[11px] font-mono" style={{ color: 'var(--muted-2)' }}>
                            G-{g.id.slice(-3).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs max-w-[180px] truncate" style={{ color: 'var(--muted)' }}>
                      {g.event_name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.email || '—'}</p>
                      <p className="text-[11px] font-mono" style={{ color: 'var(--muted-2)' }}>{g.phone_number || '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium" style={{ color: 'var(--ink)' }}>
                      {g.ticket_type?.toUpperCase() || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-[11px] font-bold tracking-[0.06em]"
                        style={{
                          background: st ? 'var(--brand-soft)' : 'rgba(245,158,11,0.14)',
                          color: st ? 'var(--brand)' : 'var(--warn)',
                        }}>
                        {st ? 'CHECKED-IN' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/guests/${g.id}`}
                        className="text-xs font-semibold hover:underline" style={{ color: 'var(--brand)' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Page {page} of {totalPages} · {count} results
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
              style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>‹ Prev</button>
            <span className="px-2 text-xs" style={{ color: 'var(--muted)' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
              style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>Next ›</button>
          </div>
        </div>
      )}
    </div>
  )
}
