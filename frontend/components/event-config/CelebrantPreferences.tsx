'use client'

import { useState } from 'react'

interface Props {
  enabled: boolean
  options: string[]
  onChange: (patch: { enabled?: boolean; options?: string[] }) => void
}

export function CelebrantPreferences({ enabled, options, onChange }: Props) {
  const [draft, setDraft] = useState('')

  function addOption() {
    const name = draft.trim()
    if (!name || options.some((option) => option.toLowerCase() === name.toLowerCase())) return
    onChange({ options: [...options, name] })
    setDraft('')
  }

  return (
    <div className="rounded-[14px] p-4 transition-colors" style={{ border: '1px solid var(--line)', background: enabled ? 'var(--brand-soft)' : 'var(--bg)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Ask which celebrant</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Guests choose a configured name, or enter a custom name when the list is empty.</p>
        </div>
        <button type="button" role="switch" aria-checked={enabled} aria-label="Ask which celebrant" onClick={() => onChange({ enabled: !enabled })} className="relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors" style={{ background: enabled ? 'var(--brand)' : 'var(--line)' }}><span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ left: '2px', transform: enabled ? 'translateX(20px)' : 'translateX(0)' }} /></button>
      </div>
      {enabled && <div className="mt-4 border-t border-[var(--line)] pt-4">
        <label className="text-xs font-semibold text-[var(--muted)]">Predetermined celebrants <span className="font-normal">(optional)</span></label>
        <div className="mt-2 flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addOption() } }} placeholder="Enter celebrant name" className="form-control" /><button type="button" onClick={addOption} className="rounded-lg border border-[var(--line)] px-3 text-xs font-semibold text-[var(--ink)]">Add</button></div>
        {options.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{options.map((option) => <span key={option} className="inline-flex items-center gap-2 rounded-full bg-[var(--panel)] px-3 py-1 text-xs text-[var(--ink)]">{option}<button type="button" aria-label={`Remove ${option}`} onClick={() => onChange({ options: options.filter((item) => item !== option) })} className="text-[var(--danger)]">×</button></span>)}</div> : <p className="mt-2 text-[11px] text-[var(--muted)]">No names added — guests will receive a custom-name field.</p>}
      </div>}
    </div>
  )
}
