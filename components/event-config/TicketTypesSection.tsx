'use client'

import { useState } from 'react'
import { TicketTypeDef } from '@/components/EventConfigPanel'

interface Props {
  ticketTypes: TicketTypeDef[]
  onChange: (types: TicketTypeDef[]) => void
}

export function TicketTypesSection({ ticketTypes, onChange }: Props) {
  const [newValue, setNewValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState('')

  function addTicketType() {
    const v = newValue.trim().toLowerCase().replace(/\s+/g, '_')
    const l = newLabel.trim()
    if (!v || !l) { setAddError('Both a value and a label are required.'); return }
    if (ticketTypes.some((t) => t.value === v)) { setAddError(`"${v}" already exists.`); return }
    setAddError('')
    onChange([...ticketTypes, { value: v, label: l }])
    setNewValue(''); setNewLabel('')
  }

  function removeTicketType(value: string) {
    onChange(ticketTypes.filter((t) => t.value !== value))
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Ticket Categories</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            Define the ticket tiers for this event. Guests will be assigned one of these.
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

      <div className="flex flex-wrap gap-2">
        <input type="text" placeholder="Label  e.g. VVVIP" value={newLabel}
          onChange={(e) => { setNewLabel(e.target.value); setAddError('') }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTicketType())}
          className="rounded-[10px] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          style={{ borderColor: 'var(--line)', color: 'var(--ink)', minWidth: '150px' }} />
        <input type="text" placeholder="Value  e.g. vvvip" value={newValue}
          onChange={(e) => { setNewValue(e.target.value); setAddError('') }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTicketType())}
          className="rounded-[10px] border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          style={{ borderColor: 'var(--line)', color: 'var(--ink)', minWidth: '140px' }} />
        <button type="button" onClick={addTicketType}
          className="rounded-[10px] border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--brand-soft)]"
          style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}>
          + Add
        </button>
      </div>
      {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
      <p className="mt-1.5 text-xs" style={{ color: 'var(--muted-2)' }}>
        The <span className="font-mono">value</span> is stored internally (lowercase, underscored). The <span className="font-mono">label</span> is shown to the user.
      </p>
    </div>
  )
}
