'use client'

import { Font } from '@/lib/api'
import { FormSectionHeader } from '@/components/ui/FormSectionHeader'

const field = 'form-control'
const label = 'form-label'

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
  step?: number
}

export default function NameTypographyPanel({
  fonts, selectedFont, fontColor, fontSizeFrac,
  onFontChange, onColorChange, onSizeChange, step,
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
    <div className="form-card">
      <FormSectionHeader step={step} optional title="Guest-name style" description="Choose how guest names appear on the pass. The defaults work well for most designs." tourId="event-typography-section" />
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <label className={label}>Font</label>
          <select value={selectedFont} onChange={(e) => onFontChange(e.target.value)} className={field}>
            <option value="">Default (system)</option>
            {fonts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <p className="form-hint"><a href="/admin/fonts" className="font-semibold text-[var(--brand)] hover:underline">Manage uploaded fonts →</a></p>
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
              className="form-control w-20"
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
