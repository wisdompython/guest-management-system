'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { api, Event, RsvpWorkflowStatus, WhatsAppTemplate } from '@/lib/api'
import ZoneSelector, { Zone } from '@/components/ZoneSelector'

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function ordinalDate(value: string) {
  const date = new Date(value)
  const day = Number(date.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric' }))
  const suffix = day % 100 >= 11 && day % 100 <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] || 'th'
  const monthAndYear = date.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'long',
    year: 'numeric',
  })
  return `${day}${suffix} ${monthAndYear}`
}

const fieldClass = 'form-control mt-2'
const fieldStyle = undefined

export default function AddRsvpWorkflowPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [events, setEvents] = useState<Event[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [eventId, setEventId] = useState<number | null>(null)
  const [existingWorkflowId, setExistingWorkflowId] = useState<number | null>(null)
  const [existingWorkflowStatus, setExistingWorkflowStatus] = useState<RsvpWorkflowStatus | null>(null)
  const [invitationTemplate, setInvitationTemplate] = useState<number | null>(null)
  const [passTemplate, setPassTemplate] = useState<number | null>(null)
  const [deadline, setDeadline] = useState('')
  const [invitationTiming, setInvitationTiming] = useState<'immediate' | 'scheduled'>('immediate')
  const [invitationSendAt, setInvitationSendAt] = useState('')
  const [autoSendPass, setAutoSendPass] = useState(true)
  const [passTiming, setPassTiming] = useState<'immediate' | 'scheduled'>('immediate')
  const [passSendAt, setPassSendAt] = useState('')
  const [invitationArtwork, setInvitationArtwork] = useState<File | null>(null)
  const [invitationArtworkUrl, setInvitationArtworkUrl] = useState('')
  const [invitationNameZone, setInvitationNameZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getEvents(), api.getWhatsAppTemplates(), api.getRsvpWorkflows()])
      .then(([allEvents, allTemplates, workflows]) => {
        const params = new URLSearchParams(window.location.search)
        const requestedWorkflowId = Number(params.get('workflow')) || null
        const requestedEventId = Number(params.get('event')) || null
        const existing = requestedWorkflowId
          ? workflows.find((workflow) => workflow.id === requestedWorkflowId)
          : workflows.find((workflow) => workflow.event === requestedEventId)
        const effectiveEventId = existing?.event || requestedEventId
        const usedEvents = new Set(workflows.map((workflow) => workflow.event))
        setEvents(allEvents.filter((event) => (
          event.id === effectiveEventId || (
            !event.is_ended
            && new Date(event.date) > new Date()
            && !usedEvents.has(event.id)
          )
        )))
        setTemplates(allTemplates.filter((template) => template.is_active))
        if (effectiveEventId) {
          setEventId(effectiveEventId)
          if (existing) {
            setExistingWorkflowId(existing.id)
            setExistingWorkflowStatus(existing.status)
            setInvitationTemplate(existing.invitation_template)
            setPassTemplate(existing.pass_template)
            setDeadline(existing.response_deadline?.slice(0, 10) || '')
            setInvitationTiming(existing.invitation_send_at ? 'scheduled' : 'immediate')
            setInvitationSendAt(toLocalInput(existing.invitation_send_at))
            setAutoSendPass(existing.auto_send_pass)
            setPassTiming(existing.pass_send_at ? 'scheduled' : 'immediate')
            setPassSendAt(toLocalInput(existing.pass_send_at))
            setInvitationArtworkUrl(existing.invitation_design || '')
            if ([existing.invitation_name_zone_x, existing.invitation_name_zone_y, existing.invitation_name_zone_w, existing.invitation_name_zone_h].every((value) => value !== null)) {
              setInvitationNameZone({
                x: existing.invitation_name_zone_x!,
                y: existing.invitation_name_zone_y!,
                w: existing.invitation_name_zone_w!,
                h: existing.invitation_name_zone_h!,
              })
            }
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load setup data.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedEvent = events.find((event) => event.id === eventId)
  const selectedInvitation = templates.find((template) => template.id === invitationTemplate)
  const selectedPass = templates.find((template) => template.id === passTemplate)
  const passDefaultLabel = selectedEvent?.whatsapp_template_name
    ? `Event default (${selectedEvent.whatsapp_template_name})`
    : 'Global default template'
  const invitationOptions = templates.filter((template) => template.body_params.includes('rsvp_link'))
  const passOptions = templates.filter((template) => (
    template.has_header_image && !template.body_params.includes('rsvp_link')
  ))
  const hasInvitationArtwork = Boolean(invitationArtwork || invitationArtworkUrl)

  function chooseInvitationArtwork(file: File | null) {
    setError('')
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Upload the RSVP artwork as a PNG or JPEG image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The RSVP artwork must be 5 MB or smaller.')
      return
    }
    if (invitationArtworkUrl.startsWith('blob:')) URL.revokeObjectURL(invitationArtworkUrl)
    setInvitationArtwork(file)
    setInvitationArtworkUrl(URL.createObjectURL(file))
    setInvitationNameZone(null)
  }

  const preview = useMemo(() => {
    if (!selectedInvitation) return 'Select an RSVP template to preview its message.'
    const samples: Record<string, string> = {
      guest_name: 'Aisha Bello',
      event_name: selectedEvent?.name || 'Your Event',
      event_date: selectedEvent
        ? new Date(selectedEvent.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
        : '24 October 2026',
      event_date_only: selectedEvent
        ? ordinalDate(selectedEvent.date)
        : '16th September 2026',
      event_time: selectedEvent
        ? new Date(selectedEvent.date).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
        : '1:00 PM',
      venue: selectedEvent?.venue || 'Event venue',
      ticket_type: 'General',
      table_number: '12',
      seat_number: '4',
      rsvp_link: 'https://guestpass.example/your-event/rsvp/aisha-bello-A7kP4m',
      rsvp_deadline: deadline
        ? ordinalDate(`${deadline}T12:00:00+01:00`)
        : '9th September 2026',
    }
    let text = selectedInvitation.body_text
    selectedInvitation.body_params.forEach((key, index) => {
      text = text.replaceAll(`{{${index + 1}}}`, samples[key] ?? key)
    })
    return text || selectedInvitation.description || 'Template body preview is unavailable.'
  }, [deadline, selectedEvent, selectedInvitation])

  function continueSetup() {
    setError('')
    if (step === 1 && !eventId) return setError('Select an event to continue.')
    if (step === 2 && !invitationTemplate) {
      return setError('Select an RSVP invitation template.')
    }
    if (step === 2 && selectedInvitation?.body_params.includes('rsvp_deadline') && !deadline) {
      return setError('Set a response deadline because this WhatsApp template includes the RSVP deadline.')
    }
    if (step === 2 && hasInvitationArtwork && !selectedInvitation?.has_header_image) {
      return setError('Choose an RSVP template with an image header to attach this artwork.')
    }
    if (step === 2 && selectedInvitation?.has_header_image && !hasInvitationArtwork) {
      return setError('Attach RSVP artwork for the selected image-header template.')
    }
    if (step === 2 && hasInvitationArtwork && !invitationNameZone) {
      return setError('Drag over the guest-name area on the RSVP artwork.')
    }
    if (step === 2 && invitationTiming === 'scheduled' && !invitationSendAt) {
      return setError('Choose a date and time for scheduled RSVP invitations.')
    }
    if (step === 2 && autoSendPass && passTiming === 'scheduled' && !passSendAt) {
      return setError('Choose a date and time for scheduled guest-pass delivery.')
    }
    if (step === 2 && autoSendPass && !selectedEvent?.design_template) {
      return setError('Upload a guest-pass design for this event before enabling automatic pass delivery.')
    }
    setStep((current) => Math.min(3, current + 1))
  }

  async function saveWorkflow(event: FormEvent) {
    event.preventDefault()
    if (!eventId || !invitationTemplate) return
    if (invitationTiming === 'scheduled' && !invitationSendAt) {
      setError('Choose a date and time for scheduled RSVP invitations.'); return
    }
    if (autoSendPass && passTiming === 'scheduled' && !passSendAt) {
      setError('Choose a date and time for scheduled guest-pass delivery.'); return
    }
    setSaving(true)
    setError('')
    try {
      const payload = new FormData()
      payload.append('event', String(eventId))
      payload.append('invitation_template', String(invitationTemplate))
      payload.append('pass_template', passTemplate ? String(passTemplate) : '')
      payload.append('response_deadline', deadline ? new Date(`${deadline}T23:59:00`).toISOString() : '')
      payload.append('invitation_send_at', invitationTiming === 'scheduled' && invitationSendAt ? new Date(invitationSendAt).toISOString() : '')
      payload.append('auto_send_pass', String(autoSendPass))
      payload.append('pass_send_at', autoSendPass && passTiming === 'scheduled' && passSendAt ? new Date(passSendAt).toISOString() : '')
      if (invitationArtwork) payload.append('invitation_design', invitationArtwork)
      if (invitationNameZone) {
        payload.append('invitation_name_zone_x', String(invitationNameZone.x))
        payload.append('invitation_name_zone_y', String(invitationNameZone.y))
        payload.append('invitation_name_zone_w', String(invitationNameZone.w))
        payload.append('invitation_name_zone_h', String(invitationNameZone.h))
      }
      const workflow = existingWorkflowId
        ? await api.updateRsvpWorkflow(existingWorkflowId, payload)
        : await api.createRsvpWorkflow(payload)
      if (!existingWorkflowId || existingWorkflowStatus === 'draft') {
        await api.populateRsvpRecipients(workflow.id)
      }
      router.push(`/admin/rsvp/${workflow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save the workflow.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="px-6 py-14 text-sm" style={{ color: 'var(--muted)' }}>Loading setup…</div>
  }

  const reviewRows = [
    ['Event', selectedEvent?.name],
    ['Eligible guests', selectedEvent ? `${selectedEvent.guest_count} registered (guests without phone numbers will be excluded)` : '—'],
    ['Invitation template', selectedInvitation?.display_name || selectedInvitation?.name],
    ['RSVP artwork', hasInvitationArtwork ? 'Attached with personalised guest name' : 'No artwork — message only'],
    ['Invitation delivery', invitationTiming === 'scheduled' && invitationSendAt ? new Date(invitationSendAt).toLocaleString('en-GB') : 'Immediately when workflow is launched'],
    ['Pass template', autoSendPass ? selectedPass?.display_name || selectedPass?.name || passDefaultLabel : 'Manual delivery'],
    ['Pass delivery', !autoSendPass ? 'Manual delivery' : passTiming === 'scheduled' && passSendAt ? new Date(passSendAt).toLocaleString('en-GB') : 'Immediately after each confirmation'],
    ['Response deadline', deadline ? new Date(`${deadline}T12:00:00`).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'No deadline'],
  ]

  return (
    <form onSubmit={saveWorkflow} className="max-w-3xl px-6 py-6 lg:px-8 lg:py-7">
      <button type="button" onClick={() => router.push('/admin/rsvp')} className="mb-4 text-xs font-semibold" style={{ color: 'var(--brand)' }}>← RSVP workflows</button>
      <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{existingWorkflowId ? 'Edit RSVP Workflow' : 'Create RSVP Workflow'}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{existingWorkflowId ? 'Update the message, artwork, deadline, or delivery settings.' : 'Ask guests to confirm their attendance or availability and control both delivery times.'}</p>

      <div className="my-6 grid grid-cols-3 gap-3">
        {['Choose event', 'Messages & timing', 'Review'].map((label, index) => {
          const number = index + 1
          return <div key={label} className="flex items-center gap-2 text-xs" style={{ color: number <= step ? 'var(--brand)' : 'var(--muted-2)' }}><span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: number <= step ? 'var(--brand)' : 'var(--panel)', color: number <= step ? '#ffffff' : 'var(--muted)', border: '1px solid var(--line)' }}>{number}</span><span className="hidden sm:inline">{label}</span></div>
        })}
      </div>

      <div className="rounded-[12px] p-5 sm:p-6" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
        {step === 1 && <div>
          <h2 className="text-base font-semibold">Which event needs RSVP?</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Events already attached to another workflow are not shown.</p>
          <label className="mt-5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>Event</label>
          <select value={eventId ?? ''} disabled={!!existingWorkflowId} onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)} className={`${fieldClass} disabled:opacity-60`} style={fieldStyle}>
            <option value="">Select an upcoming event</option>
            {events.map((item) => <option key={item.id} value={item.id}>{item.name} — {new Date(item.date).toLocaleDateString('en-GB')}</option>)}
          </select>
          {events.length === 0 && <p className="mt-3 text-xs" style={{ color: 'var(--warn)' }}>There are no eligible upcoming events without an RSVP workflow.</p>}
        </div>}

        {step === 2 && <div>
          <h2 className="text-base font-semibold">Configure messages and timing</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>The guest pass remains held until the guest confirms and its delivery time arrives.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>RSVP invitation template</label><select value={invitationTemplate ?? ''} onChange={(e) => setInvitationTemplate(e.target.value ? Number(e.target.value) : null)} className={fieldClass} style={fieldStyle}><option value="">Select template</option>{invitationOptions.map((template) => <option key={template.id} value={template.id}>{template.display_name || template.name}{template.has_header_image ? ' — image' : ' — message only'}</option>)}</select>{invitationOptions.length === 0 && <p className="mt-2 text-[11px]" style={{ color: 'var(--warn)' }}>Create an active template containing the rsvp_link variable first.</p>}</div>
            <div><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Pass template after “Yes”</label><select value={passTemplate ?? ''} disabled={!autoSendPass} onChange={(e) => setPassTemplate(e.target.value ? Number(e.target.value) : null)} className={`${fieldClass} disabled:opacity-50`} style={fieldStyle}><option value="">— {passDefaultLabel} —</option>{passOptions.map((template) => <option key={template.id} value={template.id}>{template.display_name || template.name}</option>)}</select><p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>Only image-header templates are shown. Leave on the default to reuse the event’s guest-pass template.</p></div>
            <div><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Send RSVP invitations</label><select value={invitationTiming} onChange={(e) => setInvitationTiming(e.target.value as 'immediate' | 'scheduled')} className={fieldClass} style={fieldStyle}><option value="immediate">Send immediately on launch</option><option value="scheduled">Schedule for later</option></select>{invitationTiming === 'scheduled' && <input type="datetime-local" required value={invitationSendAt} onChange={(e) => setInvitationSendAt(e.target.value)} className={`${fieldClass} mt-3`} style={fieldStyle}/>}</div>
            <div><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Response deadline</label><input type="date" value={deadline} max={selectedEvent?.date.slice(0, 10)} onChange={(e) => setDeadline(e.target.value)} className={fieldClass} style={fieldStyle}/></div>
          </div>
          <div className="mt-5 rounded-xl p-4 sm:p-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div><h3 className="text-sm font-semibold">1. RSVP artwork <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional)</span></h3><p className="mt-1 max-w-xl text-xs leading-5" style={{ color: 'var(--muted)' }}>Upload the RSVP design without a QR code. We will add each guest’s name and attach the personalised image to their RSVP WhatsApp message.</p></div>
              <label className="cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold" style={{ border: '1px solid var(--brand)', color: 'var(--brand)' }}>
                {hasInvitationArtwork ? 'Replace artwork' : 'Upload artwork'}
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => chooseInvitationArtwork(event.target.files?.[0] || null)} />
              </label>
            </div>
            {invitationArtworkUrl && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold" style={{ color: 'var(--ink)' }}>2. Drag over the space where the guest’s name should appear</p>
                <div className="mx-auto max-w-lg">
                  <ZoneSelector imageUrl={invitationArtworkUrl} zone={invitationNameZone} onChange={setInvitationNameZone}
                    label="Guest name" color="amber" borderColor="#d4af37" bgColor="rgba(212,175,55,0.18)" dotColor="#d4af37" />
                </div>
                <p className="mt-3 text-xs" style={{ color: selectedInvitation?.has_header_image ? 'var(--success)' : 'var(--warn)' }}>{selectedInvitation?.has_header_image ? 'Ready to attach using the selected image-header template.' : 'Choose an RSVP template marked “image” above.'}</p>
              </div>
            )}
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={autoSendPass} onChange={(e) => setAutoSendPass(e.target.checked)} className="mt-1 accent-[var(--brand)]"/><span>Automatically deliver passes to guests who confirm.</span></label>
          {autoSendPass && <div className="mt-4"><label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Send confirmed guest passes</label><select value={passTiming} onChange={(e) => setPassTiming(e.target.value as 'immediate' | 'scheduled')} className={fieldClass} style={fieldStyle}><option value="immediate">Send immediately after confirmation</option><option value="scheduled">Schedule for later</option></select>{passTiming === 'scheduled' && <input type="datetime-local" required value={passSendAt} onChange={(e) => setPassSendAt(e.target.value)} className={`${fieldClass} mt-3`} style={fieldStyle}/>}</div>}
          <div className="mt-5 rounded-lg p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}><p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>WhatsApp preview</p><p className="whitespace-pre-wrap text-sm leading-6">{preview}</p><p className="mt-4 rounded-md px-3 py-2 text-xs" style={{ background: 'var(--panel)', color: 'var(--brand)' }}>Each guest receives a different secure RSVP link.</p></div>
        </div>}

        {step === 3 && <div><h2 className="text-base font-semibold">Review workflow</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Saving does not send messages. Launching activates this plan.</p><div className="mt-5 divide-y" style={{ borderColor: 'var(--line)' }}>{reviewRows.map(([label, value]) => <div key={label} className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row"><span style={{ color: 'var(--muted)' }}>{label}</span><span className="font-semibold sm:text-right">{value || '—'}</span></div>)}</div></div>}

        {error && <p className="mt-5 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => step === 1 ? router.push('/admin/rsvp') : setStep(step - 1)} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>{step === 1 ? 'Cancel' : 'Back'}</button>{step < 3 ? <button type="button" onClick={continueSetup} className="rounded-lg px-5 py-2 text-sm font-semibold text-white" style={{ background: 'var(--brand)' }}>Continue</button> : <button type="submit" disabled={saving} className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand)' }}>{saving ? 'Saving…' : existingWorkflowId ? 'Save workflow' : 'Create workflow'}</button>}</div>
      </div>
    </form>
  )
}
