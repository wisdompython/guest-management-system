'use client'

const YARD_PRESETS = [2, 4, 5, 6, 10, 15] as const

interface Props {
  value: number
  onChange: (yards: number) => void
  name?: string
  id?: string
}

export default function AsoEbiYardSelector({ value, onChange, name, id = 'aso-ebi-yards' }: Props) {
  const isCustom = !YARD_PRESETS.includes(value as (typeof YARD_PRESETS)[number])

  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">How many yards?</legend>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Aso Ebi yards">
        {YARD_PRESETS.map((yards) => {
          const selected = value === yards
          return (
            <button key={yards} type="button" role="radio" aria-checked={selected} onClick={() => onChange(yards)}
              className="min-h-11 rounded-lg px-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              style={{ background: selected ? 'var(--brand)' : 'var(--panel)', border: `1px solid ${selected ? 'var(--brand)' : 'var(--line)'}`, color: selected ? '#fff' : 'var(--ink)' }}>
              {yards}
            </button>
          )
        })}
        <button type="button" role="radio" aria-checked={isCustom} onClick={() => onChange(isCustom ? value : 1)}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          style={{ background: isCustom ? 'var(--brand)' : 'var(--panel)', border: `1px solid ${isCustom ? 'var(--brand)' : 'var(--line)'}`, color: isCustom ? '#fff' : 'var(--ink)' }}>
          Custom
        </button>
      </div>
      {isCustom && (
        <div className="mt-3">
          <label htmlFor={id} className="text-xs font-medium text-[var(--muted)]">Custom number of yards</label>
          <div className="relative mt-1.5 max-w-xs">
            <input id={id} type="number" min="1" step="1" required value={value}
              onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
              className="form-control pr-16" />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">yards</span>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]">Select a common amount or choose Custom for another whole number.</p>
    </fieldset>
  )
}
