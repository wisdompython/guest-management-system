'use client'

import { useState } from 'react'
import ZoneSelector from '@/components/ZoneSelector'
import type { Zone } from '@/components/ZoneSelector'

export type { Zone }

export function ZoneLegendItem({ color, label, set }: { color: string; label: string; set: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: color, opacity: set ? 1 : 0.3 }} />
      <span className={set ? 'font-semibold' : ''} style={{ color: set ? 'var(--ink)' : 'var(--muted-2)' }}>
        {label} {set ? '✓' : '(not set)'}
      </span>
    </div>
  )
}

export function ZoneWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-600">
      <span>⚠</span> {children}
    </div>
  )
}

export function DualZoneCanvas({
  imageUrl,
  qrZone, onQrChange,
  nameZone, onNameChange,
}: {
  imageUrl: string
  qrZone: Zone | null
  onQrChange: (z: Zone | null) => void
  nameZone: Zone | null
  onNameChange: (z: Zone | null) => void
}) {
  const [active, setActive] = useState<'qr' | 'name'>('qr')

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['qr', 'name'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setActive(mode)}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
            style={{
              background: active === mode ? (mode === 'qr' ? '#6366f1' : '#10b981') : '#fff',
              borderColor: active === mode ? (mode === 'qr' ? '#6366f1' : '#10b981') : 'var(--line)',
              color: active === mode ? '#fff' : 'var(--muted)',
            }}
          >
            {mode === 'qr' ? 'Draw QR Zone' : 'Draw Name Zone'}
          </button>
        ))}
      </div>

      {active === 'qr' && (
        <ZoneSelector
          imageUrl={imageUrl}
          zone={qrZone}
          onChange={onQrChange}
          label="QR Zone"
          color="indigo"
          borderColor="#6366f1"
          bgColor="rgba(99,102,241,0.10)"
          dotColor="#6366f1"
        />
      )}
      {active === 'name' && (
        <ZoneSelector
          imageUrl={imageUrl}
          zone={nameZone}
          onChange={onNameChange}
          label="Name Zone"
          color="emerald"
          borderColor="#10b981"
          bgColor="rgba(16,185,129,0.10)"
          dotColor="#10b981"
        />
      )}
    </div>
  )
}
