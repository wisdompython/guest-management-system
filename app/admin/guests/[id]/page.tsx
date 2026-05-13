'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { api, Guest } from '@/lib/api'

const TICKET_COLORS: Record<string, string> = {
  vvip: 'bg-purple-100 text-purple-700',
  vip:  'bg-amber-100 text-amber-700',
  general: 'bg-[var(--bg)] text-[var(--muted)]',
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const MEDIA_BASE = BASE_URL.replace('/api', '')

function absoluteUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${MEDIA_BASE}${path}`
}

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getGuest(id)
      .then(setGuest)
      .catch(() => setError('Could not load guest.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleRegenerateAssets() {
    if (!guest) return
    setRegenerating(true)
    setError('')
    try {
      const result = await api.regenerateAssets(guest.id)
      setGuest(result.guest)
      if (!result.qr_generated || !result.pass_generated) {
        setError(`Partial regeneration: QR ${result.qr_generated ? '✓' : '✗'}, Pass ${result.pass_generated ? '✓' : '✗'}. Check server logs.`)
      }
    } catch {
      setError('Regeneration failed. Check server logs.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleCheckIn() {
    if (!guest) return
    setCheckingIn(true)
    try {
      const updated = await api.checkIn(guest.id)
      setGuest(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Check-in failed.')
    } finally {
      setCheckingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="px-6 py-8 lg:px-8 lg:py-10">
        <p className="text-sm text-red-500">{error || 'Guest not found.'}</p>
      </div>
    )
  }

  const passUrl = absoluteUrl(guest.pass_image)
  const qrUrl   = absoluteUrl(guest.qr_code)
  const checkedIn = guest.status === 'checked_in'

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-5xl">

      {/* Header */}
      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <button
          onClick={() => router.push('/admin/guests')}
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)] transition hover:opacity-70"
        >
          ← Guests
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-4xl text-[var(--ink)]">{guest.full_name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TICKET_COLORS[guest.ticket_type]}`}>
                {guest.ticket_type.toUpperCase()}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                checkedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--bg)] text-[var(--muted)]'
              }`}>
                {checkedIn ? 'Checked In' : 'Registered'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{guest.event_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateAssets}
              disabled={regenerating}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--ink)] disabled:opacity-50"
            >
              {regenerating ? 'Regenerating…' : 'Regenerate Assets'}
            </button>
            {!checkedIn && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
              >
                {checkingIn ? 'Checking in…' : 'Check In Guest'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Left — details */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-white">
            <div className="border-b border-[var(--line)] px-6 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Guest Details</h2>
            </div>
            <dl className="divide-y divide-[var(--line)]">
              {[
                { label: 'Full Name',   value: guest.full_name },
                { label: 'Phone',       value: guest.phone_number },
                { label: 'Email',       value: guest.email || '—' },
                { label: 'Event',       value: guest.event_name || '—' },
                { label: 'Ticket',      value: guest.ticket_type.toUpperCase() },
                { label: 'Table',       value: guest.table_number || '—' },
                { label: 'Seat',        value: guest.seat_number || '—' },
                { label: 'Registered',  value: new Date(guest.registered_at).toLocaleString() },
                { label: 'Checked In',  value: guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString() : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 px-6 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] w-28 flex-shrink-0">{label}</dt>
                  <dd className="text-sm text-[var(--ink)] text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* WhatsApp status */}
          <div className={`rounded-[20px] border p-4 flex items-center gap-4 ${
            guest.whatsapp_sent
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-[var(--line)] bg-white'
          }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
              guest.whatsapp_sent ? 'bg-emerald-100' : 'bg-[var(--bg)]'
            }`}>💬</div>
            <div>
              <p className={`text-sm font-semibold ${guest.whatsapp_sent ? 'text-emerald-700' : 'text-[var(--muted)]'}`}>
                {guest.whatsapp_sent ? 'Pass sent via WhatsApp' : 'WhatsApp pass not sent yet'}
              </p>
              {guest.whatsapp_sent_at && (
                <p className="text-xs text-emerald-600 mt-0.5">Sent {new Date(guest.whatsapp_sent_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — pass + QR */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Personalised Pass</h2>
              {passUrl && (
                <a href={passUrl} download target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)] hover:underline">
                  Download ↓
                </a>
              )}
            </div>
            <div className="p-4">
              {passUrl ? (
                <img src={passUrl} alt={`${guest.full_name} pass`} className="w-full rounded-[14px] border border-[var(--line)] object-contain" />
              ) : (
                <div className="rounded-[14px] border-2 border-dashed border-[var(--line)] py-14 text-center">
                  <p className="text-sm text-[var(--muted)]">No pass generated yet.</p>
                  <p className="text-xs text-[var(--line)] mt-1">Upload a design template to the event first.</p>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">QR Code</h2>
              {qrUrl && (
                <a href={qrUrl} download target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)] hover:underline">
                  Download ↓
                </a>
              )}
            </div>
            <div className="p-6 flex flex-col items-center gap-3">
              {qrUrl ? (
                <>
                  <img src={qrUrl} alt="QR Code" className="w-44 h-44 rounded-[14px]" style={{ background: '#111', padding: '10px' }} />
                  <p className="text-xs text-[var(--muted)] font-mono break-all text-center leading-relaxed">ID: {guest.id}</p>
                </>
              ) : (
                <div className="rounded-[14px] border-2 border-dashed border-[var(--line)] w-full py-10 text-center">
                  <p className="text-sm text-[var(--muted)]">No QR code generated yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
