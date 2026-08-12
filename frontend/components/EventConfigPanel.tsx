'use client'

import { TicketTypesSection } from '@/components/event-config/TicketTypesSection'
import { RequiredFieldsSection } from '@/components/event-config/RequiredFieldsSection'
import { WhatsAppToggle } from '@/components/event-config/WhatsAppToggle'
import { AsoEbiToggle } from '@/components/event-config/AsoEbiToggle'

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
  collectAsoEbi: boolean
  onChange: (patch: {
    ticketTypes?:    TicketTypeDef[]
    requiredFields?: string[]
    whatsappEnabled?: boolean
    collectAsoEbi?: boolean
  }) => void
}

export default function EventConfigPanel({
  ticketTypes, requiredFields, whatsappEnabled, collectAsoEbi, onChange,
}: Props) {
  function toggleField(key: string) {
    const next = requiredFields.includes(key)
      ? requiredFields.filter((f) => f !== key)
      : [...requiredFields, key]
    onChange({ requiredFields: next })
  }

  return (
    <div className="space-y-6">
      <TicketTypesSection
        ticketTypes={ticketTypes}
        onChange={(types) => onChange({ ticketTypes: types })}
      />
      <RequiredFieldsSection
        requiredFields={requiredFields}
        whatsappEnabled={whatsappEnabled}
        onToggle={toggleField}
      />
      <div>
        <p className="mb-1 text-sm font-semibold text-[var(--ink)]">Guest services</p>
        <p className="mb-3 text-xs text-[var(--muted)]">Enable only the services that apply to this event.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <AsoEbiToggle
            enabled={collectAsoEbi}
            onChange={(enabled) => onChange({ collectAsoEbi: enabled })}
          />
          <WhatsAppToggle
            whatsappEnabled={whatsappEnabled}
            onChange={(enabled) => onChange({ whatsappEnabled: enabled })}
          />
        </div>
      </div>
    </div>
  )
}
