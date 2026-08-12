'use client'

import EventConfigPanel from '@/components/EventConfigPanel'
import type { TicketTypeDef } from '@/components/EventConfigPanel'
import type { WhatsAppTemplate } from '@/lib/api'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { FormSectionHeader } from '@/components/ui/FormSectionHeader'

interface Props {
  ticketTypes: TicketTypeDef[]
  requiredFields: string[]
  whatsappEnabled: boolean
  collectAsoEbi: boolean
  whatsappTemplate: number | null
  templates: WhatsAppTemplate[]
  step?: number
  onChange: (patch: {
    ticketTypes?: TicketTypeDef[]
    requiredFields?: string[]
    whatsappEnabled?: boolean
    collectAsoEbi?: boolean
    whatsappTemplate?: number | null
  }) => void
}

export function GuestConfigSection({ ticketTypes, requiredFields, whatsappEnabled, collectAsoEbi, whatsappTemplate, templates, step, onChange }: Props) {
  const selectedTemplate = templates.find((t) => t.id === whatsappTemplate)

  return (
    <div className="form-card">
      <FormSectionHeader step={step} tourId="event-guest-config-section" title="Guest setup" description="Choose ticket categories and the information to collect for each guest." />
      <div className="space-y-6 p-5 sm:p-6">
        <EventConfigPanel
          ticketTypes={ticketTypes}
          requiredFields={requiredFields}
          whatsappEnabled={whatsappEnabled}
          collectAsoEbi={collectAsoEbi}
          onChange={onChange}
        />

        {whatsappEnabled && (
          <div className="rounded-[14px] border border-[var(--line)] bg-[var(--bg)] p-4">
            <div className="mb-3">
              <label className="text-sm font-semibold text-[var(--ink)]">
                Guest-pass message <span className="font-normal text-[var(--muted)]">(optional)</span>
              </label>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Choose a Meta template, or keep the global default.
              </p>
            </div>
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
              inlineMenu
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
