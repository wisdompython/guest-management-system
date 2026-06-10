'use client'

import { Guest } from '@/lib/api'

interface Props {
  guest: Guest
  passUrl: string | null
  qrUrl: string | null
}

export function GuestAssetsCard({ guest, passUrl, qrUrl }: Props) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Personalised Pass</h2>
          {passUrl && (
            <a href={passUrl} download target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)] hover:underline">
              Download ↓
            </a>
          )}
        </div>
        <div className="p-4">
          {passUrl ? (
            <img src={passUrl} alt={`${guest.full_name} pass`} className="w-full rounded-[14px] border border-[var(--line)] object-contain" />
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
  )
}
