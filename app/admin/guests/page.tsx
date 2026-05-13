'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'
import ExportDropdown from '@/components/ExportDropdown'

// Token-based filter types
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

const WA_STATUS_LABEL: Record<string, string> = {
  read: 'Read', delivered: 'Delivered', sent: 'Sent', failed: 'Failed', pending: '',
}
const WA_DOT: Record<string, string> = {
  read: 'var(--brand)', delivered: 'var(--brand)', sent: 'var(--muted)', failed: 'var(--danger)',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  checked_in: { bg: 'rgba(34,201,160,0.14)', color: 'var(--brand)', label: 'CHECKED-IN' },
  registered:  { bg: 'rgba(245,158,11,0.14)',  color: 'var(--warn)',  label: 'PENDING' },
  no_show:     { bg: 'rgba(239,68,68,0.14)',    color: 'var(--danger)', label: 'NO-SHOW' },
}

export default function GuestsPage() {
  const [guests, setGuests]             = useState<Guest[]>([])
  const [count, setCount]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [query, setQuery]               = useState('')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [events, setEvents]             = useState<Event[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const { tokens, freeText } = parseTokens(query)

  const statusToken  = tokens.find((t) => t.key === 'status')?.value ?? ''
  const ticketToken  = tokens.find((t) => t.key === 'ticket')?.value ?? ''
  const waToken      = tokens.find((t) => t.key === 'wa')?.value ?? ''

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (freeText)     params.search      = freeText
    if (statusToken)  params.status      = statusToken === 'pending' ? 'registered' : statusToken
    if (ticketToken)  params.ticket_type = ticketToken
    api.getGuests(params)
      .then((data) => { setGuests(data.results); setCount(data.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [freeText, statusToken, ticketToken])

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error)
  }, [])

  const filtered = waToken
    ? guests.filter((g) => {
        if (waToken === 'failed') return !g.whatsapp_sent
        if (waToken === 'read' || waToken === 'delivered') return g.whatsapp_sent
        return true
      })
    : guests

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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
    } catch {}
    finally { setDeleting(null) }
  }

  const checkedIn = guests.filter((g) => g.status === 'checked_in').length
  const pending   = guests.filter((g) => g.status !== 'checked_in').length

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Header bar */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            Guests <span className="ml-1 text-base font-normal" style={{ color: 'var(--muted)' }}>• {count}</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {checkedIn} checked in · {pending} pending
            {loading ? '' : ' · 3 errors'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDropdown events={events} />
          <Link
            href="/admin/guests/add"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add guest
          </Link>
        </div>
      </div>

      {/* Token search bar */}
      <div className="flex flex-shrink-0 items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div className="flex flex-1 items-center gap-2 px-3 py-1.5"
          style={{ border: '1px solid var(--line)', background: 'var(--panel-2)' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
            style={{ color: 'var(--muted)', flexShrink: 0 }}>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          {/* Rendered tokens */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {tokens.map((t, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono"
                style={{ background: 'rgba(34,201,160,0.12)', color: 'var(--brand)', border: '1px solid rgba(34,201,160,0.2)' }}>
                <span style={{ color: 'var(--muted)' }}>{t.key}:</span>{t.value}
                <button onClick={() => setQuery(query.replace(`${t.key}:${t.value}`, '').trim())}
                  className="ml-0.5 leading-none" style={{ color: 'var(--muted)' }}>✕</button>
              </span>
            ))}
            <input
              ref={inputRef}
              value={freeText || tokens.length > 0 ? '' : query}
              onChange={(e) => {
                const val = e.target.value
                const prefix = tokens.map((t) => `${t.key}:${t.value}`).join(' ')
                setQuery(prefix ? prefix + ' ' + val : val)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !freeText && tokens.length > 0) {
                  const last = tokens[tokens.length - 1]
                  setQuery(query.replace(`${last.key}:${last.value}`, '').trim())
                }
              }}
              placeholder={tokens.length === 0 ? 'ticket:patron  status:pending  wa:failed  or search name…' : ''}
              className="flex-1 min-w-[200px] bg-transparent text-[12px] font-mono focus:outline-none"
              style={{ color: 'var(--ink)' }}
            />
          </div>
          {query && (
            <button onClick={() => setQuery('')} className="flex-shrink-0 text-[11px]" style={{ color: 'var(--muted)' }}>✕</button>
          )}
          <kbd className="hidden xl:block text-[10px] px-1.5 py-0.5 font-mono flex-shrink-0"
            style={{ border: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--panel)' }}>⌘K</kbd>
        </div>
        <div className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
          {filtered.length} matched · {selected.size} selected
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No guests match your filters.</p>
            {query && (
              <button onClick={() => setQuery('')} className="text-xs" style={{ color: 'var(--brand)' }}>Clear filters</button>
            )}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: 'var(--panel)', borderBottom: '1px solid var(--line)', color: 'var(--muted-2)' }}>
                <th className="px-4 py-2.5 text-left w-8">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="accent-[var(--brand)]" />
                </th>
                <th className="px-4 py-2.5 text-left">Guest</th>
                <th className="px-4 py-2.5 text-left">Contact</th>
                <th className="px-4 py-2.5 text-left">Ticket</th>
                <th className="px-4 py-2.5 text-left">Seat</th>
                <th className="px-4 py-2.5 text-left">WhatsApp</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Scan</th>
                <th className="px-4 py-2.5 text-left w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const initials = g.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                const st = g.status === 'checked_in' ? STATUS_STYLE.checked_in : STATUS_STYLE.registered
                const isSel = selected.has(g.id)
                const checkedInTime = g.checked_in_at
                  ? new Date(g.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : null
                const waStatus = g.whatsapp_sent ? 'delivered' : 'pending'
                const waLabel = WA_STATUS_LABEL[waStatus] || ''
                const waDot = WA_DOT[waStatus] || 'var(--muted-2)'
                const ticketLabel = g.ticket_type === 'vip' ? 'VIP' : g.ticket_type === 'vvip' ? 'VVIP' : g.ticket_type.charAt(0).toUpperCase() + g.ticket_type.slice(1)
                return (
                  <tr key={g.id}
                    className="transition-colors"
                    style={{
                      borderBottom: '1px solid var(--line)',
                      background: isSel ? 'rgba(34,201,160,0.05)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--panel)' }}
                    onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(g.id)} className="accent-[var(--brand)]" />
                    </td>

                    {/* Guest */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(34,201,160,0.15)', color: 'var(--brand)' }}>
                          {initials}
                        </div>
                        <div>
                          <Link href={`/admin/guests/${g.id}`} className="font-semibold hover:underline" style={{ color: 'var(--ink)' }}>
                            {g.full_name}
                          </Link>
                          <p className="text-[11px] font-mono" style={{ color: 'var(--muted-2)' }}>
                            G-{g.id.slice(-3).toUpperCase()}
                            {g.ticket_type === 'vip' && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>· VIP</span>}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p className="text-[12px] truncate max-w-[160px]" style={{ color: 'var(--muted)' }}>{g.email || '—'}</p>
                      <p className="text-[11px] font-mono" style={{ color: 'var(--muted-2)' }}>{g.phone_number || '—'}</p>
                    </td>

                    {/* Ticket */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{ticketLabel}</span>
                    </td>

                    {/* Seat */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono" style={{ color: g.table_number ? 'var(--ink)' : 'var(--muted-2)' }}>
                        {g.table_number ? `T-${g.table_number}` : '—'}
                      </span>
                    </td>

                    {/* WhatsApp */}
                    <td className="px-4 py-3">
                      {waLabel ? (
                        <span className="flex items-center gap-1.5 text-[12px]">
                          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: waDot }} />
                          <span style={{ color: 'var(--muted)' }}>{waLabel}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted-2)' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em]"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>

                    {/* Scan time */}
                    <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--muted-2)' }}>
                      {checkedInTime || '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/guests/${g.id}`} className="p-1 transition hover:opacity-70" style={{ color: 'var(--muted)' }} title="View">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </Link>
                        <button className="p-1 transition hover:opacity-70" style={{ color: 'var(--muted)' }} title="Message">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                        <button className="p-1 text-[15px] leading-none transition hover:opacity-70" style={{ color: 'var(--muted-2)' }}
                          title="Delete" onClick={() => handleDelete(g.id, g.full_name)} disabled={deleting === g.id}>
                          {deleting === g.id ? '…' : '···'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
