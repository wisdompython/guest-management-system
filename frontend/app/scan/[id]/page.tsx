'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api, Guest } from '@/lib/api'

type State = 'loading' | 'found' | 'checking_in' | 'checked_in' | 'duplicate' | 'error'

const TICKET_COLORS: Record<string, { bg: string; color: string }> = {
  vvip:    { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
  vip:     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  general: { bg: 'rgba(255,255,255,0.06)', color: '#94a3b8' },
}

export default function ScanGuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<State>('loading')
  const [guest, setGuest] = useState<Guest | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Redirect to login if not authenticated, preserving destination
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`/login?next=/scan/${id}`)
    }
  }, [user, authLoading, id, router])

  // Auto-lookup guest once authenticated
  useEffect(() => {
    if (authLoading || !user) return
    api.scanGuest(id)
      .then((g) => {
        setGuest(g)
        setState(g.status === 'checked_in' ? 'duplicate' : 'found')
      })
      .catch(() => {
        setErrorMsg('Guest not found. This QR code may be invalid.')
        setState('error')
      })
  }, [id, user, authLoading])

  async function handleCheckIn() {
    if (!guest) return
    setState('checking_in')
    try {
      const updated = await api.checkIn(guest.id)
      setGuest(updated)
      setState('checked_in')
    } catch {
      setState('duplicate')
    }
  }

  if (authLoading || (!user && state === 'loading')) {
    return <Screen><Spinner /></Screen>
  }

  if (state === 'loading') {
    return (
      <Screen>
        <Spinner />
        <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>Looking up guest…</p>
      </Screen>
    )
  }

  if (state === 'error') {
    return (
      <Screen>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--danger-bg)' }}>
          <svg className="w-8 h-8" style={{ color: 'var(--danger)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Invalid QR Code</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>{errorMsg}</p>
        <button onClick={() => router.push('/admin/check-in')}
          className="w-full py-3.5 text-sm font-semibold text-white rounded-full"
          style={{ background: 'var(--brand)' }}>
          Back to Scanner
        </button>
      </Screen>
    )
  }

  if (state === 'duplicate' && guest) {
    return (
      <Screen>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(245,158,11,0.15)' }}>
          <svg className="w-8 h-8" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>Already Checked In</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{guest.full_name} was already admitted.</p>
        <GuestInfoCard guest={guest} />
        <button onClick={() => router.push('/admin/check-in')}
          className="mt-6 w-full py-3.5 text-sm font-semibold rounded-full"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}>
          Back to Scanner
        </button>
      </Screen>
    )
  }

  if (state === 'checked_in' && guest) {
    return (
      <Screen>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--brand-soft)' }}>
          <svg className="w-8 h-8" style={{ color: 'var(--brand)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--ink)' }}>Welcome!</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Guest successfully checked in.</p>
        <GuestInfoCard guest={guest} highlight />
        <button onClick={() => router.push('/admin/check-in')}
          className="mt-6 w-full py-3.5 text-sm font-semibold text-white rounded-full"
          style={{ background: 'var(--brand)' }}>
          Scan Next Guest
        </button>
      </Screen>
    )
  }

  // state === 'found' || 'checking_in'
  return (
    <Screen>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-6 text-center" style={{ color: 'var(--brand)' }}>
        Guest Found
      </p>
      {guest && <GuestInfoCard guest={guest} />}
      <button
        onClick={handleCheckIn}
        disabled={state === 'checking_in'}
        className="mt-6 w-full py-4 text-sm font-semibold text-white rounded-full transition disabled:opacity-60"
        style={{ background: 'var(--brand)' }}>
        {state === 'checking_in' ? 'Checking in…' : 'Confirm Check-In'}
      </button>
      <button
        onClick={() => router.push('/admin/check-in')}
        className="mt-3 w-full py-3 text-sm font-semibold rounded-full transition"
        style={{ border: '1px solid var(--line)', color: 'var(--muted)', background: 'transparent' }}>
        Cancel
      </button>
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 max-w-sm mx-auto"
      style={{ background: 'var(--bg)' }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
  )
}

function GuestInfoCard({ guest, highlight }: { guest: Guest; highlight?: boolean }) {
  const tc = TICKET_COLORS[guest.ticket_type] ?? TICKET_COLORS.general
  return (
    <div className="w-full rounded-2xl p-5 space-y-4"
      style={{
        background: highlight ? 'var(--brand-soft)' : 'var(--panel)',
        border: `1px solid ${highlight ? 'var(--brand)' : 'var(--line)'}`,
      }}>

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          {guest.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight truncate" style={{ color: 'var(--ink)' }}>
            {guest.full_name}
          </p>
          <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{guest.event_name}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--line)' }} />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <InfoRow label="Ticket" value={
          <span className="px-2 py-0.5 text-xs font-semibold rounded"
            style={{ background: tc.bg, color: tc.color }}>
            {guest.ticket_type.toUpperCase()}
          </span>
        } />
        <InfoRow label="Phone" value={guest.phone_number || '—'} />
        {guest.table_number && <InfoRow label="Table" value={guest.table_number} />}
        {guest.seat_number  && <InfoRow label="Seat"  value={guest.seat_number}  />}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5" style={{ color: 'var(--muted-2)' }}>
        {label}
      </p>
      {typeof value === 'string'
        ? <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{value}</p>
        : value}
    </div>
  )
}
