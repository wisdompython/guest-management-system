'use client'

import { useState, useRef, useEffect } from 'react'
import { api, Guest } from '@/lib/api'
import {
  CheckedInScreen,
  DuplicateScreen,
  InvalidScreen,
  GuestFoundScreen,
} from '@/components/check-in/CheckInScreens'

type ScanState = 'idle' | 'loading' | 'found' | 'checked_in' | 'duplicate' | 'invalid'

export default function CheckInPage() {
  const [token, setToken]       = useState('')
  const [state, setState]       = useState<ScanState>('idle')
  const [guest, setGuest]       = useState<Guest | null>(null)
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
      setState(err instanceof Error && err.message.includes('409') ? 'duplicate' : 'invalid')
    } finally {
      setCheckingIn(false)
    }
  }

  function reset() {
    setToken(''); setState('idle'); setGuest(null); setCheckingIn(false)
  }

  if (state === 'checked_in' && guest) return <CheckedInScreen guest={guest} onNext={reset} />
  if (state === 'duplicate'  && guest) return <DuplicateScreen guest={guest} onNext={reset} />
  if (state === 'invalid')             return <InvalidScreen onReset={reset} />
  if (state === 'found'      && guest) return (
    <GuestFoundScreen guest={guest} checkingIn={checkingIn} onConfirm={handleCheckIn} onCancel={reset} />
  )

  return (
    <div className="min-h-screen flex flex-col px-4 py-10 max-w-lg mx-auto" style={{ background: 'var(--bg)' }}>
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--brand)' }}>Door Operations</p>
        <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--ink)' }}>QR Check-In</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Paste or type the guest token below</p>
      </div>

      <div className="p-8 mb-6 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-soft)' }}>
          <svg className="w-8 h-8" style={{ color: 'var(--brand)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.75h.75v.75h-.75v-.75zM16.75 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75H13.5v-.75zM13.5 18.75h.75v.75H13.5v-.75zM18.75 13.5h.75v.75h-.75v-.75zM18.75 18.75h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5v-.75z" />
          </svg>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Use a QR scanner app</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
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
          className="w-full bg-[rgba(255,255,255,0.06)] px-4 py-4 text-sm text-[var(--ink)] font-mono focus:outline-none placeholder:text-[var(--muted-2)]"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={state === 'loading' || !token.trim()}
          className="w-full font-semibold py-4 text-sm tracking-[0.06em] uppercase active:scale-95 disabled:opacity-50 transition-all text-white"
          style={{ background: 'var(--brand)' }}
        >
          {state === 'loading' ? 'Looking up…' : 'Look Up Guest'}
        </button>
      </form>
    </div>
  )
}
