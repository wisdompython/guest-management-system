'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { api, Guest, Event, GuestListStats } from '@/lib/api'
import ExportDropdown from '@/components/ExportDropdown'
import { GuestFilterBar } from '@/components/guests/GuestFilterBar'
import { GuestTable } from '@/components/guests/GuestTable'
import { DownloadAssetsButton } from '@/components/guests/DownloadAssetsButton'

type FilterToken = { key: string; value: string }

function parseTokens(input: string): { tokens: FilterToken[]; freeText: string } {
  const tokens: FilterToken[] = []
  let freeText = ''
  const parts = input.split(/\s+/)
  for (const part of parts) {
    const m = part.match(/^(\w+):(\S+)$/)
    if (m) tokens.push({ key: m[1], value: m[2] })
    else freeText += (freeText ? ' ' : '') + part
  }
  return { tokens, freeText: freeText.trim() }
}

export default function GuestsPage() {
  const [events, setEvents]             = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const [guests, setGuests]             = useState<Guest[]>([])
  const [count, setCount]               = useState(0)
  const [stats, setStats]               = useState<GuestListStats | null>(null)
  const [loading, setLoading]           = useState(false)
  const [query, setQuery]               = useState('')
  const [page, setPage]                 = useState(1)
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [deleteError, setDeleteError]   = useState('')
  const [undoToast, setUndoToast]       = useState<{ id: string; name: string; guest: Guest } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }
  }, [])

  const { tokens, freeText } = parseTokens(query)
  const statusToken = tokens.find((t) => t.key === 'status')?.value ?? ''
  const ticketToken = tokens.find((t) => t.key === 'ticket')?.value ?? ''
  const waToken     = tokens.find((t) => t.key === 'wa')?.value ?? ''

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setEventsLoading(false))
  }, [])

  // reset to page 1 when filters or event changes
  useEffect(() => { setPage(1) }, [selectedEvent?.id, freeText, statusToken, ticketToken, waToken])

  useEffect(() => {
    if (!selectedEvent) return
    setLoading(true)
    setSelected(new Set())
    const params: Record<string, string> = { event: String(selectedEvent.id), page: String(page) }
    if (freeText)    params.search      = freeText
    if (statusToken) params.status      = statusToken === 'pending' ? 'registered' : statusToken
    if (ticketToken) params.ticket_type = ticketToken
    if (waToken === 'failed')                           params.wa_sent = 'false'
    else if (waToken === 'sent' || waToken === 'read' || waToken === 'delivered') params.wa_sent = 'true'
    api.getGuests(params)
      .then((data) => { setGuests(data.results); setCount(data.count); setStats(data.stats ?? null) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedEvent, freeText, statusToken, ticketToken, waToken, page])

  const filtered = guests

  function toggleSelect(id: string) {
    setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((g) => g.id)))
  }
  const commitDelete = useCallback(async (id: string, name: string) => {
    setDeleteError('')
    try {
      await api.deleteGuest(id)
    } catch (err) {
      // Guest already removed from UI — restore it by refreshing
      setDeleteError(err instanceof Error ? err.message : `Failed to remove ${name}.`)
    }
  }, [])

  function handleDelete(id: string, name: string) {
    const guest = guests.find((g) => g.id === id)
    if (!guest) return
    // Cancel any pending undo, commit that deletion immediately
    if (undoToast) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      commitDelete(undoToast.id, undoToast.name)
      setUndoToast(null)
    }
    // Optimistically remove from list
    setGuests((prev) => prev.filter((g) => g.id !== id))
    setCount((c) => c - 1)
    setSelected((s) => { const next = new Set(s); next.delete(id); return next })
    setStats((s) => {
      if (!s) return s
      const wasCheckedIn = guest.status === 'checked_in'
      return {
        ...s,
        checked_in: s.checked_in - (wasCheckedIn ? 1 : 0),
        pending: s.pending - (wasCheckedIn ? 0 : 1),
      }
    })
    // Show undo toast for 5s, then commit
    setUndoToast({ id, name, guest })
    undoTimerRef.current = setTimeout(() => {
      commitDelete(id, name)
      setUndoToast(null)
    }, 5000)
  }

  function handleUndoDelete() {
    if (!undoToast) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setGuests((prev) => [undoToast.guest, ...prev])
    setCount((c) => c + 1)
    setStats((s) => {
      if (!s) return s
      const wasCheckedIn = undoToast.guest.status === 'checked_in'
      return {
        ...s,
        checked_in: s.checked_in + (wasCheckedIn ? 1 : 0),
        pending: s.pending + (wasCheckedIn ? 0 : 1),
      }
    })
    setUndoToast(null)
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} selected guest${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting('bulk')
    setDeleteError('')
    try {
      const { deleted } = await api.bulkDeleteGuests(Array.from(selected))
      setGuests((prev) => prev.filter((g) => !selected.has(g.id)))
      setCount((c) => c - deleted)
      setSelected(new Set())
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete guests.')
    } finally { setDeleting(null) }
  }

  async function handleDeleteAll() {
    if (!selectedEvent) return
    if (!confirm(`Delete ALL ${count} guests from "${selectedEvent.name}"? This cannot be undone.`)) return
    setDeleting('all')
    setDeleteError('')
    try {
      await api.deleteAllGuests(selectedEvent.id)
      setGuests([])
      setCount(0)
      setSelected(new Set())
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to clear guests.')
    } finally { setDeleting(null) }
  }

  const checkedIn = stats?.checked_in ?? 0
  const pending   = stats?.pending ?? 0

  // ── Event picker ──────────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Guests</h1>
            <Link href="/admin/guests/search" data-tour="guests-search-link"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full transition hover:opacity-80"
              style={{ border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--panel)' }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Search all
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-8">
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Select an event to view its guest list.</p>

          {eventsLoading ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading events…</p>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>No events yet.</p>
              <Link href="/admin/events/add" className="text-sm font-semibold hover:underline" style={{ color: 'var(--brand)' }}>
                Create your first event →
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev, i) => (
                <button key={ev.id} onClick={() => setSelectedEvent(ev)} data-tour={i === 0 ? 'guests-pick-event' : undefined}
                  className="text-left rounded-[12px] px-5 py-4 transition hover:border-[var(--brand)]"
                  style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink)' }}>{ev.name}</p>
                    {ev.is_ended && (
                      <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'rgba(156,163,175,0.15)', color: 'var(--muted)' }}>Ended</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                  </p>
                  <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                    {ev.guest_count} guest{ev.guest_count !== 1 ? 's' : ''} →
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Guest list ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full px-5 py-2.5 shadow-xl"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
          <span className="text-sm">Removed <strong>{undoToast.name}</strong></span>
          <button onClick={handleUndoDelete}
            className="rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Undo
          </button>
        </div>
      )}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedEvent(null); setQuery(''); setGuests([]); setCount(0); setStats(null) }}
            className="text-xs font-semibold transition hover:opacity-70"
            style={{ color: 'var(--muted)' }}>
            ← Events
          </button>
          <span style={{ color: 'var(--line)' }}>/</span>
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
              {selectedEvent.name}
              <span className="ml-2 text-base font-normal" style={{ color: 'var(--muted)' }}>• {count}</span>
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {checkedIn} checked in · {pending} pending
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <button onClick={handleBulkDelete} disabled={deleting === 'bulk'}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
              </svg>
              {deleting === 'bulk' ? 'Deleting…' : `Delete ${selected.size} selected`}
            </button>
          ) : (
            <>
              <button onClick={handleDeleteAll} disabled={deleting === 'all' || count === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-40"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                {deleting === 'all' ? 'Clearing…' : 'Clear all'}
              </button>
              <DownloadAssetsButton eventId={selectedEvent.id} eventName={selectedEvent.name} />
              <ExportDropdown events={[selectedEvent]} />
              <Link href={`/admin/guests/bulk-upload?event=${selectedEvent.id}`} data-tour="guests-bulk-upload-button"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                Bulk upload
              </Link>
              <Link href={`/admin/guests/add?event=${selectedEvent.id}`} data-tour="guests-add-button"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: 'var(--brand)' }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add guest
              </Link>
            </>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="flex items-center justify-between px-5 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {deleteError}
          <button onClick={() => setDeleteError('')} className="ml-4 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <GuestFilterBar
        query={query} tokens={tokens} freeText={freeText}
        filteredCount={filtered.length} selectedCount={selected.size}
        inputRef={inputRef} onQueryChange={setQuery}
      />

      <div className="flex-1 overflow-auto">
        <GuestTable
          guests={filtered} loading={loading} query={query}
          selected={selected} deleting={deleting}
          onToggleAll={toggleAll} onToggleSelect={toggleSelect}
          onDelete={handleDelete} onClearQuery={() => setQuery('')}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Page {page} of {totalPages} · {count} guests
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="rounded px-2 py-1 text-xs transition disabled:opacity-30"
              style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
              style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>‹ Prev</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs" style={{ color: 'var(--muted-2)' }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)}
                  className="min-w-[28px] rounded px-2 py-1 text-xs font-semibold transition"
                  style={{
                    background: page === p ? 'var(--brand)' : 'transparent',
                    color: page === p ? '#fff' : 'var(--muted)',
                    border: `1px solid ${page === p ? 'var(--brand)' : 'var(--line)'}`,
                  }}>{p}</button>
              ))}

            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
              style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>Next ›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="rounded px-2 py-1 text-xs transition disabled:opacity-30"
              style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>»</button>
          </div>
        </div>
      )}
    </div>
  )
}
