'use client'

import { CONFIGURABLE_FIELDS } from '@/components/EventConfigPanel'

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

interface Props {
  requiredFields: string[]
  whatsappEnabled: boolean
  onToggle: (key: string) => void
}

export function RequiredFieldsSection({ requiredFields, whatsappEnabled, onToggle }: Props) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>Required Guest Fields</p>
      <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
        <span className="font-semibold">Full Name</span> is always required. Toggle the others on or off.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FieldToggle label="Full Name" checked disabled />
        {CONFIGURABLE_FIELDS.map(({ key, label }) => (
          <FieldToggle
            key={key}
            label={label}
            checked={requiredFields.includes(key) || (key === 'phone_number' && whatsappEnabled)}
            disabled={key === 'phone_number' && whatsappEnabled}
            disabledReason={key === 'phone_number' && whatsappEnabled ? 'Required when WhatsApp is on' : undefined}
            onChange={() => onToggle(key)}
          />
        ))}
      </div>
    </div>
  )
}
