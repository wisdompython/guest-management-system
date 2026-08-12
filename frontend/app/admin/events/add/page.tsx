'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, WhatsAppTemplate } from '@/lib/api'
import type { TicketTypeDef } from '@/components/EventConfigPanel'
import { EventDetailsForm } from '@/components/events/EventDetailsForm'
import { GuestConfigSection } from '@/components/events/GuestConfigSection'
import { FormSectionHeader } from '@/components/ui/FormSectionHeader'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const DEFAULT_TICKET_TYPES: TicketTypeDef[] = [
  { value: 'general', label: 'General' },
  { value: 'vip', label: 'VIP' },
  { value: 'vvip', label: 'VVIP' },
]

export default function AddEventPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDef[]>(DEFAULT_TICKET_TYPES)
  const [requiredFields, setRequiredFields] = useState<string[]>(['phone_number'])
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [whatsappTemplate, setWhatsappTemplate] = useState<number | null>(null)
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([])
  const [dateValid, setDateValid] = useState(false)
  const [deliveryFlow, setDeliveryFlow] = useState<'direct' | 'rsvp'>('direct')
  const [passTiming, setPassTiming] = useState<'immediate' | 'scheduled'>('immediate')
  const [passSendAt, setPassSendAt] = useState('')

  useEffect(() => {
    api.getWhatsAppTemplates().then(setWaTemplates).catch(console.error)
  }, [])

  function continueSetup() {
    setError('')
    if (step === 1 && (!formRef.current?.reportValidity() || !dateValid)) {
      if (!dateValid) setError('Please set a future date and time for the event.')
      return
    }
    setStep((current) => Math.min(3, current + 1))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateValid) { setError('Please set a future date and time for the event.'); setStep(1); return }
    if (whatsappEnabled && deliveryFlow === 'direct' && passTiming === 'scheduled' && !passSendAt) {
      setError('Choose a date and time for scheduled guest-pass delivery.'); return
    }

    setError('')
    setSubmitting(true)
    const form = e.currentTarget
    const fd = new FormData()
    fd.append('name', (form.elements.namedItem('name') as HTMLInputElement).value)
    fd.append('date', (form.elements.namedItem('date') as HTMLInputElement).value)
    fd.append('venue', (form.elements.namedItem('venue') as HTMLInputElement).value)
    fd.append('description', (form.elements.namedItem('description') as HTMLTextAreaElement).value)
    fd.append('ticket_types', JSON.stringify(ticketTypes))
    fd.append('required_fields', JSON.stringify(requiredFields))
    fd.append('whatsapp_enabled', String(whatsappEnabled))
    if (whatsappTemplate) fd.append('whatsapp_template', String(whatsappTemplate))
    const usesRsvp = whatsappEnabled && deliveryFlow === 'rsvp'
    fd.append('create_rsvp_workflow', String(usesRsvp))
    if (!usesRsvp && whatsappEnabled && passTiming === 'scheduled' && passSendAt) {
      fd.append('pass_send_at', new Date(passSendAt).toISOString())
    }

    try {
      const csrf = document.cookie.split('; ').find((cookie) => cookie.startsWith('csrftoken='))?.split('=')[1] ?? ''
      const res = await fetch(`${BASE_URL}/events/`, { method: 'POST', body: fd, credentials: 'include', headers: { 'X-CSRFToken': csrf } })
      if (!res.ok) { const detail = await res.json().catch(() => ({})); throw new Error(detail.detail ?? JSON.stringify(detail)) }
      const created = await res.json() as { id: number }
      router.push(usesRsvp ? `/admin/rsvp/add?event=${created.id}` : `/admin/events/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 lg:px-8 lg:py-9">
      <div className="mb-7 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Event setup</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Create an event</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Get the essentials in place now. Pass design, reminders, and other finishing touches can be completed from the event workspace.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {['Event details', 'Guest setup', 'Delivery plan'].map((label, index) => {
            const number = index + 1
            return <button type="button" key={label} disabled={number > step} onClick={() => setStep(number)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition disabled:cursor-default ${number === step ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--ink)]' : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]'}`}><span className="font-semibold text-[var(--brand)]">{number}</span><span>{label}</span>{number < step && <span className="ml-auto text-emerald-400">✓</span>}</button>
          })}
        </div>
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-sm text-[var(--danger)]">{error}</div>}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className={step === 1 ? 'block' : 'hidden'}>
          <EventDetailsForm step={1} subtitle="Only the event name and a future date are required." onValidationChange={setDateValid} />
        </div>

        <div className={step === 2 ? 'block' : 'hidden'}>
          <GuestConfigSection step={2} ticketTypes={ticketTypes} requiredFields={requiredFields} whatsappEnabled={whatsappEnabled} whatsappTemplate={whatsappTemplate} templates={waTemplates} onChange={({ ticketTypes: nextTypes, requiredFields: nextFields, whatsappEnabled: nextWhatsapp, whatsappTemplate: nextTemplate }) => {
            if (nextTypes !== undefined) setTicketTypes(nextTypes)
            if (nextFields !== undefined) setRequiredFields(nextFields)
            if (nextWhatsapp !== undefined) setWhatsappEnabled(nextWhatsapp)
            if (nextTemplate !== undefined) setWhatsappTemplate(nextTemplate)
          }}/>
        </div>

        <div className={step === 3 ? 'block' : 'hidden'}>
          {whatsappEnabled ? <div className="form-card">
            <FormSectionHeader step={3} title="Delivery plan" description="Choose whether guests confirm first, then decide when passes should go out." />
            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['rsvp', 'Confirm RSVP first', 'Send an RSVP request and release passes only to confirmed guests.'],
                  ['direct', 'Send passes directly', 'Skip attendance confirmation and deliver passes to registered guests.'],
                ] as const).map(([value, title, description]) => <label key={value} className={`form-choice ${deliveryFlow === value ? 'form-choice--selected' : ''}`}><span className="flex items-start gap-3"><input type="radio" name="delivery_flow" value={value} checked={deliveryFlow === value} onChange={() => setDeliveryFlow(value)} className="mt-1 accent-[var(--brand)]"/><span><span className="block text-sm font-semibold text-[var(--ink)]">{title}</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span></span></span></label>)}
              </div>

              {deliveryFlow === 'direct' ? <div className="mt-5 border-t border-[var(--line)] pt-5"><label className="form-label" htmlFor="pass-timing">When should passes be sent?</label><select id="pass-timing" value={passTiming} onChange={(e) => setPassTiming(e.target.value as 'immediate' | 'scheduled')} className="form-control mt-2"><option value="immediate">Send immediately when each guest is added</option><option value="scheduled">Schedule for later</option></select>{passTiming === 'scheduled' && <div className="mt-4"><label className="form-label" htmlFor="pass-send-at">Delivery date and time</label><input id="pass-send-at" type="datetime-local" required value={passSendAt} onChange={(e) => setPassSendAt(e.target.value)} className="form-control mt-2"/></div>}<p className="form-hint">You can change this later from the event workspace.</p></div> : <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4"><p className="text-sm font-semibold text-[var(--ink)]">Next: configure RSVP timing</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">After this event is created, you will choose the invitation template, invitation time, response deadline, and confirmed-pass delivery time.</p></div>}
            </div>
          </div> : <div className="form-card"><FormSectionHeader step={3} title="Delivery plan" description="WhatsApp delivery is off. You can enable it later from the event workspace." /><div className="p-6 text-sm text-[var(--muted)]">The event will be created without sending messages or passes.</div></div>}
        </div>

        <div className="sticky bottom-0 z-10 -mx-2 flex gap-3 border-t border-[var(--line)] bg-[var(--bg)]/95 px-2 py-4 backdrop-blur">
          <button type="button" onClick={() => step === 1 ? router.push('/admin/events') : setStep(step - 1)} className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]">{step === 1 ? 'Cancel' : 'Back'}</button>
          {step < 3 ? <button type="button" onClick={continueSetup} className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]">Continue</button> : <button data-tour="event-submit-button" type="submit" disabled={submitting} className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">{submitting ? 'Creating...' : deliveryFlow === 'rsvp' && whatsappEnabled ? 'Create and configure RSVP' : 'Create event'}</button>}
        </div>
      </form>
    </div>
  )
}
