'use client'

import EventConfigPanel from '@/components/EventConfigPanel'
import type { TicketTypeDef } from '@/components/EventConfigPanel'
import type { WhatsAppTemplate } from '@/lib/api'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

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
  const selectedTemplate = templates.find((t) => t.id === whatsappTemplate)

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
            <SearchableSelect
              data-tour="event-whatsapp-template"
              options={[
                { value: '', label: '— Use global default —' },
                ...templates.map((t) => ({
                  value: String(t.id),
                  label: t.display_name || t.name,
                  sublabel: t.description || undefined,
                })),
              ]}
              value={whatsappTemplate ? String(whatsappTemplate) : ''}
              onChange={(val) => onChange({ whatsappTemplate: val ? Number(val) : null })}
              placeholder="— Use global default —"
              searchPlaceholder="Search templates…"
              style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
            />
            {whatsappTemplate && selectedTemplate && (
              <div className="mt-2 rounded-[8px] px-3 py-2 text-xs" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>Params: </span>
                {(selectedTemplate.body_params || []).join(', ') || 'none'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
