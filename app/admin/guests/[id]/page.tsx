'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { api, Guest } from '@/lib/api'

const TICKET_COLORS: Record<string, string> = {
  vvip: 'bg-purple-100 text-purple-700',
  vip:  'bg-amber-100 text-amber-700',
  general: 'bg-gray-100 text-gray-600',
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-red-500">{error || 'Guest not found.'}</p>
      </div>
    )
  }

  const passUrl = absoluteUrl(guest.pass_image)
  const qrUrl   = absoluteUrl(guest.qr_code)
  const checkedIn = guest.status === 'checked_in'

  return (
    <div className="px-8 py-8 max-w-5xl">

      {/* Back + header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/guests')}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Guests
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{guest.full_name}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TICKET_COLORS[guest.ticket_type]}`}>
              {guest.ticket_type.toUpperCase()}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              checkedIn ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {checkedIn ? 'Checked In' : 'Registered'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{guest.event_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateAssets}
            disabled={regenerating}
            className="text-sm font-semibold border border-gray-200 hover:border-gray-400 text-gray-600 disabled:opacity-50 rounded-lg px-4 py-2 transition-colors"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate Assets'}
          </button>
          {!checkedIn && (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-5 py-2 transition-colors"
            >
              {checkingIn ? 'Checking in…' : 'Check In Guest'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Left — Guest info */}
        <div className="space-y-6">

          {/* Details card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Guest Details</h2>
            <dl className="space-y-4">
              {[
                { label: 'Full Name',    value: guest.full_name },
                { label: 'Phone',        value: guest.phone_number },
                { label: 'Email',        value: guest.email || '—' },
                { label: 'Event',        value: guest.event_name || '—' },
                { label: 'Ticket Type',  value: guest.ticket_type.toUpperCase() },
                { label: 'Table',        value: guest.table_number || '—' },
                { label: 'Seat',         value: guest.seat_number || '—' },
                { label: 'Registered',   value: new Date(guest.registered_at).toLocaleString() },
                { label: 'Checked In',   value: guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString() : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0 w-28">{label}</dt>
                  <dd className="text-sm text-gray-800 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* WhatsApp status card */}
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
            guest.whatsapp_sent
              ? 'bg-green-50 border-green-100'
              : 'bg-gray-50 border-gray-100'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
              guest.whatsapp_sent ? 'bg-green-100' : 'bg-gray-200'
            }`}>
              💬
            </div>
            <div>
              <p className={`text-sm font-semibold ${guest.whatsapp_sent ? 'text-green-700' : 'text-gray-500'}`}>
                {guest.whatsapp_sent ? 'Pass sent via WhatsApp' : 'WhatsApp pass not sent yet'}
              </p>
              {guest.whatsapp_sent_at && (
                <p className="text-xs text-green-600 mt-0.5">
                  Sent {new Date(guest.whatsapp_sent_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right — Pass + QR */}
        <div className="space-y-6">

          {/* Personalised pass */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personalised Pass</h2>
              {passUrl && (
                <a
                  href={passUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
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
                  className="w-full rounded-xl border border-gray-100 object-contain"
                />
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                  <p className="text-sm text-gray-400">No pass generated yet.</p>
                  <p className="text-xs text-gray-300 mt-1">
                    This happens when the event has no design template uploaded.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">QR Code</h2>
              {qrUrl && (
                <a
                  href={qrUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
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
                    className="w-48 h-48 rounded-xl border border-gray-100"
                  />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                      ID: {guest.id}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">Scan encodes event, name &amp; ID</p>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 w-full py-12 text-center">
                  <p className="text-sm text-gray-400">No QR code generated yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
