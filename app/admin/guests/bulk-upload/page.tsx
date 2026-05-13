'use client'

import { useState, useEffect } from 'react'
import { api, Event } from '@/lib/api'

function eventRequiredCols(ev: Event | null): string[] {
  if (!ev) return ['full_name', 'phone_number']
  const base = ['full_name']
  const rf: string[] = ev.required_fields ?? []
  if (ev.whatsapp_enabled && !rf.includes('phone_number')) base.push('phone_number')
  return [...new Set([...base, ...rf])]
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

interface UploadResult {
  upload_id: number
  total_rows: number
  successful: number
  failed: number
  errors: { row: number; error: string }[]
  asset_warnings: { guest_id: string; name: string; qr: boolean; pass: boolean }[]
}

export default function BulkUploadPage() {
  const [events, setEvents]           = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [result, setResult]           = useState<UploadResult | null>(null)
  const [error, setError]             = useState('')

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error)
  }, [])

  function handleEventChange(id: string) {
    setSelectedEvent(events.find((e) => String(e.id) === id) ?? null)
  }

  const requiredCols = eventRequiredCols(selectedEvent)
  const optionalCols = ['email', 'ticket_type', 'table_number', 'seat_number'].filter(
    (c) => !requiredCols.includes(c)
  )
  const ticketTypes = selectedEvent?.ticket_types as { value: string; label: string }[] | undefined

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setResult(null)
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData()
    const eventId = (form.elements.namedItem('event') as HTMLSelectElement).value
    const file = (form.elements.namedItem('csv_file') as HTMLInputElement).files?.[0]

    if (!eventId) { setError('Please select an event.'); setSubmitting(false); return }
    if (!file)    { setError('Please select a CSV file.'); setSubmitting(false); return }

    formData.append('event', eventId)
    formData.append('csv_file', file)

    try {
      const res = await fetch(`${BASE_URL}/guests/bulk-upload/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? JSON.stringify(data))
      setResult(data)
      form.reset()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setSubmitting(false)
    }
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

      {error && (
        <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className={`mb-5 rounded-[18px] border px-5 py-4 ${result.failed > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className="font-semibold text-[var(--ink)] mb-2">Upload complete</p>
          <div className="flex flex-wrap gap-5 text-sm mb-2">
            <span className="text-emerald-700 font-semibold">✓ {result.successful} imported</span>
            {result.failed > 0 && <span className="text-red-600 font-semibold">✗ {result.failed} failed</span>}
            {result.asset_warnings.length > 0 && <span className="text-amber-600 font-semibold">⚠ {result.asset_warnings.length} asset warnings</span>}
          </div>
          {result.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600 mt-1">Row {e.row}: {e.error}</p>
          ))}
          {result.asset_warnings.map((w) => (
            <p key={w.guest_id} className="text-xs text-amber-700 mt-1">
              {w.name} — QR: {w.qr ? '✓' : '✗'}, Pass: {w.pass ? '✓' : '✗'}
            </p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Upload details</h2>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className={label}>Event *</label>
            <select name="event" required className={field}
              onChange={(e) => handleEventChange(e.target.value)}>
              <option value="">Select an event…</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          {/* Live config summary — updates when event is chosen */}
          {selectedEvent && (
            <div className="rounded-[12px] space-y-3 border border-[var(--line)] bg-[var(--bg)] px-4 py-3.5 text-xs">
              <div>
                <p className="mb-1.5 font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>Required columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {requiredCols.map((c) => (
                    <code key={c} className="rounded-md px-2 py-0.5 font-mono font-semibold"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{c}</code>
                  ))}
                </div>
              </div>
              {optionalCols.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>Optional columns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {optionalCols.map((c) => (
                      <code key={c} className="rounded-md px-2 py-0.5 font-mono"
                        style={{ background: '#f1f5f9', color: 'var(--muted)' }}>{c}</code>
                    ))}
                  </div>
                </div>
              )}
              {ticketTypes && ticketTypes.length > 0 && (
                <div>
                  <p className="mb-1.5 font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>ticket_type values</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ticketTypes.map((t) => (
                      <span key={t.value} className="rounded-md px-2 py-0.5"
                        style={{ background: '#f1f5f9', color: 'var(--muted)' }}>
                        <code className="font-mono">{t.value}</code>
                        <span className="ml-1" style={{ color: 'var(--muted-2)' }}>({t.label})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ color: 'var(--muted-2)' }}>
                WhatsApp delivery: <b style={{ color: 'var(--ink)' }}>{selectedEvent.whatsapp_enabled ? 'Enabled' : 'Disabled'}</b>
              </p>
            </div>
          )}

          <div>
            <label className={label}>CSV File *</label>
            <input
              name="csv_file"
              type="file"
              accept=".csv"
              className="w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-strong)]"
            />
            {!selectedEvent && (
              <p className="mt-1.5 text-xs text-[var(--muted)]">Select an event above to see which columns are required.</p>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--line)] px-6 py-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            {submitting ? 'Uploading…' : 'Upload Guests'}
          </button>
        </div>
      </form>
    </div>
  )
}
