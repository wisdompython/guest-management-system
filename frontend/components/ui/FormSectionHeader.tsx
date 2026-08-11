interface Props {
  title: string
  description: string
  step?: number
  optional?: boolean
  tourId?: string
}

export function FormSectionHeader({ title, description, step, optional, tourId }: Props) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6">
      {step && (
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)] ring-1 ring-[rgba(184,150,62,0.35)]">
          {step}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 data-tour={tourId} className="text-sm font-semibold text-[var(--ink)]">{title}</h2>
          {optional && <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">Optional</span>}
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  )
}
