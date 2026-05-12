'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, Font } from '@/lib/api'
import ZoneSelector from '@/components/ZoneSelector'
import type { Zone } from '@/components/ZoneSelector'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const field = 'w-full rounded-[12px] border border-[var(--line)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

export default function AddEventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qrZone, setQrZone]     = useState<Zone | null>(null)
  const [nameZone, setNameZone] = useState<Zone | null>(null)

  const [fonts, setFonts]             = useState<Font[]>([])
  const [selectedFont, setSelectedFont] = useState<string>('')
  const [fontColor, setFontColor]     = useState('#ffffff')
  const [fontSizeFrac, setFontSizeFrac] = useState(0.05)

  useEffect(() => {
    api.getFonts().then(setFonts).catch(console.error)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrZone(null); setNameZone(null)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData()
    formData.append('name',        (form.elements.namedItem('name')        as HTMLInputElement).value)
    formData.append('date',        (form.elements.namedItem('date')        as HTMLInputElement).value)
    formData.append('venue',       (form.elements.namedItem('venue')       as HTMLInputElement).value)
    formData.append('description', (form.elements.namedItem('description') as HTMLTextAreaElement).value)

    const fileInput = fileInputRef.current
    if (fileInput?.files?.[0]) formData.append('design_template', fileInput.files[0])

    if (qrZone) {
      formData.append('qr_zone_x', String(qrZone.x))
      formData.append('qr_zone_y', String(qrZone.y))
      formData.append('qr_zone_w', String(qrZone.w))
      formData.append('qr_zone_h', String(qrZone.h))
    }
    if (nameZone) {
      formData.append('name_zone_x', String(nameZone.x))
      formData.append('name_zone_y', String(nameZone.y))
      formData.append('name_zone_w', String(nameZone.w))
      formData.append('name_zone_h', String(nameZone.h))
    }
    if (selectedFont) formData.append('name_font', selectedFont)
    formData.append('name_font_color',         fontColor)
    formData.append('name_font_size_fraction', String(fontSizeFrac))

    try {
      const res = await fetch(`${BASE_URL}/events/`, {
        method: 'POST', body: formData, credentials: 'include',
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
        <p className="mt-1 text-sm text-[var(--muted)]">Create an event and configure the pass design template.</p>
      </div>

      {error && (
        <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Event details ── */}
        <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Event Details</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Fields marked * are required.</p>
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

        {/* ── Design template & zones ── */}
        <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Pass Design & Zones</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Upload your design, then drag to mark the QR code area and the guest name area.
            </p>
          </div>

          <div className="space-y-5 p-6">
            {/* File picker */}
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
              <>
                {/* Zone legend */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <ZoneLegendItem color="#6366f1" label="QR Zone" set={!!qrZone} />
                  <ZoneLegendItem color="#10b981" label="Name Zone" set={!!nameZone} />
                </div>

                {/* The image with both zone overlays rendered together */}
                <DualZoneCanvas
                  imageUrl={previewUrl}
                  qrZone={qrZone}  onQrChange={setQrZone}
                  nameZone={nameZone} onNameChange={setNameZone}
                />

                {!qrZone && (
                  <ZoneWarning>No QR zone — will fall back to bottom-right corner.</ZoneWarning>
                )}
                {!nameZone && (
                  <ZoneWarning>No name zone — guest name will not be printed on the pass.</ZoneWarning>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Name typography ── */}
        <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--ink)]">Name Typography</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Controls how the guest name is rendered inside the name zone.
              <a href="/admin/fonts" className="ml-1 font-semibold hover:underline" style={{ color: 'var(--brand)' }}>Manage fonts →</a>
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <div>
              <label className={label}>Font</label>
              <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className={field}>
                <option value="">Default (system)</option>
                {fonts.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="h-10 w-10 flex-shrink-0 cursor-pointer rounded-lg border p-0.5"
                  style={{ borderColor: 'var(--line)' }}
                />
                <input
                  type="text"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  maxLength={7}
                  placeholder="#ffffff"
                  className={`${field} flex-1`}
                />
              </div>
            </div>
            <div>
              <label className={label}>
                Size — {(fontSizeFrac * 100).toFixed(1)}% of height
              </label>
              <input
                type="range"
                min={0.02} max={0.15} step={0.005}
                value={fontSizeFrac}
                onChange={(e) => setFontSizeFrac(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--brand)]"
              />
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--muted-2)' }}>
                <span>Smaller</span><span>Larger</span>
              </div>
            </div>
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

// ── Small helper components ────────────────────────────────────────────────────

function ZoneLegendItem({ color, label, set }: { color: string; label: string; set: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: color, opacity: set ? 1 : 0.3 }} />
      <span className={set ? 'font-semibold' : ''} style={{ color: set ? 'var(--ink)' : 'var(--muted-2)' }}>
        {label} {set ? '✓' : '(not set)'}
      </span>
    </div>
  )
}

function ZoneWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-600">
      <span>⚠</span> {children}
    </div>
  )
}

// Renders the image once with both QR and Name zone overlays, using two toggle buttons
// to switch which zone the drag applies to.
function DualZoneCanvas({
  imageUrl,
  qrZone, onQrChange,
  nameZone, onNameChange,
}: {
  imageUrl: string
  qrZone: Zone | null
  onQrChange: (z: Zone | null) => void
  nameZone: Zone | null
  onNameChange: (z: Zone | null) => void
}) {
  const [active, setActive] = useState<'qr' | 'name'>('qr')

  return (
    <div className="space-y-2">
      {/* Toggle row */}
      <div className="flex gap-2">
        {(['qr', 'name'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setActive(mode)}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition"
            style={{
              background: active === mode ? (mode === 'qr' ? '#6366f1' : '#10b981') : '#fff',
              borderColor: active === mode ? (mode === 'qr' ? '#6366f1' : '#10b981') : 'var(--line)',
              color: active === mode ? '#fff' : 'var(--muted)',
            }}
          >
            {mode === 'qr' ? 'Draw QR Zone' : 'Draw Name Zone'}
          </button>
        ))}
      </div>

      {/* QR selector (hidden when active=name but still renders its saved zone) */}
      {active === 'qr' && (
        <ZoneSelector
          imageUrl={imageUrl}
          zone={qrZone}
          onChange={onQrChange}
          label="QR Zone"
          color="indigo"
          borderColor="#6366f1"
          bgColor="rgba(99,102,241,0.10)"
          dotColor="#6366f1"
        />
      )}
      {active === 'name' && (
        <ZoneSelector
          imageUrl={imageUrl}
          zone={nameZone}
          onChange={onNameChange}
          label="Name Zone"
          color="emerald"
          borderColor="#10b981"
          bgColor="rgba(16,185,129,0.10)"
          dotColor="#10b981"
        />
      )}
    </div>
  )
}
