'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event, Font } from '@/lib/api'
import type { TicketTypeDef } from '@/components/EventConfigPanel'
import NameTypographyPanel from '@/components/NameTypographyPanel'
import type { Zone } from '@/components/PassDesignPanel'
import { EventDetailsForm } from '@/components/events/EventDetailsForm'
import { PassDesignSection } from '@/components/events/PassDesignSection'
import { GuestConfigSection } from '@/components/events/GuestConfigSection'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [event, setEvent]     = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [newFileChosen, setNewFileChosen] = useState(false)
  const [qrZone, setQrZone]   = useState<Zone | null>(null)
  const [qrTouched, setQrTouched] = useState(false)
  const [nameZone, setNameZone] = useState<Zone | null>(null)
  const [nameTouched, setNameTouched] = useState(false)
  const [fonts, setFonts]     = useState<Font[]>([])
  const [selectedFont, setSelectedFont] = useState('')
  const [fontColor, setFontColor] = useState('#ffffff')
  const [fontSizeFrac, setFontSizeFrac] = useState(0.05)
  const [qrBgColor, setQrBgColor] = useState('none')
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDef[]>([])
  const [requiredFields, setRequiredFields] = useState<string[]>(['phone_number'])
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [whatsappTemplate, setWhatsappTemplate] = useState<number | null>(null)
  const [dateValid, setDateValid] = useState(true)

  useEffect(() => {
    Promise.all([api.getEvent(Number(id)), api.getFonts()])
      .then(([ev, fts]) => {
        setEvent(ev); setFonts(fts)
        if (ev.qr_zone_x != null && ev.qr_zone_y != null && ev.qr_zone_w != null && ev.qr_zone_h != null)
          setQrZone({ x: ev.qr_zone_x, y: ev.qr_zone_y, w: ev.qr_zone_w, h: ev.qr_zone_h })
        if (ev.name_zone_x != null && ev.name_zone_y != null && ev.name_zone_w != null && ev.name_zone_h != null)
          setNameZone({ x: ev.name_zone_x, y: ev.name_zone_y, w: ev.name_zone_w, h: ev.name_zone_h })
        if (ev.design_template) setPreviewUrl(ev.design_template)
        if (ev.name_font) setSelectedFont(String(ev.name_font))
        setFontColor(ev.name_font_color || '#ffffff'); setFontSizeFrac(ev.name_font_size_fraction ?? 0.05)
        setQrBgColor(ev.qr_bg_color || 'none')
        if (ev.ticket_types?.length) setTicketTypes(ev.ticket_types as TicketTypeDef[])
        if (ev.required_fields?.length) setRequiredFields(ev.required_fields as string[])
        setWhatsappEnabled(ev.whatsapp_enabled ?? true)
        setWhatsappTemplate(ev.whatsapp_template ?? null)
      })
      .catch(() => setError('Could not load event.')).finally(() => setLoading(false))
  }, [id])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setNewFileChosen(true); setQrZone(null); setQrTouched(false); setNameZone(null); setNameTouched(false)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateValid) { setError('Please set a future date and time for the event.'); return }
    setError(''); setSubmitting(true)
    const form = e.currentTarget; const fd = new FormData()
    fd.append('name', (form.elements.namedItem('name') as HTMLInputElement).value)
    fd.append('date', (form.elements.namedItem('date') as HTMLInputElement).value)
    fd.append('venue', (form.elements.namedItem('venue') as HTMLInputElement).value)
    fd.append('description', (form.elements.namedItem('description') as HTMLTextAreaElement).value)
    if (fileInputRef.current?.files?.[0]) fd.append('design_template', fileInputRef.current.files[0])
    if (qrTouched) { if (qrZone) { fd.append('qr_zone_x', String(qrZone.x)); fd.append('qr_zone_y', String(qrZone.y)); fd.append('qr_zone_w', String(qrZone.w)); fd.append('qr_zone_h', String(qrZone.h)) } else { fd.append('qr_zone_x', ''); fd.append('qr_zone_y', ''); fd.append('qr_zone_w', ''); fd.append('qr_zone_h', '') } }
    if (nameTouched) { if (nameZone) { fd.append('name_zone_x', String(nameZone.x)); fd.append('name_zone_y', String(nameZone.y)); fd.append('name_zone_w', String(nameZone.w)); fd.append('name_zone_h', String(nameZone.h)) } else { fd.append('name_zone_x', ''); fd.append('name_zone_y', ''); fd.append('name_zone_w', ''); fd.append('name_zone_h', '') } }
    fd.append('name_font', selectedFont); fd.append('name_font_color', fontColor); fd.append('name_font_size_fraction', String(fontSizeFrac))
    fd.append('qr_bg_color', qrBgColor); fd.append('ticket_types', JSON.stringify(ticketTypes)); fd.append('required_fields', JSON.stringify(requiredFields)); fd.append('whatsapp_enabled', String(whatsappEnabled))
    fd.append('whatsapp_template', whatsappTemplate ? String(whatsappTemplate) : '')
    try {
      const res = await fetch(`${BASE_URL}/events/${id}/`, { method: 'PATCH', body: fd, credentials: 'include' })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail ?? JSON.stringify(err)) }
      router.push('/admin/events')
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save changes.'); setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-sm text-[var(--muted)]">Loading event…</p></div>
  if (!event) return <div className="px-6 py-8 lg:px-8 lg:py-10"><p className="text-sm" style={{ color: 'var(--danger)' }}>{error || 'Event not found.'}</p></div>

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Event setup</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Edit Event</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{event.name}</p>
      </div>
      {error && <div className="mb-5 rounded-[14px] px-5 py-3.5 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <EventDetailsForm event={event} localDateValue={event.date ? new Date(event.date).toISOString().slice(0, 16) : ''} onValidationChange={setDateValid} />
        <PassDesignSection event={event} newFileChosen={newFileChosen} fileInputRef={fileInputRef}
          previewUrl={previewUrl} qrZone={qrZone} nameZone={nameZone} qrBgColor={qrBgColor}
          fontColor={fontColor} fontSizeFrac={fontSizeFrac}
          fontName={fonts.find((f) => String(f.id) === selectedFont)?.name ?? ''}
          fontFileUrl={fonts.find((f) => String(f.id) === selectedFont)?.file}
          onFileChange={handleFileChange} onQrChange={(z) => { setQrZone(z); setQrTouched(true) }}
          onNameChange={(z) => { setNameZone(z); setNameTouched(true) }} onQrBgColorChange={setQrBgColor} isEdit />
        <GuestConfigSection ticketTypes={ticketTypes} requiredFields={requiredFields}
          whatsappEnabled={whatsappEnabled} whatsappTemplate={whatsappTemplate}
          onChange={({ ticketTypes: tt, requiredFields: rf, whatsappEnabled: wa, whatsappTemplate: wt }) => {
            if (tt !== undefined) setTicketTypes(tt)
            if (rf !== undefined) setRequiredFields(rf)
            if (wa !== undefined) setWhatsappEnabled(wa)
            if (wt !== undefined) setWhatsappTemplate(wt)
          }} />
        <NameTypographyPanel fonts={fonts} selectedFont={selectedFont} fontColor={fontColor} fontSizeFrac={fontSizeFrac}
          onFontChange={setSelectedFont} onColorChange={setFontColor} onSizeChange={setFontSizeFrac} />
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={submitting} className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">{submitting ? 'Saving…' : 'Save Changes'}</button>
          <button type="button" onClick={() => router.push('/admin/events')} className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]">Cancel</button>
        </div>
      </form>
    </div>
  )
}
