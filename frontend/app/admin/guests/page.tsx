'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'
import ExportDropdown from '@/components/ExportDropdown'
import { GuestFilterBar } from '@/components/guests/GuestFilterBar'
import { GuestTable } from '@/components/guests/GuestTable'

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
  const [loading, setLoading]           = useState(false)
  const [query, setQuery]               = useState('')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [deleting, setDeleting]         = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { tokens, freeText } = parseTokens(query)
  const statusToken = tokens.find((t) => t.key === 'status')?.value ?? ''
  const ticketToken = tokens.find((t) => t.key === 'ticket')?.value ?? ''
  const waToken     = tokens.find((t) => t.key === 'wa')?.value ?? ''

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedEvent) return
    setLoading(true)
    setSelected(new Set())
    const params: Record<string, string> = { event: String(selectedEvent.id) }
    if (freeText)    params.search      = freeText
    if (statusToken) params.status      = statusToken === 'pending' ? 'registered' : statusToken
    if (ticketToken) params.ticket_type = ticketToken
    api.getGuests(params)
      .then((data) => { setGuests(data.results); setCount(data.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedEvent, freeText, statusToken, ticketToken])

  const filtered = waToken
    ? guests.filter((g) => {
        if (waToken === 'failed') return !g.whatsapp_sent
        if (waToken === 'read' || waToken === 'delivered') return g.whatsapp_sent
        return true
      })
    : guests

  function toggleSelect(id: string) {
    setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((g) => g.id)))
  }
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the guest list?`)) return
    setDeleting(id)
    try {
      await api.deleteGuest(id)
      setGuests((prev) => prev.filter((g) => g.id !== id))
      setCount((c) => c - 1)
    } catch {} finally { setDeleting(null) }
  }

  const checkedIn = guests.filter((g) => g.status === 'checked_in').length
  const pending   = guests.filter((g) => g.status !== 'checked_in').length

  // ── Event picker ──────────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Guests</h1>
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
              {events.map((ev) => (
                <button key={ev.id} onClick={() => setSelectedEvent(ev)}
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
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedEvent(null); setQuery(''); setGuests([]); setCount(0) }}
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
          <ExportDropdown events={[selectedEvent]} />
          <Link href={`/admin/guests/bulk-upload?event=${selectedEvent.id}`}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition hover:opacity-90"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            Bulk upload
          </Link>
          <Link href={`/admin/guests/add?event=${selectedEvent.id}`}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add guest
          </Link>
        </div>
      </div>

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
    </div>
  )
}
