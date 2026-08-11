'use client'

import { useState } from 'react'
import { TicketTypeDef } from '@/components/EventConfigPanel'

interface Props {
  ticketTypes: TicketTypeDef[]
  onChange: (types: TicketTypeDef[]) => void
}

export function TicketTypesSection({ ticketTypes, onChange }: Props) {
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState('')

  function addTicketType() {
    const l = newLabel.trim()
    const v = l.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!l || !v) { setAddError('Enter a ticket category name.'); return }
    if (ticketTypes.some((t) => t.value === v)) { setAddError(`"${l}" already exists.`); return }
    setAddError('')
    onChange([...ticketTypes, { value: v, label: l }])
    setNewLabel('')
  }

  function removeTicketType(value: string) {
    onChange(ticketTypes.filter((t) => t.value !== value))
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Ticket categories</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            Add the guest groups your team will recognise, such as General, VIP or Family.
          </p>
        </div>
        {ticketTypes.length === 0 && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: '#fef3c7', color: '#b45309' }}>
            None defined
          </span>
        )}
      </div>

      {ticketTypes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {ticketTypes.map((t) => (
            <div key={t.value}
              className="flex items-center gap-2 rounded-full border pl-3 pr-1.5 py-1"
              style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{t.label}</span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--muted-2)' }}>{t.value}</span>
              <button type="button" onClick={() => removeTicketType(t.value)}
                aria-label={`Remove ${t.label}`}
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-red-100"
                style={{ color: 'var(--muted-2)' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input type="text" placeholder="e.g. Sponsors" value={newLabel}
          onChange={(e) => { setNewLabel(e.target.value); setAddError('') }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTicketType())}
          aria-label="New ticket category"
          className="form-control min-w-0 flex-1" />
        <button type="button" onClick={addTicketType}
          className="rounded-[10px] border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--brand-soft)]"
          style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
          + Add
        </button>
      </div>
      {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
      <p className="mt-1.5 text-xs" style={{ color: 'var(--muted-2)' }}>
        We create the internal value automatically, so you only need to enter the name guests and staff will see.
      </p>
    </div>
  )
}
