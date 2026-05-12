'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { api, Guest } from '@/lib/api'

const TICKET_COLORS: Record<string, string> = {
  vvip: 'bg-fuchsia-100 text-fuchsia-700',
  vip:  'bg-amber-100 text-amber-700',
  general: 'bg-stone-100 text-stone-600',
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
      <div className="px-6 py-6 lg:px-8 lg:py-8">
        <p className="text-sm text-red-500">{error || 'Guest not found.'}</p>
      </div>
    )
  }

  const passUrl = absoluteUrl(guest.pass_image)
  const qrUrl   = absoluteUrl(guest.qr_code)
  const checkedIn = guest.status === 'checked_in'

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-5xl">

      {/* Header banner */}
      <div className="mb-8 rounded-[28px] bg-[#f4f7ff] px-6 py-6">
        <button
          onClick={() => router.push('/admin/guests')}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)] mb-3 block transition-opacity hover:opacity-70"
        >
          ← Guest directory
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h1 className="font-display text-4xl text-[var(--ink)]">{guest.full_name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TICKET_COLORS[guest.ticket_type]}`}>
                {guest.ticket_type.toUpperCase()}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                checkedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
              }`}>
                {checkedIn ? 'Checked In' : 'Registered'}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-[var(--muted)]">{guest.event_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateAssets}
              disabled={regenerating}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-stone-50 disabled:opacity-50"
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
        <div className="mb-6 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Left — Guest info */}
        <div className="space-y-5">

          {/* Details card */}
          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-6 py-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Guest Details</h2>
            </div>
            <dl className="divide-y divide-stone-100">
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
                <div key={label} className="flex items-start justify-between gap-4 px-6 py-3.5">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] w-28 flex-shrink-0">{label}</dt>
                  <dd className="text-sm text-[var(--ink)] text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* WhatsApp status */}
          <div className={`rounded-[22px] border p-5 flex items-center gap-4 ${
            guest.whatsapp_sent
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
              guest.whatsapp_sent ? 'bg-emerald-100' : 'bg-stone-200'
            }`}>
              💬
            </div>
            <div>
              <p className={`text-sm font-semibold ${guest.whatsapp_sent ? 'text-emerald-700' : 'text-[var(--muted)]'}`}>
                {guest.whatsapp_sent ? 'Pass sent via WhatsApp' : 'WhatsApp pass not sent yet'}
              </p>
              {guest.whatsapp_sent_at && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Sent {new Date(guest.whatsapp_sent_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right — Pass + QR */}
        <div className="space-y-5">

          {/* Personalised pass */}
          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Personalised Pass</h2>
              {passUrl && (
                <a
                  href={passUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)] hover:underline"
                >
                  Download ↓
                </a>
              )}
            </div>
            <div className="p-4">
              {passUrl ? (
                <img
                  src={passUrl}
                  alt={`${guest.full_name} pass`}
                  className="w-full rounded-[18px] border border-stone-100 object-contain"
                />
              ) : (
                <div className="rounded-[18px] border-2 border-dashed border-stone-200 py-16 text-center">
                  <p className="text-sm text-[var(--muted)]">No pass generated yet.</p>
                  <p className="text-xs text-stone-300 mt-1">Upload a design template to the event first.</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">QR Code</h2>
              {qrUrl && (
                <a
                  href={qrUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)] hover:underline"
                >
                  Download ↓
                </a>
              )}
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              {qrUrl ? (
                <>
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    className="w-48 h-48 rounded-[18px] border border-stone-100"
                  />
                  <div className="text-center">
                    <p className="text-xs text-[var(--muted)] font-mono break-all leading-relaxed">
                      ID: {guest.id}
                    </p>
                    <p className="text-xs text-stone-300 mt-1">Scan encodes event, name &amp; ID</p>
                  </div>
                </>
              ) : (
                <div className="rounded-[18px] border-2 border-dashed border-stone-200 w-full py-12 text-center">
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
