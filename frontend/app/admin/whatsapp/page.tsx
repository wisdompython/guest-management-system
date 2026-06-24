'use client'

import { useState, useEffect } from 'react'
import { api, Guest, Event } from '@/lib/api'

function showInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
      style={{ background: ok ? 'var(--brand)' : '#ef4444' }}>
      {msg}
    </div>
  )
}

// ── Message modal ────────────────────────────────────────────────────────────
function MessageModal({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      await api.sendMessage(guest.id, message.trim())
      setSent(true)
      setTimeout(onClose, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message failed to send.')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] overflow-hidden shadow-2xl"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{guest.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{guest.phone_number}</p>
          </div>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--muted)' }}>✕</button>
        </div>
        <div className="p-5 space-y-3">
          {error ? (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          ) : (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
              Only works within 24h of the guest messaging your business number first.
            </p>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your message…"
            className="w-full rounded-[12px] px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 rounded-full py-2.5 text-sm font-semibold transition"
            style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || sent || !message.trim()}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: 'var(--brand)' }}>
            {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bulk send confirm modal ──────────────────────────────────────────────────
function BulkSendModal({ guests, resend, totalCount, unsentCount, onConfirm, onClose }: {
  guests: Guest[]
  resend: boolean
  totalCount: number
  unsentCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  const targetCount = resend ? totalCount : unsentCount
  const sample = (resend ? guests : guests.filter((g) => !g.whatsapp_sent)).slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[20px] overflow-hidden shadow-2xl"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
            {resend ? 'Resend all passes' : `Send to ${targetCount} guest${targetCount !== 1 ? 's' : ''}`}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {resend
              ? `This will re-send the pass to all ${targetCount} guests in this event, including those already sent.`
              : `Queues WhatsApp pass delivery for ${targetCount} unsent guest${targetCount !== 1 ? 's' : ''} across all pages.`}
          </p>
          {sample.length > 0 && (
            <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)', color: 'var(--muted-2)' }}>
                Sample recipients {targetCount > 5 ? `(first 5 of ${targetCount})` : ''}
              </p>
              {sample.map((g) => (
                <div key={g.id} className="flex items-center gap-2.5 px-3 py-2"
                  style={{ borderBottom: '1px solid var(--line)' }}>
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                    {showInitials(g.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)' }}>{g.full_name}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--muted-2)' }}>{g.phone_number}</p>
                  </div>
                  {g.whatsapp_sent && (
                    <span className="text-[10px]" style={{ color: 'var(--brand)' }}>Resend</span>
                  )}
                </div>
              ))}
              {targetCount > 5 && (
                <p className="px-3 py-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                  + {targetCount - 5} more…
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5 pt-2">
          <button onClick={onClose} className="flex-1 rounded-full py-2.5 text-sm font-semibold"
            style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}>
            {resend ? `Resend all ${targetCount}` : `Send ${targetCount}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resend confirm modal ─────────────────────────────────────────────────────
function ResendModal({ guest, onConfirm, onClose }: { guest: Guest; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[20px] overflow-hidden shadow-2xl"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-5">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Resend pass to {guest.full_name}?</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Pass was already sent on {guest.whatsapp_sent_at ? new Date(guest.whatsapp_sent_at).toLocaleDateString() : 'a previous date'}. This will send it again.
          </p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 rounded-full py-2.5 text-sm font-semibold"
            style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--brand)' }}>Resend</button>
        </div>
      </div>
    </div>
  )
}

// ── Guest row ────────────────────────────────────────────────────────────────
function GuestRow({ guest, onSend, onMessage, sending, polling }: {
  guest: Guest
  onSend: (g: Guest) => void
  onMessage: (g: Guest) => void
  sending: string | null
  polling: Set<string>
}) {
  const [showResend, setShowResend] = useState(false)
  const isPolling = polling.has(guest.id)

  function handleSendClick() {
    if (guest.whatsapp_sent) { setShowResend(true); return }
    onSend(guest)
  }

  return (
    <>
      {showResend && (
        <ResendModal guest={guest} onClose={() => setShowResend(false)}
          onConfirm={() => { setShowResend(false); onSend(guest) }} />
      )}
      <div className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-[rgba(255,255,255,0.03)]"
        style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          {showInitials(guest.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>{guest.full_name}</p>
          <p className="text-xs font-mono" style={{ color: 'var(--muted-2)' }}>{guest.phone_number}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPolling ? (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
              <span className="inline-block h-3 w-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--muted) transparent var(--muted) var(--muted)' }} />
              Delivering…
            </span>
          ) : guest.whatsapp_sent ? (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--brand)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
              Sent {guest.whatsapp_sent_at ? new Date(guest.whatsapp_sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--muted-2)' }}>Not sent</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleSendClick} disabled={sending === guest.id || isPolling}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50"
            style={{
              background: guest.whatsapp_sent ? 'transparent' : 'var(--brand)',
              color: guest.whatsapp_sent ? 'var(--muted)' : '#fff',
              border: guest.whatsapp_sent ? '1px solid var(--line)' : 'none',
            }}>
            {sending === guest.id ? '…' : guest.whatsapp_sent ? 'Resend' : 'Send Pass'}
          </button>
          <button onClick={() => onMessage(guest)} title="Send message"
            className="rounded-full p-1.5 transition hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: 'var(--muted)' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

const PAGE_SIZE = 50

// ── Main page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [count, setCount] = useState(0)
  const [waSent, setWaSent] = useState(0)
  const [waUnsent, setWaUnsent] = useState(0)
  const [page, setPage] = useState(1)
  const [guestsLoading, setGuestsLoading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [polling, setPolling] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkModal, setBulkModal] = useState<{ resend: boolean } | null>(null)
  const [messageGuest, setMessageGuest] = useState<Guest | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [selectedEvent?.id])

  useEffect(() => {
    if (!selectedEvent) return
    setGuestsLoading(true)
    api.getGuests({ event: String(selectedEvent.id), page: String(page), has_phone: '1' })
      .then((d) => {
        setGuests(d.results)
        setCount(d.count)
        setWaSent(d.stats?.wa_sent ?? 0)
        setWaUnsent(d.stats?.wa_unsent ?? 0)
      })
      .catch(console.error)
      .finally(() => setGuestsLoading(false))
  }, [selectedEvent, page])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function refreshGuests() {
    if (!selectedEvent) return
    api.getGuests({ event: String(selectedEvent.id), page: String(page), has_phone: '1' })
      .then((d) => {
        setGuests(d.results)
        setCount(d.count)
        setWaSent(d.stats?.wa_sent ?? 0)
        setWaUnsent(d.stats?.wa_unsent ?? 0)
      })
      .catch(console.error)
  }

  async function handleSend(guest: Guest) {
    setSending(guest.id)
    try {
      await api.sendWhatsApp(guest.id)
      showToast(`Pass queued for ${guest.full_name}`, true)
      // Mark as polling and check every 4s for up to 32s
      setPolling((prev) => new Set(prev).add(guest.id))
      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const updated = await api.getGuest(guest.id)
          if (updated.whatsapp_sent) {
            setGuests((prev) => prev.map((g) => g.id === guest.id ? updated : g))
            setPolling((prev) => { const next = new Set(prev); next.delete(guest.id); return next })
            return
          }
        } catch {}
        if (attempts < 8) setTimeout(poll, 4000)
        else {
          setPolling((prev) => { const next = new Set(prev); next.delete(guest.id); return next })
          refreshGuests()
        }
      }
      setTimeout(poll, 4000)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Send failed', false)
    } finally { setSending(null) }
  }

  async function handleBulkSend(resend: boolean) {
    if (!selectedEvent) return
    setBulkSending(true)
    try {
      const res = await api.bulkSendWhatsApp(selectedEvent.id, resend)
      showToast(`Queued — task ${res.task_id?.slice(0, 8) ?? '?'}`, true)
      setTimeout(refreshGuests, 3000)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Bulk send failed', false)
    } finally { setBulkSending(false) }
  }

  const sent   = waSent
  const unsent = waUnsent

  // ── Event picker ────────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        {toast && <Toast {...toast} />}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--brand)' }}>Comms</p>
            <h1 className="text-xl font-bold mt-0.5" style={{ color: 'var(--ink)' }}>WhatsApp</h1>
          </div>
          <a href="/admin/events/add"
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}>+ New Event</a>
        </div>

        <div className="flex-1 overflow-auto">
          {eventsLoading ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No events yet.</p>
              <a href="/admin/events/add"
                className="rounded-full px-5 py-2 text-xs font-semibold text-white"
                style={{ background: 'var(--brand)' }}>+ Create an event</a>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-widest"
                  style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--panel)' }}>
                  <th className="px-6 py-3 text-left">Event</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Venue</th>
                  <th className="px-6 py-3 text-left">Guests</th>
                  <th className="px-6 py-3 text-left">WA Sent</th>
                  <th className="px-6 py-3 text-left w-8" />
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}
                    className="group cursor-pointer transition-colors hover:bg-[var(--panel)]"
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onClick={() => setSelectedEvent(ev)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: 'var(--ink)' }}>{ev.name}</span>
                        {ev.is_ended && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ background: 'rgba(156,163,175,0.15)', color: 'var(--muted)' }}>Ended</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="max-w-[160px] truncate px-6 py-4 text-xs" style={{ color: 'var(--muted)' }}>
                      {ev.venue || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                      {ev.guest_count}
                    </td>
                    <td className="px-6 py-4">
                      {ev.guest_count > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ background: 'var(--brand)', width: `${Math.round((ev.checked_in_count / ev.guest_count) * 100)}%` }} />
                          </div>
                          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                            {ev.checked_in_count}/{ev.guest_count}
                          </span>
                        </div>
                      ) : <span className="text-xs" style={{ color: 'var(--muted-2)' }}>—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--brand)' }}>Open →</span>
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

  // ── Guest list for event ─────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {toast && <Toast {...toast} />}
      {messageGuest && <MessageModal guest={messageGuest} onClose={() => setMessageGuest(null)} />}
      {bulkModal && (
        <BulkSendModal
          guests={guests} resend={bulkModal.resend}
          totalCount={count} unsentCount={waUnsent}
          onConfirm={() => handleBulkSend(bulkModal.resend)}
          onClose={() => setBulkModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedEvent(null); setGuests([]); setCount(0); setPage(1) }}
            className="text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--muted)' }}>
            ← Events
          </button>
          <span style={{ color: 'var(--line)' }}>/</span>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{selectedEvent.name}</h1>
          </div>
        </div>

        {/* Stats + bulk actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <span><span className="font-bold" style={{ color: 'var(--ink)' }}>{sent}</span> sent</span>
            <span><span className="font-bold" style={{ color: 'var(--ink)' }}>{unsent}</span> pending</span>
            <span><span className="font-bold" style={{ color: 'var(--ink)' }}>{count}</span> total</span>
          </div>
          <div className="flex items-center gap-2">
            {unsent > 0 && (
              <button onClick={() => setBulkModal({ resend: false })} disabled={bulkSending}
                className="rounded-full px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60"
                style={{ background: 'var(--brand)' }}>
                {bulkSending ? 'Sending…' : `Send to ${unsent} unsent`}
              </button>
            )}
            <button onClick={() => setBulkModal({ resend: true })} disabled={bulkSending}
              className="rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-60"
              style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
              Resend all
            </button>
          </div>
        </div>
      </div>

      {/* Guest list */}
      <div className="flex-1 overflow-auto">
        {guestsLoading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : guests.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--panel)' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.128.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 23 17l-.08.08v-.16z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No guests with phone numbers</p>
              <p className="mt-1 text-xs max-w-xs" style={{ color: 'var(--muted)' }}>
                Add phone numbers to guests for this event to send WhatsApp passes.
              </p>
            </div>
            <a href={`/admin/guests/bulk-upload?event=${selectedEvent?.id}`}
              className="rounded-full px-5 py-2 text-xs font-semibold transition"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
              Bulk upload guests
            </a>
          </div>
        ) : (
          <div>
            {guests.map((g) => (
              <GuestRow key={g.id} guest={g} sending={sending} polling={polling}
                onSend={handleSend} onMessage={setMessageGuest} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
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
                <span key={`e-${i}`} className="px-1 text-xs" style={{ color: 'var(--muted-2)' }}>…</span>
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
