'use client'

import EventConfigPanel from '@/components/EventConfigPanel'
import type { TicketTypeDef } from '@/components/EventConfigPanel'

interface Props {
  ticketTypes: TicketTypeDef[]
  requiredFields: string[]
  whatsappEnabled: boolean
  onChange: (patch: { ticketTypes?: TicketTypeDef[]; requiredFields?: string[]; whatsappEnabled?: boolean }) => void
}

export function GuestConfigSection({ ticketTypes, requiredFields, whatsappEnabled, onChange }: Props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Guest Configuration</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Set ticket categories, required fields, and delivery options for this event.</p>
      </div>
      <div className="p-6">
        <EventConfigPanel
          ticketTypes={ticketTypes}
          requiredFields={requiredFields}
          whatsappEnabled={whatsappEnabled}
          onChange={onChange}
        />
      </div>
    </div>
  )
}
