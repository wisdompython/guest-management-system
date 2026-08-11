'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { api, Event, WhatsAppTemplate } from '@/lib/api'

export default function AddRsvpWorkflowPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [events, setEvents] = useState<Event[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [eventId, setEventId] = useState<number | null>(null)
  const [invitationTemplate, setInvitationTemplate] = useState<number | null>(null)
  const [passTemplate, setPassTemplate] = useState<number | null>(null)
  const [deadline, setDeadline] = useState('')
  const [autoSendPass, setAutoSendPass] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getEvents(), api.getWhatsAppTemplates(), api.getRsvpWorkflows()])
      .then(([allEvents, allTemplates, workflows]) => {
        const usedEvents = new Set(workflows.map((workflow) => workflow.event))
        setEvents(allEvents.filter((event) => !event.is_ended && new Date(event.date) > new Date() && !usedEvents.has(event.id)))
        setTemplates(allTemplates.filter((template) => template.is_active))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load setup data.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedEvent = events.find((event) => event.id === eventId)
  const selectedInvitation = templates.find((template) => template.id === invitationTemplate)
  const selectedPass = templates.find((template) => template.id === passTemplate)
  const invitationOptions = templates.filter((template) => !template.has_header_image && template.body_params.includes('rsvp_link'))
  const passOptions = templates

  const preview = useMemo(() => {
    if (!selectedInvitation) return 'Select an RSVP template to preview its message.'
    const samples: Record<string, string> = {
      guest_name: 'Aisha Bello', event_name: selectedEvent?.name || 'Your Event',
      event_date: selectedEvent ? new Date(selectedEvent.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '24 October 2026',
      venue: selectedEvent?.venue || 'Event venue', ticket_type: 'General', table_number: '12', seat_number: '4',
      rsvp_link: 'https://guestpass.example/rsvp/your-secure-link',
    }
    let text = selectedInvitation.body_text
    selectedInvitation.body_params.forEach((key, index) => { text = text.replaceAll(`{{${index + 1}}}`, samples[key] ?? key) })
    return text || selectedInvitation.description || 'Template body preview is unavailable.'
  }, [selectedEvent, selectedInvitation])

  function continueSetup() {
    setError('')
    if (step === 1 && !eventId) return setError('Select an event to continue.')
    if (step === 2 && (!invitationTemplate || (autoSendPass && !passTemplate))) return setError('Select the required invitation and pass templates.')
    setStep((current) => Math.min(3, current + 1))
  }

  async function createWorkflow(event: FormEvent) {
    event.preventDefault()
    if (!eventId || !invitationTemplate || (autoSendPass && !passTemplate)) return
    setSaving(true); setError('')
    try {
      const workflow = await api.createRsvpWorkflow({
        event: eventId,
        invitation_template: invitationTemplate,
        pass_template: passTemplate,
        response_deadline: deadline ? new Date(`${deadline}T23:59:00`).toISOString() : null,
        auto_send_pass: autoSendPass,
      })
      await api.populateRsvpRecipients(workflow.id)
      router.push(`/admin/rsvp/${workflow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the workflow.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="px-6 py-14 text-sm" style={{ color: 'var(--muted)' }}>Loading setup…</div>

  return (
    <form onSubmit={createWorkflow} className="max-w-3xl px-6 py-6 lg:px-8 lg:py-7">
      <button type="button" onClick={() => router.push('/admin/rsvp')} className="mb-4 text-xs font-semibold" style={{ color: 'var(--brand)' }}>← RSVP workflows</button>
      <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Create RSVP Workflow</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Attach availability confirmation to one existing event.</p>

      <div className="my-6 grid grid-cols-3 gap-3">
        {['Choose event', 'Messages & rules', 'Review'].map((label, index) => {
          const number = index + 1
          return <div key={label} className="flex items-center gap-2 text-xs" style={{ color: number <= step ? 'var(--brand)' : 'var(--muted-2)' }}><span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: number <= step ? 'var(--brand)' : 'var(--panel)', color: number <= step ? '#0d1016' : 'var(--muted)', border: '1px solid var(--line)' }}>{number}</span><span className="hidden sm:inline">{label}</span></div>
        })}
      </div>

      <div className="rounded-[12px] p-5 sm:p-6" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
        {step === 1 && <div><h2 className="text-base font-semibold">Which event needs RSVP?</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Events already attached to a workflow are not shown.</p><label className="mt-5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>Event</label><select value={eventId ?? ''} onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)} className="mt-2 w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}><option value="">Select an upcoming event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name} — {new Date(event.date).toLocaleDateString('en-GB')}</option>)}</select>{events.length === 0 && <p className="mt-3 text-xs" style={{ color: 'var(--warn)' }}>There are no eligible upcoming events without an RSVP workflow.</p>}</div>}

        {step === 2 && <div><h2 className="text-base font-semibold">Configure the invitation</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>The invitation contains a unique RSVP-page link; the pass remains held until the guest responds there.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>RSVP invitation template</label><select value={invitationTemplate ?? ''} onChange={(e) => setInvitationTemplate(e.target.value ? Number(e.target.value) : null)} className="mt-2 w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}><option value="">Select template</option>{invitationOptions.map((template) => <option key={template.id} value={template.id}>{template.display_name || template.name}</option>)}</select>{invitationOptions.length === 0 && <p className="mt-2 text-[11px]" style={{ color: 'var(--warn)' }}>Create an active template containing the rsvp_link variable first.</p>}</div><div><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Pass template after “Yes”</label><select value={passTemplate ?? ''} disabled={!autoSendPass} onChange={(e) => setPassTemplate(e.target.value ? Number(e.target.value) : null)} className="mt-2 w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}><option value="">Select template</option>{passOptions.map((template) => <option key={template.id} value={template.id}>{template.display_name || template.name}</option>)}</select></div><div className="sm:col-span-2"><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Response deadline</label><input type="date" value={deadline} max={selectedEvent?.date.slice(0, 10)} onChange={(e) => setDeadline(e.target.value)} className="mt-2 w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></div></div><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={autoSendPass} onChange={(e) => setAutoSendPass(e.target.checked)} className="mt-1 accent-[var(--brand)]"/><span>Automatically send the pass immediately after a guest confirms.</span></label><div className="mt-5 rounded-lg p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}><p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>WhatsApp preview</p><p className="whitespace-pre-wrap text-sm leading-6">{preview}</p><p className="mt-4 rounded-md px-3 py-2 text-xs" style={{ background: 'var(--panel)', color: 'var(--brand)' }}>Each guest receives a different secure RSVP link.</p></div></div>}

        {step === 3 && <div><h2 className="text-base font-semibold">Review workflow</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Creating the workflow does not send any messages. You will launch it from the dashboard.</p><div className="mt-5 divide-y" style={{ borderColor: 'var(--line)' }}>{[['Event', selectedEvent?.name], ['Eligible guests', selectedEvent ? `${selectedEvent.guest_count} registered (guests without phone numbers will be excluded)` : '—'], ['Invitation template', selectedInvitation?.display_name || selectedInvitation?.name], ['Pass template', autoSendPass ? selectedPass?.display_name || selectedPass?.name : 'Manual delivery'], ['Response deadline', deadline ? new Date(`${deadline}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'No deadline']].map(([label, value]) => <div key={label} className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row"><span style={{ color: 'var(--muted)' }}>{label}</span><span className="font-semibold sm:text-right">{value || '—'}</span></div>)}</div></div>}

        {error && <p className="mt-5 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => step === 1 ? router.push('/admin/rsvp') : setStep(step - 1)} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>{step === 1 ? 'Cancel' : 'Back'}</button>{step < 3 ? <button type="button" onClick={continueSetup} className="rounded-lg px-5 py-2 text-sm font-semibold text-white" style={{ background: 'var(--brand)' }}>Continue</button> : <button type="submit" disabled={saving} className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand)' }}>{saving ? 'Creating…' : 'Create workflow'}</button>}</div>
      </div>
    </form>
  )
}
