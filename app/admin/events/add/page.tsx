'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import QrZoneSelector, { QrZone } from '@/components/QrZoneSelector'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

export default function AddEventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qrZone, setQrZone] = useState<QrZone | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrZone(null)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData()
    formData.append('name', (form.elements.namedItem('name') as HTMLInputElement).value)
    formData.append('date', (form.elements.namedItem('date') as HTMLInputElement).value)
    formData.append('venue', (form.elements.namedItem('venue') as HTMLInputElement).value)
    formData.append('description', (form.elements.namedItem('description') as HTMLTextAreaElement).value)

    const fileInput = fileInputRef.current
    if (fileInput?.files?.[0]) {
      formData.append('design_template', fileInput.files[0])
    }
    if (qrZone) {
      formData.append('qr_zone_x', String(qrZone.x))
      formData.append('qr_zone_y', String(qrZone.y))
      formData.append('qr_zone_w', String(qrZone.w))
      formData.append('qr_zone_h', String(qrZone.h))
    }

    try {
      const res = await fetch(`${BASE_URL}/events/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? JSON.stringify(err))
      }
      router.push('/admin/events')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event.')
      setSubmitting(false)
    }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">

      <div className="mb-8 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand)]">Event setup</p>
        <h1 className="mt-2 font-display text-4xl text-[var(--ink)]">New Event</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Create an event and upload the pass design template.</p>
      </div>

      {error && (
        <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Event Details</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Fields marked * are required.</p>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Event Name *</label>
              <input name="name" type="text" required placeholder="e.g. Annual Gala 2026" className={field} />
            </div>
            <div>
              <label className={label}>Date & Time *</label>
              <input name="date" type="datetime-local" required className={field} />
            </div>
            <div>
              <label className={label}>Venue</label>
              <input name="venue" type="text" placeholder="optional" className={field} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Description</label>
              <textarea name="description" rows={2} placeholder="optional" className={`${field} resize-none`} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Pass Design & QR Zone</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Upload your design, then drag to mark where the QR code should appear.</p>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <label className={label}>Design Template (PNG / JPG)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                className="w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-strong)]"
              />
            </div>

            {previewUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${qrZone ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {qrZone ? '✓' : '!'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{qrZone ? 'QR zone is set' : 'No QR zone set'}</p>
                    <p className="text-xs text-[var(--muted)]">Drag on the image below to mark the QR code area.</p>
                  </div>
                </div>
                <QrZoneSelector imageUrl={previewUrl} zone={qrZone} onChange={setQrZone} />
                {!qrZone && (
                  <div className="flex items-center gap-2 rounded-[10px] border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                    <span>⚠</span> No QR zone — will fall back to bottom-right corner.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
