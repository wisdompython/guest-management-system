'use client'

import { useState, useEffect } from 'react'
import { api, Event } from '@/lib/api'
import { UploadForm } from '@/components/bulk-upload/UploadForm'
import { UploadResults } from '@/components/bulk-upload/UploadResults'

interface UploadResult {
  upload_id: number
  total_rows: number
  successful: number
  failed: number
  replaced: number
  errors: { row: number; error?: string; errors?: string[] }[]
  asset_warnings: { guest_id: string; name: string; qr: boolean; pass: boolean }[]
}

function eventRequiredCols(ev: Event | null): string[] {
  if (!ev) return ['full_name', 'phone_number']
  const base = ['full_name']
  const rf: string[] = ev.required_fields ?? []
  if (ev.whatsapp_enabled && !rf.includes('phone_number')) base.push('phone_number')
  return [...new Set([...base, ...rf])]
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function BulkUploadPage() {
  const [events, setEvents]           = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [result, setResult]           = useState<UploadResult | null>(null)
  const [error, setError]             = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)

  useEffect(() => {
    api.getEvents().then((items) => {
      setEvents(items)
      const params = new URLSearchParams(window.location.search)
      const eventId = Number(params.get('event'))
      if (eventId) setSelectedEvent(items.find((item) => item.id === eventId) ?? null)
      setReplaceExisting(params.get('replace') === '1')
    }).catch(console.error)
  }, [])

  function handleEventChange(id: string) {
    setSelectedEvent(events.find((e) => String(e.id) === id) ?? null)
  }

  const requiredCols = eventRequiredCols(selectedEvent)
  const optionalCols = ['email', 'ticket_type', 'table_number', 'seat_number',
    ...(selectedEvent?.collect_aso_ebi ? ['aso_ebi_requested', 'aso_ebi_yards'] : []),
  ].filter(
    (c) => !requiredCols.includes(c)
  )
  const ticketTypes = selectedEvent?.ticket_types as { value: string; label: string }[] | undefined

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setResult(null); setSubmitting(true)
    const form = e.currentTarget
    const formData = new FormData()
    const eventId = (form.elements.namedItem('event') as HTMLSelectElement).value
    const file = (form.elements.namedItem('csv_file') as HTMLInputElement).files?.[0]
    if (!eventId) { setError('Please select an event.'); setSubmitting(false); return }
    if (!file)    { setError('Please select a CSV file.'); setSubmitting(false); return }
    formData.append('event', eventId)
    formData.append('csv_file', file)
    formData.append('replace_existing', String(replaceExisting))
    if (replaceExisting && !confirm(`Replace the entire guest list for "${selectedEvent?.name}"?\n\nExisting guests, RSVP responses, links, QR codes, and passes will be deleted only after the replacement CSV passes validation.`)) {
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch(`${BASE_URL}/guests/bulk-upload/`, { method: 'POST', body: formData, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        const rowDetails = Array.isArray(data.errors)
          ? data.errors.slice(0, 5).map((item: { row?: number; error?: string; errors?: string[] }) => `Row ${item.row ?? '?'}: ${item.error ?? item.errors?.join(' ') ?? 'Invalid data'}`).join('\n')
          : ''
        const msg = data.detail
          ?? (data.csv_file ? (Array.isArray(data.csv_file) ? data.csv_file[0] : data.csv_file)
          : data.event ? (Array.isArray(data.event) ? data.event[0] : data.event)
          : JSON.stringify(data))
        throw new Error(rowDetails ? `${msg}\n${rowDetails}` : msg)
      }
      setResult(data)
      const fileInput = form.elements.namedItem('csv_file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10">
      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Team import</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">Bulk Upload</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Import a guest list from CSV. Select an event first — required columns update automatically.
        </p>
      </div>
      {error && <div className="mb-5 rounded-[14px] px-5 py-3.5 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}
      {result && <UploadResults result={result} />}
      {result && selectedEvent && <a href={`/admin/guests?event=${selectedEvent.id}`} className="mb-5 inline-block text-sm font-semibold text-[var(--brand)]">View updated guest list &rarr;</a>}
      <UploadForm
        events={events} selectedEvent={selectedEvent} submitting={submitting}
        requiredCols={requiredCols} optionalCols={optionalCols} ticketTypes={ticketTypes}
        replaceExisting={replaceExisting} onReplaceExistingChange={setReplaceExisting}
        onSubmit={handleSubmit} onEventChange={handleEventChange}
      />
    </div>
  )
}
