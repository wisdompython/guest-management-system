'use client'

interface Props {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function AsoEbiToggle({ enabled, onChange }: Props) {
  return (
    <div
      className="flex h-full items-start justify-between gap-4 rounded-[14px] p-4 transition-colors"
      style={{ border: '1px solid var(--line)', background: enabled ? 'var(--brand-soft)' : 'var(--bg)' }}
    >
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">Collect Aso Ebi requests</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Let guests request Aso Ebi and state the quantity.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Collect Aso Ebi requests"
        onClick={() => onChange(!enabled)}
        className="relative mt-0.5 h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors"
        style={{ background: enabled ? 'var(--brand)' : 'var(--line)' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ left: '2px', transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
