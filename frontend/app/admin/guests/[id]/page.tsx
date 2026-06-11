'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { api, Guest } from '@/lib/api'
import { GuestDetailsCard } from '@/components/guests/GuestDetailsCard'
import { GuestAssetsCard } from '@/components/guests/GuestAssetsCard'

const TICKET_COLORS: Record<string, { bg: string; color: string }> = {
  vvip:    { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  vip:     { bg: 'rgba(245,158,11,0.15)',  color: 'var(--warn)' },
  general: { bg: 'rgba(255,255,255,0.06)', color: 'var(--muted)' },
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
    api.getGuest(id).then(setGuest).catch(() => setError('Could not load guest.')).finally(() => setLoading(false))
  }, [id])

  async function handleRegenerateAssets() {
    if (!guest) return
    setRegenerating(true); setError('')
    try {
      const result = await api.regenerateAssets(guest.id)
      setGuest(result.guest)
      if (!result.qr_generated || !result.pass_generated)
        setError(`Partial regeneration: QR ${result.qr_generated ? '✓' : '✗'}, Pass ${result.pass_generated ? '✓' : '✗'}. Check server logs.`)
    } catch { setError('Regeneration failed. Check server logs.') }
    finally { setRegenerating(false) }
  }

  async function handleCheckIn() {
    if (!guest) return
    setCheckingIn(true)
    try { const updated = await api.checkIn(guest.id); setGuest(updated) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Check-in failed.') }
    finally { setCheckingIn(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-sm text-[var(--muted)]">Loading…</p></div>
  if (!guest) return <div className="px-6 py-8 lg:px-8 lg:py-10"><p className="text-sm text-red-500">{error || 'Guest not found.'}</p></div>

  const passUrl = absoluteUrl(guest.pass_image)
  const qrUrl   = absoluteUrl(guest.qr_code)
  const checkedIn = guest.status === 'checked_in'

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-5xl">
      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <button onClick={() => router.push('/admin/guests')}
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)] transition hover:opacity-70">
          ← Guests
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-4xl text-[var(--ink)]">{guest.full_name}</h1>
              {(() => { const tc = TICKET_COLORS[guest.ticket_type] ?? TICKET_COLORS.general; return (
                <span className="px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: tc.bg, color: tc.color }}>
                  {guest.ticket_type.toUpperCase()}
                </span>
              )})()}
              <span className="px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: checkedIn ? 'var(--brand-soft)' : 'rgba(255,255,255,0.06)', color: checkedIn ? 'var(--brand)' : 'var(--muted)' }}>
                {checkedIn ? 'Checked In' : 'Registered'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{guest.event_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRegenerateAssets} disabled={regenerating}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--ink)] disabled:opacity-50">
              {regenerating ? 'Regenerating…' : 'Regenerate Assets'}
            </button>
            {!checkedIn && (
              <button onClick={handleCheckIn} disabled={checkingIn}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">
                {checkingIn ? 'Checking in…' : 'Check In Guest'}
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <div className="mb-5 px-5 py-3.5 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}
      <div className="grid lg:grid-cols-2 gap-5">
        <GuestDetailsCard guest={guest} />
        <GuestAssetsCard guest={guest} passUrl={passUrl} qrUrl={qrUrl} />
      </div>
    </div>
  )
}
