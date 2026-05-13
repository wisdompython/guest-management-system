'use client'

import { useState, useEffect } from 'react'
import { api, Guest } from '@/lib/api'

export default function WhatsAppPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [compose, setCompose] = useState('')

  useEffect(() => {
    api.getGuests()
      .then((data) => {
        const withWa = data.results.filter((g) => g.phone_number)
        setGuests(withWa)
        if (withWa.length > 0) setActiveId(withWa[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const total     = guests.length
  const sent      = guests.filter((g) => g.whatsapp_sent).length
  const notSent   = total - sent
  const active    = guests.find((g) => g.id === activeId) ?? null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Left: Guest list ──────────────────────────────── */}
      <div className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>WhatsApp</h2>
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>
            {sent} sent · {notSent} pending · {total} total
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : guests.length === 0 ? (
            <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>No guests with phone numbers.</div>
          ) : guests.map((g) => {
            const initials = g.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
            const isActive = activeId === g.id
            return (
              <button key={g.id} onClick={() => setActiveId(g.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  borderBottom: '1px solid var(--line)',
                  background: isActive ? 'rgba(34,201,160,0.08)' : 'transparent',
                }}>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{g.full_name}</p>
                    <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full"
                      style={{ background: g.whatsapp_sent ? 'var(--brand)' : 'var(--muted-2)' }} />
                  </div>
                  <p className="truncate text-[12px]" style={{ color: 'var(--muted)' }}>
                    {g.phone_number}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--muted-2)' }}>
                    {g.whatsapp_sent ? 'Pass sent' : 'Not sent'}
                    {g.whatsapp_sent_at ? ' · ' + new Date(g.whatsapp_sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Center: Guest detail / thread ─────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {active ? (
          <>
            {/* Header */}
            <div className="flex flex-shrink-0 items-center gap-3 px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(34,201,160,0.2)', color: 'var(--brand)' }}>
                {active.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{active.full_name}</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  {active.phone_number}
                  {active.email ? ' · ' + active.email : ''}
                  {' · '}{active.ticket_type.toUpperCase()}
                  {active.table_number ? ' · T-' + active.table_number : ''}
                </p>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-bold"
                style={{
                  background: active.whatsapp_sent ? 'rgba(34,201,160,0.12)' : 'rgba(245,158,11,0.12)',
                  color: active.whatsapp_sent ? 'var(--brand)' : 'var(--warn)',
                }}>
                {active.whatsapp_sent ? 'Sent' : 'Not sent'}
              </span>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {active.whatsapp_sent ? (
                <div className="flex justify-end">
                  <div className="max-w-[65%] px-4 py-3"
                    style={{ background: 'var(--panel-2)', border: '1px solid rgba(34,201,160,0.15)' }}>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--brand)' }}>Pass delivered</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                      Guest pass sent to {active.phone_number}.
                    </p>
                    {active.whatsapp_sent_at && (
                      <p className="mt-1 text-right text-[11px]" style={{ color: 'var(--muted-2)' }}>
                        {new Date(active.whatsapp_sent_at).toLocaleString('en-GB')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>No messages sent yet.</p>
                  <p className="text-xs" style={{ color: 'var(--muted-2)' }}>
                    Generate a pass first, then send via the compose box below.
                  </p>
                </div>
              )}
            </div>

            {/* Compose */}
            <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  placeholder="Type a message…"
                  rows={2}
                  className="flex-1 resize-none bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
                <button
                  disabled={!compose.trim()}
                  className="flex-shrink-0 px-5 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--brand)' }}>
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {loading ? 'Loading…' : 'Select a guest to view messages.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Right: Stats ───────────────────────────────────── */}
      <div className="w-[220px] flex-shrink-0 overflow-y-auto"
        style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)' }}>

        <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>DELIVERY</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'TOTAL',   value: loading ? '--' : String(total) },
              { label: 'SENT',    value: loading ? '--' : String(sent) },
              { label: 'PENDING', value: loading ? '--' : String(notSent), warn: notSent > 0 },
            ].map(({ label, value, warn }) => (
              <div key={label}>
                <p className="text-[9px]" style={{ color: 'var(--muted-2)' }}>{label}</p>
                <p className="text-[22px] font-bold tabular-nums"
                  style={{ color: warn ? 'var(--warn)' : 'var(--ink)' }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-1" style={{ background: 'var(--line)' }}>
            <div className="h-1 transition-all"
              style={{ width: total > 0 ? `${Math.round((sent / total) * 100)}%` : '0%', background: 'var(--brand)' }} />
          </div>
        </div>

        <div className="p-4">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>QUICK ACTIONS</p>
          <div className="space-y-2">
            <a href="/admin/guests/bulk-upload"
              className="block w-full py-2 text-center text-[12px] font-semibold transition hover:opacity-80"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
              Bulk upload guests
            </a>
            <a href="/admin/fonts"
              className="block w-full py-2 text-center text-[12px] font-semibold transition hover:opacity-80"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
              Pass designer
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
