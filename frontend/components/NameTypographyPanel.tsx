'use client'

import { Font } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#1a2030] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted-2)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

// Reference height used to give a real px estimate (A4 landscape at 150dpi ≈ 1240px tall)
const REF_HEIGHT_PX = 1240

interface Props {
  fonts: Font[]
  selectedFont: string
  fontColor: string
  fontSizeFrac: number
  onFontChange: (v: string) => void
  onColorChange: (v: string) => void
  onSizeChange: (v: number) => void
}

export default function NameTypographyPanel({
  fonts, selectedFont, fontColor, fontSizeFrac,
  onFontChange, onColorChange, onSizeChange,
}: Props) {
  const approxPx = Math.round(fontSizeFrac * REF_HEIGHT_PX)

  function handlePxInput(raw: string) {
    const px = parseInt(raw, 10)
    if (!isNaN(px) && px > 0) {
      const frac = Math.min(Math.max(px / REF_HEIGHT_PX, 0.02), 0.15)
      onSizeChange(frac)
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
        <h2 data-tour="event-typography-section" className="text-sm font-semibold text-[var(--ink)]">Name Typography</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Controls how the guest name is rendered inside the name zone.
          <a href="/admin/fonts" className="ml-1 font-semibold hover:underline" style={{ color: 'var(--brand)' }}>Manage fonts →</a>
        </p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <label className={label}>Font</label>
          <select value={selectedFont} onChange={(e) => onFontChange(e.target.value)} className={field}>
            <option value="">Default (system)</option>
            {fonts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fontColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-lg border p-0.5"
              style={{ borderColor: 'var(--line)' }}
            />
            <input
              type="text"
              value={fontColor}
              onChange={(e) => onColorChange(e.target.value)}
              maxLength={7}
              placeholder="#ffffff"
              className={`${field} flex-1`}
            />
          </div>
        </div>
        <div>
          <label className={label}>Size</label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min={Math.round(0.02 * REF_HEIGHT_PX)}
              max={Math.round(0.15 * REF_HEIGHT_PX)}
              value={approxPx}
              onChange={(e) => handlePxInput(e.target.value)}
              className="w-20 rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#1a2030] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>px &nbsp;·&nbsp; {(fontSizeFrac * 100).toFixed(1)}% of height</span>
          </div>
          <input
            type="range"
            min={0.02} max={0.15} step={0.005}
            value={fontSizeFrac}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="w-full accent-[var(--brand)]"
          />
          <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--muted-2)' }}>
            <span>Smaller</span><span>Larger</span>
          </div>
        </div>
      </div>
    </div>
  )
}
