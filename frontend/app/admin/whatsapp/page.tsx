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
function GuestRow({ guest, onSend, onMessage, sending }: {
  guest: Guest
  onSend: (g: Guest) => void
  onMessage: (g: Guest) => void
  sending: string | null
}) {
  const [showResend, setShowResend] = useState(false)

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
          {guest.whatsapp_sent ? (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--brand)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
              Sent
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--muted-2)' }}>Not sent</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleSendClick} disabled={sending === guest.id}
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

// ── Main page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [guestsLoading, setGuestsLoading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [bulkSending, setBulkSending] = useState(false)
  const [messageGuest, setMessageGuest] = useState<Guest | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error).finally(() => setEventsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedEvent) return
    setGuestsLoading(true)
    api.getGuests({ event: String(selectedEvent.id) })
      .then((d) => setGuests(d.results.filter((g) => g.phone_number)))
      .catch(console.error)
      .finally(() => setGuestsLoading(false))
  }, [selectedEvent])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSend(guest: Guest) {
    setSending(guest.id)
    try {
      await api.sendWhatsApp(guest.id)
      showToast(`Pass queued for ${guest.full_name}`, true)
      setTimeout(() => {
        api.getGuests({ event: String(selectedEvent!.id) })
          .then((d) => setGuests(d.results.filter((g) => g.phone_number)))
      }, 3000)
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
      setTimeout(() => {
        api.getGuests({ event: String(selectedEvent.id) })
          .then((d) => setGuests(d.results.filter((g) => g.phone_number)))
      }, 3000)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Bulk send failed', false)
    } finally { setBulkSending(false) }
  }

  const sent    = guests.filter((g) => g.whatsapp_sent).length
  const unsent  = guests.filter((g) => !g.whatsapp_sent).length

  // ── Event picker ────────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
        {toast && <Toast {...toast} />}
        <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--line)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>Comms</p>
          <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>WhatsApp</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Select an event to manage pass delivery.</p>
        </div>
        {eventsLoading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((ev) => (
              <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                className="text-left rounded-[12px] px-5 py-4 transition hover:border-[var(--brand)]"
                style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{ev.name}</p>
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
    )
  }

  // ── Guest list for event ─────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {toast && <Toast {...toast} />}
      {messageGuest && <MessageModal guest={messageGuest} onClose={() => setMessageGuest(null)} />}

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedEvent(null); setGuests([]) }}
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
            <span><span className="font-bold" style={{ color: 'var(--ink)' }}>{guests.length}</span> total</span>
          </div>
          <div className="flex items-center gap-2">
            {unsent > 0 && (
              <button onClick={() => handleBulkSend(false)} disabled={bulkSending}
                className="rounded-full px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60"
                style={{ background: 'var(--brand)' }}>
                {bulkSending ? 'Sending…' : `Send to ${unsent} unsent`}
              </button>
            )}
            <button onClick={() => handleBulkSend(true)} disabled={bulkSending}
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
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No guests with phone numbers for this event.
          </div>
        ) : (
          <div>
            {guests.map((g) => (
              <GuestRow key={g.id} guest={g} sending={sending}
                onSend={handleSend} onMessage={setMessageGuest} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
