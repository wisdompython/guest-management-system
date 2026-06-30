'use client'

import EventConfigPanel from '@/components/EventConfigPanel'
import type { TicketTypeDef } from '@/components/EventConfigPanel'
import type { WhatsAppTemplate } from '@/lib/api'

interface Props {
  ticketTypes: TicketTypeDef[]
  requiredFields: string[]
  whatsappEnabled: boolean
  whatsappTemplate: number | null
  templates: WhatsAppTemplate[]
  onChange: (patch: {
    ticketTypes?: TicketTypeDef[]
    requiredFields?: string[]
    whatsappEnabled?: boolean
    whatsappTemplate?: number | null
  }) => void
}

export function GuestConfigSection({ ticketTypes, requiredFields, whatsappEnabled, whatsappTemplate, templates, onChange }: Props) {

  return (
    <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
        <h2 data-tour="event-guest-config-section" className="text-sm font-semibold text-[var(--ink)]">Guest Configuration</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Set ticket categories, required fields, and delivery options for this event.</p>
      </div>
      <div className="p-6 space-y-6">
        <EventConfigPanel
          ticketTypes={ticketTypes}
          requiredFields={requiredFields}
          whatsappEnabled={whatsappEnabled}
          onChange={onChange}
        />

        {whatsappEnabled && (
          <div className="space-y-1.5 pt-2 border-t border-[rgba(255,255,255,0.07)]">
            <label className="block text-xs font-semibold" style={{ color: 'var(--ink)' }}>
              WhatsApp Invite Template
            </label>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Choose which approved Meta template to use when sending passes for this event.
              Defaults to the global template if none is selected.
            </p>
            <select
              data-tour="event-whatsapp-template"
              value={whatsappTemplate ?? ''}
              onChange={(e) => onChange({ whatsappTemplate: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', colorScheme: 'dark' }}
            >
              <option value="">— Use global default —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name || t.name}
                  {t.description ? ` — ${t.description}` : ''}
                </option>
              ))}
            </select>
            {whatsappTemplate && templates.find((t) => t.id === whatsappTemplate) && (
              <div className="mt-2 rounded-[8px] px-3 py-2 text-xs" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>Params: </span>
                {(templates.find((t) => t.id === whatsappTemplate)!.body_params || []).join(', ') || 'none'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
