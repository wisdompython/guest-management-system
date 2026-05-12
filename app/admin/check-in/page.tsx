'use client'

import { useState, useRef, useEffect } from 'react'
import { api, Guest } from '@/lib/api'

type ScanState = 'idle' | 'loading' | 'found' | 'checked_in' | 'duplicate' | 'invalid'

const TICKET_COLORS: Record<string, string> = {
  vvip:    'bg-purple-100 text-purple-700 border-purple-200',
  vip:     'bg-amber-100 text-amber-700 border-amber-200',
  general: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function CheckInPage() {
  const [token, setToken] = useState('')
  const [state, setState] = useState<ScanState>('idle')
  const [guest, setGuest] = useState<Guest | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state === 'idle') inputRef.current?.focus()
  }, [state])

  async function handleLookup(e?: React.FormEvent) {
    e?.preventDefault()
    const t = token.trim()
    if (!t) return
    setState('loading')
    setGuest(null)

    try {
      const g = await api.scanGuest(t)
      setGuest(g)
      setState(g.status === 'checked_in' ? 'duplicate' : 'found')
    } catch {
      setState('invalid')
    }
  }

  async function handleCheckIn() {
    if (!guest) return
    setCheckingIn(true)
    try {
      const updated = await api.checkIn(guest.id)
      setGuest(updated)
      setState('checked_in')
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('409')) {
        setState('duplicate')
      } else {
        setState('invalid')
      }
    } finally {
      setCheckingIn(false)
    }
  }

  function reset() {
    setToken('')
    setState('idle')
    setGuest(null)
    setCheckingIn(false)
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (state === 'checked_in' && guest) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center px-6 py-12 text-white">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-1 text-center">Checked In!</h1>
        <p className="text-indigo-200 text-sm mb-8 text-center">Welcome to the event</p>

        <div className="w-full max-w-sm bg-white/10 rounded-2xl px-6 py-5 space-y-3 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Name</span>
            <span className="text-white font-bold text-base">{guest.full_name}</span>
          </div>
          <div className="border-t border-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Ticket</span>
            <span className="text-white font-semibold text-sm">{guest.ticket_type.toUpperCase()}</span>
          </div>
          {guest.table_number && (
            <>
              <div className="border-t border-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Table</span>
                <span className="text-white font-semibold text-sm">{guest.table_number}{guest.seat_number ? ` / Seat ${guest.seat_number}` : ''}</span>
              </div>
            </>
          )}
          {guest.event_name && (
            <>
              <div className="border-t border-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Event</span>
                <span className="text-white font-semibold text-sm text-right max-w-[60%]">{guest.event_name}</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={reset}
          className="w-full max-w-sm bg-white text-indigo-700 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
        >
          Scan Next Guest
        </button>
      </div>
    )
  }

  // ── Duplicate state ────────────────────────────────────────────────────────
  if (state === 'duplicate' && guest) {
    return (
      <div className="min-h-screen bg-amber-500 flex flex-col items-center justify-center px-6 py-12 text-white">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3C6.477 3 2 7.477 2 12s4.477 9 10 9 10-4.477 10-9S17.523 3 12 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-1 text-center">Already Checked In</h1>
        <p className="text-amber-100 text-sm mb-8 text-center">
          {guest.checked_in_at
            ? `Checked in at ${new Date(guest.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'This guest has already been checked in.'}
        </p>

        <div className="w-full max-w-sm bg-white/10 rounded-2xl px-6 py-5 space-y-3 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Name</span>
            <span className="text-white font-bold text-base">{guest.full_name}</span>
          </div>
          <div className="border-t border-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Ticket</span>
            <span className="text-white font-semibold text-sm">{guest.ticket_type.toUpperCase()}</span>
          </div>
        </div>

        <button
          onClick={reset}
          className="w-full max-w-sm bg-white text-amber-600 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
        >
          Scan Next Guest
        </button>
      </div>
    )
  }

  // ── Invalid state ──────────────────────────────────────────────────────────
  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-red-500 flex flex-col items-center justify-center px-6 py-12 text-white">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-1 text-center">Not Found</h1>
        <p className="text-red-100 text-sm mb-8 text-center">This QR code is not recognised.</p>

        <button
          onClick={reset}
          className="w-full max-w-sm bg-white text-red-600 font-bold rounded-2xl py-4 text-base active:scale-95 transition-transform"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── Guest found — confirm check-in ─────────────────────────────────────────
  if (state === 'found' && guest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col px-4 py-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={reset}
            className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 bg-white"
          >
            ←
          </button>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Guest Found</p>
            <p className="text-sm text-gray-700 font-medium">Confirm to check in</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-6 shadow-sm">
          <div className="px-6 py-6 border-b border-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Guest</p>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{guest.full_name}</h2>
                {guest.event_name && (
                  <p className="text-sm text-gray-400 mt-1">{guest.event_name}</p>
                )}
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 mt-1 ${TICKET_COLORS[guest.ticket_type] ?? TICKET_COLORS.general}`}>
                {guest.ticket_type.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-gray-50">
            {[
              { label: 'Phone', value: guest.phone_number },
              { label: 'Registered', value: new Date(guest.registered_at).toLocaleDateString() },
              { label: 'Table', value: guest.table_number || '—' },
              { label: 'Seat', value: guest.seat_number || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 text-white font-bold rounded-2xl py-5 text-lg transition-all mb-3"
        >
          {checkingIn ? 'Checking in…' : 'Confirm Check-In'}
        </button>
        <button
          onClick={reset}
          className="w-full border border-gray-200 text-gray-600 font-semibold rounded-2xl py-4 text-sm transition-colors active:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  // ── Idle / loading state ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-4 py-10 max-w-lg mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900">QR Check-In</h1>
        <p className="text-sm text-gray-400 mt-1">Paste or type the guest token below</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 p-8 mb-6 text-center shadow-sm">
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.75h.75v.75h-.75v-.75zM16.75 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75H13.5v-.75zM13.5 18.75h.75v.75H13.5v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5v-.75z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Use a QR scanner app</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Scan the guest pass QR code with your phone camera or a dedicated scanner,
          then paste the result below.
        </p>
      </div>

      <form onSubmit={handleLookup} className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste token or guest UUID…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-300"
        />
        <button
          type="submit"
          disabled={state === 'loading' || !token.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl py-4 text-base transition-all"
        >
          {state === 'loading' ? 'Looking up…' : 'Look Up Guest'}
        </button>
      </form>
    </div>
  )
}
