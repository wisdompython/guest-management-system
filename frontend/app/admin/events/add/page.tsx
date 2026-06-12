'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, Font } from '@/lib/api'
import type { TicketTypeDef } from '@/components/EventConfigPanel'
import NameTypographyPanel from '@/components/NameTypographyPanel'
import type { Zone } from '@/components/PassDesignPanel'
import { EventDetailsForm } from '@/components/events/EventDetailsForm'
import { PassDesignSection } from '@/components/events/PassDesignSection'
import { GuestConfigSection } from '@/components/events/GuestConfigSection'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const DEFAULT_TICKET_TYPES: TicketTypeDef[] = [
  { value: 'general', label: 'General' },
  { value: 'vip',     label: 'VIP' },
  { value: 'vvip',    label: 'VVIP' },
]

export default function AddEventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qrZone, setQrZone]         = useState<Zone | null>(null)
  const [nameZone, setNameZone]     = useState<Zone | null>(null)
  const [fonts, setFonts]           = useState<Font[]>([])
  const [selectedFont, setSelectedFont] = useState('')
  const [fontColor, setFontColor]   = useState('#ffffff')
  const [fontSizeFrac, setFontSizeFrac] = useState(0.05)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDef[]>(DEFAULT_TICKET_TYPES)
  const [requiredFields, setRequiredFields] = useState<string[]>(['phone_number'])
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [dateValid, setDateValid] = useState(false)

  useEffect(() => { api.getFonts().then(setFonts).catch(console.error) }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setQrZone(null); setNameZone(null); setPreviewUrl(URL.createObjectURL(file))
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
    if (qrZone) { fd.append('qr_zone_x', String(qrZone.x)); fd.append('qr_zone_y', String(qrZone.y)); fd.append('qr_zone_w', String(qrZone.w)); fd.append('qr_zone_h', String(qrZone.h)) }
    if (nameZone) { fd.append('name_zone_x', String(nameZone.x)); fd.append('name_zone_y', String(nameZone.y)); fd.append('name_zone_w', String(nameZone.w)); fd.append('name_zone_h', String(nameZone.h)) }
    if (selectedFont) fd.append('name_font', selectedFont)
    fd.append('name_font_color', fontColor); fd.append('name_font_size_fraction', String(fontSizeFrac))
    fd.append('ticket_types', JSON.stringify(ticketTypes)); fd.append('required_fields', JSON.stringify(requiredFields)); fd.append('whatsapp_enabled', String(whatsappEnabled))
    try {
      const csrf = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
      const res = await fetch(`${BASE_URL}/events/`, { method: 'POST', body: fd, credentials: 'include', headers: { 'X-CSRFToken': csrf } })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail ?? JSON.stringify(err)) }
      router.push('/admin/events')
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to create event.'); setSubmitting(false) }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Event setup</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">New Event</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Create an event and configure the pass design template.</p>
      </div>
      {error && <div className="mb-5 px-5 py-3.5 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <EventDetailsForm subtitle="Fields marked * are required." onValidationChange={setDateValid} />
        <PassDesignSection fileInputRef={fileInputRef} previewUrl={previewUrl}
          qrZone={qrZone} nameZone={nameZone} qrBgColor="none"
          fontColor={fontColor} fontSizeFrac={fontSizeFrac}
          fontName={fonts.find((f) => String(f.id) === selectedFont)?.name ?? ''}
          fontFileUrl={fonts.find((f) => String(f.id) === selectedFont)?.file}
          onFileChange={handleFileChange} onQrChange={setQrZone} onNameChange={setNameZone}
          onQrBgColorChange={() => {}} isEdit={false} />
        <GuestConfigSection ticketTypes={ticketTypes} requiredFields={requiredFields} whatsappEnabled={whatsappEnabled}
          onChange={({ ticketTypes: tt, requiredFields: rf, whatsappEnabled: wa }) => {
            if (tt !== undefined) setTicketTypes(tt); if (rf !== undefined) setRequiredFields(rf); if (wa !== undefined) setWhatsappEnabled(wa)
          }} />
        <NameTypographyPanel fonts={fonts} selectedFont={selectedFont} fontColor={fontColor} fontSizeFrac={fontSizeFrac}
          onFontChange={setSelectedFont} onColorChange={setFontColor} onSizeChange={setFontSizeFrac} />
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={submitting}
            className="flex-1 rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">
            {submitting ? 'Creating…' : 'Create Event'}
          </button>
          <button type="button" onClick={() => router.push('/admin/events')}
            className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
