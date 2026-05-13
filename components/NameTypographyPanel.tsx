'use client'

import { Font } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

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
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-6 py-4">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Name Typography</h2>
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
          <label className={label}>
            Size — {(fontSizeFrac * 100).toFixed(1)}% of height
          </label>
          <input
            type="range"
            min={0.02} max={0.15} step={0.005}
            value={fontSizeFrac}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="mt-1 w-full accent-[var(--brand)]"
          />
          <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--muted-2)' }}>
            <span>Smaller</span><span>Larger</span>
          </div>
        </div>
      </div>
    </div>
  )
}
