'use client'

import { useState, useEffect } from 'react'
import { api, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

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
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Import guests from a CSV file. Required columns: <code className="font-mono text-xs bg-gray-100 px-1 rounded">full_name</code>, <code className="font-mono text-xs bg-gray-100 px-1 rounded">phone_number</code>.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {result && (
        <div className={`mb-6 rounded-xl border px-5 py-4 text-sm ${result.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <p className="font-semibold text-gray-800 mb-2">Upload complete</p>
          <div className="flex gap-6 text-sm mb-3">
            <span className="text-green-700 font-medium">✓ {result.successful} imported</span>
            {result.failed > 0 && <span className="text-red-600 font-medium">✗ {result.failed} failed</span>}
            {result.asset_warnings.length > 0 && <span className="text-amber-600 font-medium">⚠ {result.asset_warnings.length} asset warnings</span>}
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1 mt-2">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">Row {e.row}: {e.error}</p>
              ))}
            </div>
          )}
          {result.asset_warnings.length > 0 && (
            <div className="space-y-1 mt-2">
              {result.asset_warnings.map((w) => (
                <p key={w.guest_id} className="text-xs text-amber-700">
                  {w.name} — QR: {w.qr ? '✓' : '✗'}, Pass: {w.pass ? '✓' : '✗'} (use Regenerate Assets on guest detail)
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Event <span className="text-red-500">*</span>
          </label>
          <select
            name="event"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select an event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            CSV File <span className="text-red-500">*</span>
          </label>
          <input
            name="csv_file"
            type="file"
            accept=".csv"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Optional columns: email, ticket_type (general/vip/vvip), table_number, seat_number
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {submitting ? 'Uploading…' : 'Upload Guests'}
        </button>
      </form>
    </div>
  )
}
