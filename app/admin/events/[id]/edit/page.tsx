'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { api, Event } from '@/lib/api'
import QrZoneSelector, { QrZone } from '@/components/QrZoneSelector'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [newFileChosen, setNewFileChosen] = useState(false)

  const [qrZone, setQrZone] = useState<QrZone | null>(null)
  const [zoneTouched, setZoneTouched] = useState(false)

  useEffect(() => {
    api.getEvent(Number(id))
      .then((ev) => {
        setEvent(ev)
        if (ev.qr_zone_x != null && ev.qr_zone_y != null &&
            ev.qr_zone_w != null && ev.qr_zone_h != null) {
          setQrZone({ x: ev.qr_zone_x, y: ev.qr_zone_y, w: ev.qr_zone_w, h: ev.qr_zone_h })
        }
        if (ev.design_template) setPreviewUrl(ev.design_template)
      })
      .catch(() => setError('Could not load event.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewFileChosen(true)
    setQrZone(null)
    setZoneTouched(false)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleZoneChange(zone: QrZone | null) {
    setQrZone(zone)
    setZoneTouched(true)
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

    if (zoneTouched) {
      if (qrZone) {
        formData.append('qr_zone_x', String(qrZone.x))
        formData.append('qr_zone_y', String(qrZone.y))
        formData.append('qr_zone_w', String(qrZone.w))
        formData.append('qr_zone_h', String(qrZone.h))
      } else {
        formData.append('qr_zone_x', '')
        formData.append('qr_zone_y', '')
        formData.append('qr_zone_w', '')
        formData.append('qr_zone_h', '')
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/events/${id}/`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? JSON.stringify(err))
      }
      router.push('/admin/events')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">Loading event…</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="px-8 py-8">
        <p className="text-sm text-red-500">{error || 'Event not found.'}</p>
      </div>
    )
  }

  const localDateValue = event.date ? new Date(event.date).toISOString().slice(0, 16) : ''

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
        <p className="text-sm text-gray-500 mt-0.5">{event.name}</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Event Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={event.name}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                name="date"
                type="datetime-local"
                required
                defaultValue={localDateValue}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Venue</label>
              <input
                name="venue"
                type="text"
                defaultValue={event.venue}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={event.description}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1">Pass Design & QR Zone</h2>
            <p className="text-xs text-gray-400">
              Leave the file picker empty to keep the existing design. Upload a new file to replace it.
            </p>
          </div>

          {event.design_template && !newFileChosen && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              <span className="text-xs font-medium text-gray-500">Current design:</span>
              <a
                href={event.design_template}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline font-medium truncate"
              >
                {event.design_template.split('/').pop()}
              </a>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {newFileChosen ? 'New Design File' : 'Replace Design (PNG / JPG)'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {previewUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${qrZone ? 'bg-green-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  {qrZone ? '✓' : '!'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {qrZone ? 'QR zone is set' : 'No QR zone set'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {newFileChosen
                      ? 'New design uploaded — draw a new QR zone below.'
                      : 'Drag to redraw the zone, or leave it as-is.'}
                  </p>
                </div>
              </div>

              <QrZoneSelector imageUrl={previewUrl} zone={qrZone} onChange={handleZoneChange} />

              {!qrZone && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <span>⚠</span>
                  No QR zone — the QR code will fall back to the bottom-right corner.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/events')}
            className="flex-1 border border-gray-200 hover:border-gray-400 text-gray-700 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
