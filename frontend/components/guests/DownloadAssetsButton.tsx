'use client'

import { useEffect, useRef, useState } from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

interface Props {
  eventId: number
  eventName: string
}

export function DownloadAssetsButton({ eventId, eventName }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'both' | 'passes' | 'qr'>('both')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleDownload() {
    window.location.href = `${BASE_URL}/guests/download-assets/?event=${eventId}&mode=${mode}`
    setOpen(false)
  }

  const options: { value: 'both' | 'passes' | 'qr'; label: string; desc: string }[] = [
    { value: 'both',   label: 'Passes + QR Codes', desc: 'passes/ and qr_codes/ folders' },
    { value: 'passes', label: 'Passes only',        desc: 'Guest invite images' },
    { value: 'qr',     label: 'QR Codes only',      desc: 'Scan codes for check-in' },
  ]

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition hover:opacity-90"
        style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Assets
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-[14px] shadow-xl"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'var(--panel)' }}>
          <div className="border-b px-4 py-3.5" style={{ borderColor: 'var(--line)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Download Assets</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
              Downloads a zip of all guest files for <span className="font-semibold" style={{ color: 'var(--ink)' }}>{eventName}</span>, sorted by guest name.
            </p>
          </div>

          <div className="space-y-2 p-4">
            {options.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
                className="w-full text-left rounded-[10px] px-3 py-2.5 transition"
                style={{
                  border: `1px solid ${mode === opt.value ? 'var(--brand)' : 'var(--line)'}`,
                  background: mode === opt.value ? 'var(--brand-soft)' : 'transparent',
                }}>
                <p className="text-xs font-semibold" style={{ color: mode === opt.value ? 'var(--brand)' : 'var(--ink)' }}>
                  {opt.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{opt.desc}</p>
              </button>
            ))}
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
            <button onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--brand)' }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download ZIP
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
