'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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

function PassPreview({
  imageUrl, nameZone, qrZone,
  fontColor, fontSizeFrac, fontName, fontFileUrl,
}: {
  imageUrl: string
  nameZone: Zone | null
  qrZone: Zone | null
  fontColor: string
  fontSizeFrac: number
  fontName: string
  fontFileUrl?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgRect, setImgRect] = useState<{ width: number; height: number } | null>(null)
  const [previewName, setPreviewName] = useState('Guest Name')
  const [fontLoaded, setFontLoaded] = useState(false)

  const measure = useCallback(() => {
    const img = imgRef.current
    if (img) setImgRect({ width: img.offsetWidth, height: img.offsetHeight })
  }, [])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Load the custom font into the browser when a font file URL is available
  useEffect(() => {
    if (!fontFileUrl || !fontName) { setFontLoaded(false); return }
    const face = new FontFace(fontName, `url(${fontFileUrl})`)
    face.load().then((loaded) => {
      document.fonts.add(loaded)
      setFontLoaded(true)
    }).catch(() => setFontLoaded(false))
  }, [fontFileUrl, fontName])

  const fontSizePx = imgRect ? fontSizeFrac * imgRect.height : 0
  const resolvedFont = fontName && (fontLoaded || !fontFileUrl) ? fontName : 'inherit'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
          Preview name
        </label>
        <input
          value={previewName}
          onChange={(e) => setPreviewName(e.target.value)}
          className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          placeholder="Type a name to preview..."
        />
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-xl border select-none"
        style={{ borderColor: 'var(--line)' }}>
        <img ref={imgRef} src={imageUrl} alt="Design preview" className="w-full block"
          onLoad={measure} draggable={false} />

        {/* Name zone overlay */}
        {nameZone && imgRect && (
          <div className="absolute pointer-events-none"
            style={{
              left: `${nameZone.x * 100}%`,
              top: `${nameZone.y * 100}%`,
              width: `${nameZone.w * 100}%`,
              height: `${nameZone.h * 100}%`,
              border: '1px dashed rgba(16,185,129,0.5)',
            }}>
            <div className="w-full h-full flex items-center justify-center overflow-hidden px-1"
              style={{
                fontSize: fontSizePx,
                color: fontColor,
                fontFamily: resolvedFont,
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>
              {previewName}
            </div>
          </div>
        )}

        {/* QR placeholder */}
        {qrZone && imgRect && (
          <div className="absolute pointer-events-none flex items-center justify-center"
            style={{
              left: `${qrZone.x * 100}%`,
              top: `${qrZone.y * 100}%`,
              width: `${qrZone.w * 100}%`,
              height: `${qrZone.h * 100}%`,
              border: '1px dashed rgba(99,102,241,0.5)',
            }}>
            <div className="text-[10px] font-bold rounded px-1"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
              QR
            </div>
          </div>
        )}

        {!nameZone && !qrZone && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-full px-4 py-2 text-xs font-semibold"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.6)' }}>
              Draw QR and Name zones first
            </p>
          </div>
        )}
      </div>

      {!nameZone && (
        <p className="text-xs" style={{ color: 'var(--muted-2)' }}>
          Name zone not set — switch to "Draw Name Zone" tab to define it.
        </p>
      )}
    </div>
  )
}

export function DualZoneCanvas({
  imageUrl,
  qrZone, onQrChange,
  nameZone, onNameChange,
  fontColor, fontSizeFrac, fontName, fontFileUrl,
}: {
  imageUrl: string
  qrZone: Zone | null
  onQrChange: (z: Zone | null) => void
  nameZone: Zone | null
  onNameChange: (z: Zone | null) => void
  fontColor?: string
  fontSizeFrac?: number
  fontName?: string
  fontFileUrl?: string
}) {
  const [active, setActive] = useState<'qr' | 'name' | 'preview'>('qr')

  const tabs = [
    { id: 'qr' as const,      label: 'Draw QR Zone',   color: '#6366f1' },
    { id: 'name' as const,    label: 'Draw Name Zone',  color: '#10b981' },
    { id: 'preview' as const, label: '👁 Preview',      color: 'var(--brand)' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
            style={{
              background: active === tab.id ? tab.color : 'transparent',
              borderColor: active === tab.id ? tab.color : 'var(--line)',
              color: active === tab.id ? '#fff' : 'var(--muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'qr' && (
        <ZoneSelector imageUrl={imageUrl} zone={qrZone} onChange={onQrChange}
          label="QR Zone" color="indigo" borderColor="#6366f1"
          bgColor="rgba(99,102,241,0.10)" dotColor="#6366f1" />
      )}
      {active === 'name' && (
        <ZoneSelector imageUrl={imageUrl} zone={nameZone} onChange={onNameChange}
          label="Name Zone" color="emerald" borderColor="#10b981"
          bgColor="rgba(16,185,129,0.10)" dotColor="#10b981" />
      )}
      {active === 'preview' && (
        <PassPreview
          imageUrl={imageUrl}
          nameZone={nameZone}
          qrZone={qrZone}
          fontColor={fontColor ?? '#ffffff'}
          fontSizeFrac={fontSizeFrac ?? 0.05}
          fontName={fontName ?? ''}
          fontFileUrl={fontFileUrl}
        />
      )}
    </div>
  )
}
