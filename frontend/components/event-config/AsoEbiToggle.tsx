'use client'

interface Props {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function AsoEbiToggle({ enabled, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-[14px] border border-[var(--line)] bg-[var(--bg)] px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">Collect Aso Ebi requests</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Guests can say whether they want Aso Ebi and enter the quantity they need.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Collect Aso Ebi requests"
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition ${enabled ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}
