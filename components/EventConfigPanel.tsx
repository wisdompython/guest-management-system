'use client'

import { useState } from 'react'

export interface TicketTypeDef {
  value: string
  label: string
}

export const CONFIGURABLE_FIELDS = [
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'email',        label: 'Email Address' },
  { key: 'table_number', label: 'Table Number' },
  { key: 'seat_number',  label: 'Seat Number' },
] as const

export type ConfigurableField = typeof CONFIGURABLE_FIELDS[number]['key']

interface Props {
  ticketTypes:    TicketTypeDef[]
  requiredFields: string[]
  whatsappEnabled: boolean
  onChange: (patch: {
    ticketTypes?:    TicketTypeDef[]
    requiredFields?: string[]
    whatsappEnabled?: boolean
  }) => void
}

export default function EventConfigPanel({
  ticketTypes, requiredFields, whatsappEnabled, onChange,
}: Props) {
  const [newValue, setNewValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState('')

  function addTicketType() {
    const v = newValue.trim().toLowerCase().replace(/\s+/g, '_')
    const l = newLabel.trim()
    if (!v || !l) { setAddError('Both a value and a label are required.'); return }
    if (ticketTypes.some((t) => t.value === v)) { setAddError(`"${v}" already exists.`); return }
    setAddError('')
    onChange({ ticketTypes: [...ticketTypes, { value: v, label: l }] })
    setNewValue(''); setNewLabel('')
  }

  function removeTicketType(value: string) {
    onChange({ ticketTypes: ticketTypes.filter((t) => t.value !== value) })
  }

  function toggleField(key: string) {
    const next = requiredFields.includes(key)
      ? requiredFields.filter((f) => f !== key)
      : [...requiredFields, key]
    onChange({ requiredFields: next })
  }

  return (
    <div className="space-y-6">

      {/* ── Ticket types ── */}
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

        {/* Existing types */}
        {ticketTypes.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {ticketTypes.map((t) => (
              <div key={t.value}
                className="flex items-center gap-2 rounded-full border pl-3 pr-1.5 py-1"
                style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{t.label}</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted-2)' }}>{t.value}</span>
                <button
                  type="button"
                  onClick={() => removeTicketType(t.value)}
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition hover:bg-red-100"
                  style={{ color: 'var(--muted-2)' }}
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new type */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Label  e.g. VVVIP"
            value={newLabel}
            onChange={(e) => { setNewLabel(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTicketType())}
            className="rounded-[10px] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)', minWidth: '150px' }}
          />
          <input
            type="text"
            placeholder="Value  e.g. vvvip"
            value={newValue}
            onChange={(e) => { setNewValue(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTicketType())}
            className="rounded-[10px] border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)', minWidth: '140px' }}
          />
          <button
            type="button"
            onClick={addTicketType}
            className="rounded-[10px] border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--brand-soft)]"
            style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
          >
            + Add
          </button>
        </div>
        {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
        <p className="mt-1.5 text-xs" style={{ color: 'var(--muted-2)' }}>
          The <span className="font-mono">value</span> is stored internally (lowercase, underscored). The <span className="font-mono">label</span> is shown to the user.
        </p>
      </div>

      {/* ── Required fields ── */}
      <div>
        <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>Required Guest Fields</p>
        <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
          <span className="font-semibold">Full Name</span> is always required. Toggle the others on or off.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Full name — always on, disabled */}
          <FieldToggle label="Full Name" checked disabled />
          {CONFIGURABLE_FIELDS.map(({ key, label }) => (
            <FieldToggle
              key={key}
              label={label}
              checked={requiredFields.includes(key) || (key === 'phone_number' && whatsappEnabled)}
              disabled={key === 'phone_number' && whatsappEnabled}
              disabledReason={key === 'phone_number' && whatsappEnabled ? 'Required when WhatsApp is on' : undefined}
              onChange={() => toggleField(key)}
            />
          ))}
        </div>
      </div>

      {/* ── WhatsApp toggle ── */}
      <div
        className="flex items-start justify-between gap-4 rounded-[14px] p-4"
        style={{ border: '1px solid var(--line)', background: whatsappEnabled ? 'var(--brand-soft)' : 'var(--bg)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>WhatsApp Delivery</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            {whatsappEnabled
              ? 'Passes will be sent via WhatsApp. Phone number is required for all guests.'
              : 'WhatsApp delivery is off for this event. Phone number is optional.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={whatsappEnabled}
          onClick={() => onChange({ whatsappEnabled: !whatsappEnabled })}
          className="relative mt-0.5 h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors"
          style={{ background: whatsappEnabled ? 'var(--brand)' : '#d1d5db' }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ left: '2px', transform: whatsappEnabled ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>

    </div>
  )
}

function FieldToggle({
  label, checked, disabled, disabledReason, onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  disabledReason?: string
  onChange?: () => void
}) {
  return (
    <label
      title={disabledReason}
      className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm transition select-none"
      style={{
        borderColor: checked ? 'var(--brand)' : 'var(--line)',
        background:  checked ? 'var(--brand-soft)' : '#fff',
        opacity:     disabled ? 0.7 : 1,
        cursor:      disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-[var(--brand)]"
      />
      <span className="text-xs font-medium" style={{ color: checked ? 'var(--brand)' : 'var(--ink)' }}>
        {label}
      </span>
    </label>
  )
}
