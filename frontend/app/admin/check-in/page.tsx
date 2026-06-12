'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'
import { api, Guest } from '@/lib/api'
import {
  CheckedInScreen,
  DuplicateScreen,
  InvalidScreen,
  GuestFoundScreen,
} from '@/components/check-in/CheckInScreens'

type ScanState = 'idle' | 'scanning' | 'loading' | 'found' | 'checked_in' | 'duplicate' | 'invalid'

export default function CheckInPage() {
  const [token, setToken]           = useState('')
  const [state, setState]           = useState<ScanState>('idle')
  const [guest, setGuest]           = useState<Guest | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualMode, setManualMode] = useState(false)
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
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
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

  async function lookupGuest(raw: string) {
    setState('loading')
    setGuest(null)
    try {
      const g = await api.scanGuest(raw.trim())
      setGuest(g)
      setState(g.status === 'checked_in' ? 'duplicate' : 'found')
    } catch {
      setState('invalid')
    }
  }

  async function handleManualSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!token.trim()) return
    stopCamera()
    await lookupGuest(token.trim())
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
    scanningRef.current = false
  }

  if (state === 'checked_in' && guest) return <CheckedInScreen guest={guest} onNext={reset} />
  if (state === 'duplicate'  && guest) return <DuplicateScreen guest={guest} onNext={reset} />
  if (state === 'invalid')             return <InvalidScreen onReset={reset} />
  if (state === 'found'      && guest) return (
    <GuestFoundScreen guest={guest} checkingIn={checkingIn} onConfirm={handleCheckIn} onCancel={reset} />
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-5 py-4 text-center" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--brand)' }}>Door Operations</p>
        <h1 className="font-display text-2xl font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>QR Check-In</h1>
      </div>

      {/* Camera viewfinder */}
      {!manualMode && (
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: '#000' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Hidden canvas for jsQR pixel reading on Safari */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scan overlay */}
          {state !== 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56">
                {/* Corner brackets */}
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute w-8 h-8 ${pos}`} style={{
                    borderTop:    i < 2  ? '3px solid var(--brand)' : undefined,
                    borderBottom: i >= 2 ? '3px solid var(--brand)' : undefined,
                    borderLeft:   i % 2 === 0 ? '3px solid var(--brand)' : undefined,
                    borderRight:  i % 2 === 1 ? '3px solid var(--brand)' : undefined,
                  }} />
                ))}
                {/* Scan line */}
                <div className="absolute left-2 right-2 h-0.5 animate-scan-line"
                  style={{ background: 'var(--brand)', top: '50%' }} />
              </div>
              <p className="absolute bottom-8 text-xs font-medium px-4 py-1.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                Point camera at guest QR code
              </p>
            </div>
          )}

          {state === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)' }}>
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>
      )}

      {/* Bottom panel */}
      <div className="p-5 space-y-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
        {cameraError && (
          <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{cameraError}</p>
        )}

        {/* Manual input fallback */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Or paste token / UUID manually…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button
            type="submit"
            disabled={!token.trim() || state === 'loading'}
            className="px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition"
            style={{ background: 'var(--brand)' }}>
            Go
          </button>
        </form>

        <div className="flex gap-2">
          {manualMode && (
            <button onClick={() => { setManualMode(false); setCameraError(''); reset() }}
              className="flex-1 py-2.5 text-xs font-semibold rounded-full transition"
              style={{ border: '1px solid var(--brand)', color: 'var(--brand)' }}>
              Try Camera Again
            </button>
          )}
          {!manualMode && (
            <button onClick={() => { stopCamera(); setManualMode(true) }}
              className="flex-1 py-2.5 text-xs font-semibold rounded-full transition"
              style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
              Use Manual Input
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
