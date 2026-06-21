'use client'

import { useState } from 'react'
import { Guest } from '@/lib/api'

interface Props {
  guest: Guest
  passUrl: string | null
  qrUrl: string | null
}

function PassLightbox({ passUrl, guestName, onClose }: { passUrl: string; guestName: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}>
      <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-sm font-semibold transition hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.7)' }}>
          ✕ Close
        </button>
        <img
          src={passUrl}
          alt={`${guestName} pass`}
          className="w-full rounded-[16px] shadow-2xl"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <a
          href={passUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold transition hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}
          onClick={(e) => e.stopPropagation()}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download pass
        </a>
      </div>
    </div>
  )
}

export function GuestAssetsCard({ guest, passUrl, qrUrl }: Props) {
  const [lightbox, setLightbox] = useState(false)

  return (
    <>
      {lightbox && passUrl && (
        <PassLightbox passUrl={passUrl} guestName={guest.full_name} onClose={() => setLightbox(false)} />
      )}

      <div className="space-y-4">
        <div className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Personalised Pass</h2>
            {passUrl && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLightbox(true)}
                  className="text-xs font-semibold uppercase tracking-[0.14em] transition hover:opacity-70"
                  style={{ color: 'var(--muted)' }}>
                  Preview ↗
                </button>
                <a href={passUrl} download target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)] hover:underline">
                  Download ↓
                </a>
              </div>
            )}
          </div>
          <div className="p-4">
            {passUrl ? (
              <button
                className="block w-full group relative rounded-[14px] overflow-hidden"
                onClick={() => setLightbox(true)}>
                <img src={passUrl} alt={`${guest.full_name} pass`}
                  className="w-full border border-[var(--line)] object-contain rounded-[14px]" />
                <div className="absolute inset-0 flex items-center justify-center rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}>
                  <span className="rounded-full px-4 py-2 text-xs font-semibold text-white"
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Click to enlarge
                  </span>
                </div>
              </button>
            ) : (
              <div className="rounded-[14px] border-2 border-dashed border-[var(--line)] py-14 text-center">
                <p className="text-sm text-[var(--muted)]">No pass generated yet.</p>
                <p className="text-xs text-[var(--line)] mt-1">Upload a design template to the event first.</p>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">QR Code</h2>
            {qrUrl && (
              <a href={qrUrl} download target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)] hover:underline">
                Download ↓
              </a>
            )}
          </div>
          <div className="p-6 flex flex-col items-center gap-3">
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="QR Code" className="w-44 h-44 rounded-[14px]" style={{ background: '#111', padding: '10px' }} />
                <p className="text-xs text-[var(--muted)] font-mono break-all text-center leading-relaxed">ID: {guest.id}</p>
              </>
            ) : (
              <div className="rounded-[14px] border-2 border-dashed border-[var(--line)] w-full py-10 text-center">
                <p className="text-sm text-[var(--muted)]">No QR code generated yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
