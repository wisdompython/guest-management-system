'use client'

import { useEffect, useRef, useState } from 'react'
import { api, Guest, Event } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  CheckedInScreen,
  DuplicateScreen,
  InvalidScreen,
  GuestFoundScreen,
} from '@/components/check-in/CheckInScreens'
import type { InvalidReason } from '@/components/check-in/CheckInScreens'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

type ScanState = 'idle' | 'loading' | 'found' | 'checked_in' | 'duplicate' | 'invalid'

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

function partyFullyCheckedIn(guest: Guest) {
  return guest.status === 'checked_in' && (!guest.plus_one_attending || guest.has_named_plus_one || guest.plus_one_checked_in)
}

function looksLikeCompleteScan(value: string) {
  return UUID_PATTERN.test(value.trim())
}

export default function CheckInPage() {
  const { isSuperAdmin, isScanner } = useAuth()
  const [token, setToken] = useState('')
  const [state, setState] = useState<ScanState>('idle')
  const [guest, setGuest] = useState<Guest | null>(null)
  const [invalidReason, setInvalidReason] = useState<InvalidReason>('not_found')
  const [checkingIn, setCheckingIn] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [nameResults, setNameResults] = useState<Guest[]>([])
  const [nameSearching, setNameSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.getEvents().then((eventList) => {
      setEvents(eventList)
      if (eventList.length > 0) setSelectedEventId(String(eventList[0].id))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (state === 'idle') {
      const frame = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(frame)
    }
  }, [state])

  useEffect(() => () => {
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
  }, [])

  async function lookupGuest(raw: string) {
    const value = raw.trim()
    if (!value || state === 'loading') return
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    setState('loading')
    setGuest(null)
    try {
      const foundGuest = await api.scanGuest(value)
      setGuest(foundGuest)
      setState(partyFullyCheckedIn(foundGuest) ? 'duplicate' : 'found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (!navigator.onLine || message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror')) {
        setInvalidReason('offline')
      } else if (message.includes('404') || message.toLowerCase().includes('not found') || message.toLowerCase().includes('invalid')) {
        setInvalidReason('not_found')
      } else {
        setInvalidReason('server_error')
      }
      setState('invalid')
    }
  }

  function handleScanInput(value: string) {
    setToken(value)
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    if (looksLikeCompleteScan(value)) {
      scanTimerRef.current = setTimeout(() => void lookupGuest(value), 120)
    }
  }

  async function handleScanSubmit(event: React.FormEvent) {
    event.preventDefault()
    await lookupGuest(token)
  }

  function handleNameSearch(value: string, eventId?: string) {
    setNameQuery(value)
    setNameResults([])
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    if (value.trim().length < 2) return
    const resolvedEventId = eventId ?? selectedEventId
    nameTimerRef.current = setTimeout(async () => {
      setNameSearching(true)
      try {
        const params: Record<string, string> = { search: value.trim(), page_size: '10' }
        if (resolvedEventId) params.event = resolvedEventId
        const data = await api.getGuests(params)
        setNameResults(data.results)
      } catch {
        setNameResults([])
      } finally {
        setNameSearching(false)
      }
    }, 350)
  }

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId)
    setNameResults([])
    if (nameQuery.trim().length >= 2) handleNameSearch(nameQuery, eventId)
  }

  async function handleCheckIn(target: 'guest' | 'plus_one' | 'both') {
    if (!guest) return
    setCheckingIn(true)
    const optimisticGuest = {
      ...guest,
      status: target !== 'plus_one' ? 'checked_in' as const : guest.status,
      plus_one_checked_in: target !== 'guest' ? true : guest.plus_one_checked_in,
    }
    setGuest(optimisticGuest)
    setState('checked_in')
    try {
      const updated = await api.checkIn(guest.id, target)
      setGuest(updated)
    } catch (err: unknown) {
      setGuest(guest)
      setState(err instanceof Error && err.message.includes('409') ? 'duplicate' : 'found')
    } finally {
      setCheckingIn(false)
    }
  }

  function reset() {
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    setToken('')
    setState('idle')
    setGuest(null)
    setCheckingIn(false)
    setInvalidReason('not_found')
    setNameQuery('')
    setNameResults([])
    setNameSearching(false)
  }

  if (state === 'checked_in' && guest) return <CheckedInScreen guest={guest} onNext={reset} />
  if (state === 'duplicate' && guest) return <DuplicateScreen guest={guest} onNext={reset} />
  if (state === 'invalid') return <InvalidScreen onReset={reset} reason={invalidReason} />
  if (state === 'found' && guest) return (
    <GuestFoundScreen guest={guest} checkingIn={checkingIn} onConfirm={handleCheckIn} onCancel={reset} showPhone={isSuperAdmin} />
  )

  return (
    <div className="min-h-full px-4 py-8 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--brand)' }}>Door Operations</p>
          <h1 data-tour="checkin-title" className="mt-2 font-display text-3xl font-semibold" style={{ color: 'var(--ink)' }}>2D Scanner Check-In</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6" style={{ color: 'var(--muted)' }}>
            Scan a guest pass with the connected 2D scanner. The field accepts a full pass URL, token, or UUID.
          </p>
        </div>

        <form onSubmit={handleScanSubmit} className="mt-8 rounded-xl p-5 sm:p-6" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <label htmlFor="hardware-scan-input" className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-2)' }}>
            Scanner input
          </label>
          <input
            id="hardware-scan-input"
            data-tour="checkin-input"
            ref={inputRef}
            type="text"
            value={token}
            onChange={(event) => handleScanInput(event.target.value)}
            placeholder="Scan now, or paste token / URL…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            disabled={state === 'loading'}
            className="mt-2 w-full rounded-sm px-4 py-4 text-base focus:outline-none disabled:opacity-60"
            style={{ background: 'var(--bg)', border: '2px solid var(--brand)', color: 'var(--ink)' }}
          />
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
            Complete QR URLs are detected automatically. If your scanner does not send Enter, use the button below.
          </p>
          <button
            type="submit"
            disabled={!token.trim() || state === 'loading'}
            className="mt-4 w-full rounded-sm py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            {state === 'loading' ? 'Looking up guest…' : 'Look Up Guest'}
          </button>
        </form>

        {isScanner && (
          <div className="mt-6 rounded-xl p-5 sm:p-6" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-2)' }}>Name search fallback</span>
              <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
            </div>
            <div className="space-y-2">
              <SearchableSelect
                options={events.map((event) => ({
                  value: String(event.id),
                  label: event.name,
                  sublabel: new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    + (event.venue ? ` · ${event.venue}` : ''),
                }))}
                value={selectedEventId}
                onChange={handleEventChange}
                placeholder="Select event…"
                searchPlaceholder="Search events…"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '2px' }}
              />
              <input
                type="text"
                value={nameQuery}
                onChange={(event) => handleNameSearch(event.target.value)}
                placeholder="Type guest name…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                className="w-full px-4 py-3 text-sm focus:outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>

            <div className="mt-3 max-h-72 overflow-auto">
              {nameSearching && <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Searching…</p>}
              {!nameSearching && nameQuery.trim().length >= 2 && nameResults.length === 0 && (
                <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No guests found</p>
              )}
              {nameResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => void lookupGuest(result.id)}
                  className="mb-2 flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:opacity-80"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{result.full_name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                      {result.ticket_type.toUpperCase()}{result.event_name ? ` · ${result.event_name}` : ''}
                    </p>
                  </div>
                  <span className="ml-3 flex-shrink-0 px-2 py-0.5 text-xs font-semibold" style={{ background: result.status === 'checked_in' ? 'var(--brand-soft)' : 'rgba(245,158,11,0.14)', color: result.status === 'checked_in' ? 'var(--brand)' : 'var(--warn)' }}>
                    {result.status === 'checked_in' ? 'IN' : 'PENDING'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
