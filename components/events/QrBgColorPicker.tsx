'use client'

const PRESETS = ['none', '#ffffff', '#000000'] as const

interface Props {
  qrBgColor: string
  onChange: (color: string) => void
}

export function QrBgColorPicker({ qrBgColor, onChange }: Props) {
  const isCustom = !PRESETS.includes(qrBgColor as typeof PRESETS[number])
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5">QR Code Background</label>
      <div className="flex flex-wrap items-center gap-2">
        {([
          { value: 'none',    label: 'None (transparent)' },
          { value: '#ffffff', label: 'White' },
          { value: '#000000', label: 'Black' },
        ] as const).map((opt) => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
            style={{
              borderColor: qrBgColor === opt.value ? 'var(--brand)' : 'var(--line)',
              background:  qrBgColor === opt.value ? 'var(--brand-soft)' : '#fff',
              color:       qrBgColor === opt.value ? 'var(--brand)' : 'var(--ink)',
            }}>
            {opt.value !== 'none' && <span className="h-3 w-3 rounded-full border border-[var(--line)]" style={{ background: opt.value }} />}
            {opt.label}
          </button>
        ))}
        <label className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition"
          style={{
            borderColor: isCustom ? 'var(--brand)' : 'var(--line)',
            background:  isCustom ? 'var(--brand-soft)' : '#fff',
            color:       isCustom ? 'var(--brand)' : 'var(--ink)',
          }}>
          <span className="h-3 w-3 rounded-full border border-[var(--line)]"
            style={{ background: isCustom ? qrBgColor : '#eee' }} />
          Custom
          <input type="color" className="sr-only"
            value={isCustom ? qrBgColor : '#ffffff'}
            onChange={(e) => onChange(e.target.value)} />
        </label>
      </div>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        Adds a solid colour pad behind the QR on the pass. Use white for dark templates, none for light ones.
      </p>
    </div>
  )
}
