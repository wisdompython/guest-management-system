'use client'

import { TicketTypesSection } from '@/components/event-config/TicketTypesSection'
import { RequiredFieldsSection } from '@/components/event-config/RequiredFieldsSection'
import { WhatsAppToggle } from '@/components/event-config/WhatsAppToggle'
import { AsoEbiToggle } from '@/components/event-config/AsoEbiToggle'
import { PlusOneToggle } from '@/components/event-config/PlusOneToggle'
import { CelebrantPreferences } from '@/components/event-config/CelebrantPreferences'
import { PreferencesOnlyToggle } from '@/components/event-config/PreferencesOnlyToggle'

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
  allowPlusOne: boolean
  preferencesEnabled: boolean
  collectCelebrant: boolean
  celebrantOptions: string[]
  onChange: (patch: {
    ticketTypes?:    TicketTypeDef[]
    requiredFields?: string[]
    whatsappEnabled?: boolean
    collectAsoEbi?: boolean
    allowPlusOne?: boolean
    preferencesEnabled?: boolean
    collectCelebrant?: boolean
    celebrantOptions?: string[]
  }) => void
}

export default function EventConfigPanel({
  ticketTypes, requiredFields, whatsappEnabled, collectAsoEbi, allowPlusOne,
  preferencesEnabled, collectCelebrant, celebrantOptions, onChange,
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
        <p className="mb-1 text-sm font-semibold text-[var(--ink)]">Guest preferences</p>
        <p className="mb-3 text-xs text-[var(--muted)]">Enable only the guest choices and services that apply to this event.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <PlusOneToggle
            enabled={allowPlusOne}
            onChange={(enabled) => onChange({ allowPlusOne: enabled })}
          />
          <AsoEbiToggle
            enabled={collectAsoEbi}
            onChange={(enabled) => onChange({ collectAsoEbi: enabled })}
          />
          <WhatsAppToggle
            whatsappEnabled={whatsappEnabled}
            onChange={(enabled) => onChange({ whatsappEnabled: enabled })}
          />
          <PreferencesOnlyToggle enabled={preferencesEnabled} onChange={(enabled) => onChange({ preferencesEnabled: enabled })} />
          <CelebrantPreferences enabled={collectCelebrant} options={celebrantOptions} onChange={(patch) => onChange({ collectCelebrant: patch.enabled, celebrantOptions: patch.options })} />
        </div>
      </div>
    </div>
  )
}
