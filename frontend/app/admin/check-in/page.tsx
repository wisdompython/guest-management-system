'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'
import { api, Guest, Event } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  CheckedInScreen,
  DuplicateScreen,
  InvalidScreen,
  GuestFoundScreen,
} from '@/components/check-in/CheckInScreens'
import type { InvalidReason } from '@/components/check-in/CheckInScreens'

type ScanState = 'idle' | 'scanning' | 'loading' | 'found' | 'checked_in' | 'duplicate' | 'invalid'

export default function CheckInPage() {
  const { isSuperAdmin, isScanner } = useAuth()
  const [token, setToken]           = useState('')
  const [state, setState]           = useState<ScanState>('idle')
  const [guest, setGuest]           = useState<Guest | null>(null)
  const [invalidReason, setInvalidReason] = useState<InvalidReason>('not_found')
  const [checkingIn, setCheckingIn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  // Event filter + name-search for scanner role (they can't see the UUID token)
  const [events, setEvents]         = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [nameQuery, setNameQuery]   = useState('')
  const [nameResults, setNameResults] = useState<Guest[]>([])
  const [nameSearching, setNameSearching] = useState(false)
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const inputRef   = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    scanningRef.current = false
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Request highest available resolution — more pixels = sharper QR decode
        video: { facingMode: 'environment', width: { ideal: 3840 }, height: { ideal: 2160 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      scanningRef.current = true
      scanFrame()
    } catch {
      setCameraError('Camera access denied. Use manual input below.')
      setManualMode(true)
    }
  }, [])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function scanFrame() {
    if (!scanningRef.current || !videoRef.current) return
    const video = videoRef.current
    if (video.readyState < 2) { requestAnimationFrame(scanFrame); return }

    try {
      // @ts-expect-error BarcodeDetector not in TS lib yet
      const hasBarcodeDetector = typeof BarcodeDetector !== 'undefined'

      if (hasBarcodeDetector) {
        // @ts-expect-error BarcodeDetector not in TS lib yet
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        const codes = await detector.detect(video)
        if (codes.length > 0 && scanningRef.current) {
          scanningRef.current = false
          stopCamera()
          await lookupGuest(codes[0].rawValue)
          return
        }
      } else {
        // jsQR fallback for Safari/iPhone
        const canvas = canvasRef.current
        if (!canvas) { requestAnimationFrame(scanFrame); return }
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) { requestAnimationFrame(scanFrame); return }
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code && scanningRef.current) {
          scanningRef.current = false
          stopCamera()
          await lookupGuest(code.data)
          return
        }
      }
    } catch { /* continue scanning */ }

    if (scanningRef.current) requestAnimationFrame(scanFrame)
  }

  useEffect(() => {
    if (state === 'idle' && !manualMode) startCamera()
    return () => { if (state !== 'idle') stopCamera() }
  }, [state, manualMode])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  useEffect(() => {
    api.getEvents().then((evs) => {
      setEvents(evs)
      if (evs.length > 0) setSelectedEventId(String(evs[0].id))
    }).catch(() => {})
  }, [])

  async function lookupGuest(raw: string) {
    setState('loading')
    setGuest(null)
    try {
      const g = await api.scanGuest(raw.trim())
      setGuest(g)
      setState(g.status === 'checked_in' ? 'duplicate' : 'found')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (!navigator.onLine || msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        setInvalidReason('offline')
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setInvalidReason('not_found')
      } else {
        setInvalidReason('server_error')
      }
      setState('invalid')
    }
  }

  async function handleManualSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!token.trim()) return
    stopCamera()
    await lookupGuest(token.trim())
  }

  function handleNameSearch(value: string, eventId?: string) {
    setNameQuery(value)
    setNameResults([])
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    if (!value.trim() || value.trim().length < 2) return
    const eid = eventId ?? selectedEventId
    nameTimerRef.current = setTimeout(async () => {
      setNameSearching(true)
      try {
        const params: Record<string, string> = { search: value.trim(), page_size: '10' }
        if (eid) params.event = eid
        const data = await api.getGuests(params)
        setNameResults(data.results)
      } catch { /* ignore */ } finally {
        setNameSearching(false)
      }
    }, 350)
  }

  function handleEventChange(eid: string) {
    setSelectedEventId(eid)
    setNameResults([])
    // Re-run search with new event if query is already typed
    if (nameQuery.trim().length >= 2) handleNameSearch(nameQuery, eid)
  }

  function resetManual() {
    setNameQuery(''); setNameResults([]); setToken('')
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
  }

  async function handleCheckIn() {
    if (!guest) return
    setCheckingIn(true)
    // Optimistic: show success immediately so door staff aren't blocked on slow connections
    const optimisticGuest = { ...guest, status: 'checked_in' as const }
    setGuest(optimisticGuest)
    setState('checked_in')
    try {
      const updated = await api.checkIn(guest.id)
      setGuest(updated)
    } catch (err: unknown) {
      // Revert if server rejects
      setGuest(guest)
      setState(err instanceof Error && err.message.includes('409') ? 'duplicate' : 'found')
    } finally {
      setCheckingIn(false)
    }
  }

  function reset() {
    setToken(''); setState('idle'); setGuest(null); setCheckingIn(false); setInvalidReason('not_found')
    setNameQuery(''); setNameResults([])
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    scanningRef.current = false
  }

  if (state === 'checked_in' && guest) return <CheckedInScreen guest={guest} onNext={reset} />
  if (state === 'duplicate'  && guest) return <DuplicateScreen guest={guest} onNext={reset} />
  if (state === 'invalid')             return <InvalidScreen onReset={reset} reason={invalidReason} />
  if (state === 'found'      && guest) return (
    <GuestFoundScreen guest={guest} checkingIn={checkingIn} onConfirm={handleCheckIn} onCancel={reset} showPhone={isSuperAdmin} />
  )

  return (
    <div className="h-full flex flex-col" style={{ background: '#000' }}>

      {/* Camera viewfinder — fills all available space */}
      {!manualMode && (
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: '#000' }}>
          {/* Tour anchor */}
          <span data-tour="checkin-camera" className="absolute top-4 left-1/2 -translate-x-1/2 w-1 h-1 pointer-events-none" />
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Title badge — overlaid top-left so it takes zero height */}
          <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <span data-tour="checkin-title" className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--brand)' }}>
                QR Check-In
              </span>
            </div>
          </div>

          {/* Scan overlay */}
          {state !== 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64">
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute w-10 h-10 ${pos}`} style={{
                    borderTop:    i < 2  ? '3px solid var(--brand)' : undefined,
                    borderBottom: i >= 2 ? '3px solid var(--brand)' : undefined,
                    borderLeft:   i % 2 === 0 ? '3px solid var(--brand)' : undefined,
                    borderRight:  i % 2 === 1 ? '3px solid var(--brand)' : undefined,
                  }} />
                ))}
                <div className="absolute left-2 right-2 h-0.5 animate-scan-line"
                  style={{ background: 'var(--brand)', top: '50%' }} />
              </div>
              <p className="absolute bottom-6 text-xs font-medium px-4 py-1.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                Point camera at guest QR code
              </p>
            </div>
          )}

          {state === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
            </div>
          )}

          {/* Manual entry button — overlaid bottom so it takes zero camera height */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
            {cameraError && (
              <p className="text-xs text-center mb-2" style={{ color: '#f87171' }}>{cameraError}</p>
            )}
            <button onClick={() => { stopCamera(); setManualMode(true) }}
              className="w-full py-2.5 text-xs font-semibold rounded-full transition"
              style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}>
              Enter token manually
            </button>
          </div>
        </div>
      )}

      {/* Manual input mode */}
      {manualMode && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
          <div className="flex-shrink-0 px-5 pt-8 pb-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-1" style={{ color: 'var(--brand)' }}>Door Operations</p>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
              {isScanner ? 'Find Guest' : 'Manual Entry'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {isScanner
                ? events.length === 1
                  ? events[0].name
                  : 'Select event then search by name'
                : 'Paste or type the guest token / UUID'}
            </p>
          </div>

          {cameraError && (
            <p className="flex-shrink-0 text-xs text-center px-5 mb-2" style={{ color: 'var(--danger)' }}>{cameraError}</p>
          )}

          <div className="flex-shrink-0 px-5 pb-3 space-y-2">
            {isScanner ? (
              /* Scanner role: event selector + name search */
              <>
                {events.length > 1 && (
                  <select
                    value={selectedEventId}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="w-full px-4 py-3 text-sm focus:outline-none"
                    style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                )}
                <input
                  autoFocus
                  type="text"
                  value={nameQuery}
                  onChange={(e) => handleNameSearch(e.target.value)}
                  placeholder="Type guest name…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  className="w-full px-4 py-3 text-sm focus:outline-none"
                  style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </>
            ) : (
              /* Other roles: token / UUID input */
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Token or UUID…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                  className="w-full px-4 py-3 text-sm focus:outline-none"
                  style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
                <button
                  type="submit"
                  disabled={!token.trim() || state === 'loading'}
                  className="w-full py-3 text-sm font-semibold text-white disabled:opacity-50 transition"
                  style={{ background: 'var(--brand)' }}>
                  {state === 'loading' ? 'Looking up…' : 'Look Up Guest'}
                </button>
              </form>
            )}
          </div>

          {/* Name search results */}
          {isScanner && (
            <div className="flex-1 overflow-auto px-5">
              {nameSearching && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>Searching…</p>
              )}
              {!nameSearching && nameQuery.trim().length >= 2 && nameResults.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No guests found</p>
              )}
              {nameResults.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { resetManual(); lookupGuest(g.id) }}
                  className="w-full flex items-center justify-between px-4 py-3.5 mb-2 text-left transition hover:opacity-80"
                  style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{g.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {g.ticket_type.toUpperCase()}
                      {g.event_name ? ' · ' + g.event_name : ''}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 ml-3 flex-shrink-0"
                    style={{
                      background: g.status === 'checked_in' ? 'var(--brand-soft)' : 'rgba(245,158,11,0.14)',
                      color: g.status === 'checked_in' ? 'var(--brand)' : 'var(--warn)',
                    }}>
                    {g.status === 'checked_in' ? 'IN' : 'PENDING'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-shrink-0 px-5 pb-6 pt-3">
            <button onClick={() => { setManualMode(false); setCameraError(''); resetManual(); reset() }}
              className="w-full py-2.5 text-xs font-semibold rounded-full transition"
              style={{ border: '1px solid var(--brand)', color: 'var(--brand)' }}>
              ← Back to camera
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
