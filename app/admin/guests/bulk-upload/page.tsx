'use client'

import { useState, useEffect } from 'react'
import { api, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const field = 'w-full rounded-[14px] border border-stone-200 bg-white px-4 py-3 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-2'

interface UploadResult {
  upload_id: number
  total_rows: number
  successful: number
  failed: number
  errors: { row: number; error: string }[]
  asset_warnings: { guest_id: string; name: string; qr: boolean; pass: boolean }[]
}

export default function BulkUploadPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error)
  }, [])

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
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-8 rounded-[28px] bg-[#f0f4ff] px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--brand)]">Team import</p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)]">Bulk Upload</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Import a guest list from CSV. Required columns:{' '}
          <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs text-[var(--ink)]">full_name</code>,{' '}
          <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs text-[var(--ink)]">phone_number</code>.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className={`mb-6 rounded-[22px] border px-6 py-5 ${result.failed > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className="font-semibold text-[var(--ink)] mb-3">Upload complete</p>
          <div className="flex flex-wrap gap-6 text-sm mb-3">
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

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-6 py-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Upload details</h2>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className={label}>Event *</label>
            <select name="event" required className={field}>
              <option value="">Select an event…</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={label}>CSV File *</label>
            <input
              name="csv_file"
              type="file"
              accept=".csv"
              className="w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-strong)]"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Optional columns: email, ticket_type (general / vip / vvip), table_number, seat_number
            </p>
          </div>
        </div>

        <div className="border-t border-stone-100 px-6 py-5">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            {submitting ? 'Uploading…' : 'Upload Guests'}
          </button>
        </div>
      </form>
    </div>
  )
}
