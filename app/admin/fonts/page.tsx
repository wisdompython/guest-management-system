'use client'

import { useState, useEffect, useRef } from 'react'
import { api, Font, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function PassDesignerPage() {
  const [fonts, setFonts]       = useState<Font[]>([])
  const [events, setEvents]     = useState<Event[]>([])
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([api.getFonts(), api.getEvents()])
      .then(([f, e]) => {
        setFonts(f)
        setEvents(e)
        setActiveEvent(e[0] ?? null)
      })
      .catch(console.error)
  }, [])

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccess('')
    const name = nameRef.current?.value.trim()
    const file = fileRef.current?.files?.[0]
    if (!name || !file) { setError('Name and file are required.'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('name', name)
    formData.append('file', file)
    const csrfToken = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
    try {
      const res = await fetch(`${BASE_URL}/fonts/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: { 'X-CSRFToken': csrfToken },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.name?.[0] ?? err.detail ?? 'Upload failed.')
      }
      const newFont: Font = await res.json()
      setFonts((prev) => [...prev, newFont].sort((a, b) => a.name.localeCompare(b.name)))
      setSuccess(`"${newFont.name}" uploaded.`)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally { setUploading(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete font "${name}"?`)) return
    setDeleting(id)
    try {
      await api.deleteFont(id)
      setFonts((prev) => prev.filter((f) => f.id !== id))
    } catch {
      setError('Could not delete font.')
    } finally { setDeleting(null) }
  }

  const ev = activeEvent

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Left: Layers panel ──────────────────────────────────── */}
      <div className="w-[200px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>

        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
            PASS DESIGNER
          </p>
          <p className="mt-0.5 text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
            {ev ? ev.name : 'No event selected'}
          </p>
        </div>

        {/* Event selector */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>EVENT</p>
          {events.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>No events yet.</p>
          ) : (
            <select
              value={ev?.id ?? ''}
              onChange={(e) => setActiveEvent(events.find((ev) => ev.id === Number(e.target.value)) ?? null)}
              className="w-full bg-transparent text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] px-2 py-1.5"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          )}
        </div>

        {/* Template info */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>TEMPLATE</p>
          {ev?.design_template ? (
            <p className="text-[12px] break-all" style={{ color: 'var(--brand)' }}>{ev.design_template}</p>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>No template set for this event.</p>
          )}

          {ev && (
            <div className="mt-4 space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>QR ZONE</p>
              {[
                ['X', ev.qr_zone_x], ['Y', ev.qr_zone_y], ['W', ev.qr_zone_w], ['H', ev.qr_zone_h],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center justify-between text-[12px]">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="font-mono" style={{ color: v != null ? 'var(--ink)' : 'var(--muted-2)' }}>
                    {v ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {ev && (
            <div className="mt-4 space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>NAME ZONE</p>
              {[
                ['X', ev.name_zone_x], ['Y', ev.name_zone_y], ['W', ev.name_zone_w], ['H', ev.name_zone_h],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center justify-between text-[12px]">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="font-mono" style={{ color: v != null ? 'var(--ink)' : 'var(--muted-2)' }}>
                    {v ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Preview ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        <div className="flex flex-shrink-0 items-center justify-between px-5 py-2.5"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
            {ev ? `${ev.name} · ${new Date(ev.date).toLocaleDateString('en-GB')}` : 'Select an event'}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
              {ev?.ticket_types?.length ?? 0} ticket type{ev?.ticket_types?.length !== 1 ? 's' : ''} · {ev?.guest_count ?? 0} guests
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-8">
          {ev?.design_template ? (
            <div className="w-full max-w-[640px]">
              <img
                src={ev.design_template.startsWith('http') ? ev.design_template : `${BASE_URL.replace('/api', '')}${ev.design_template}`}
                alt="Pass template"
                className="w-full"
                style={{ border: '1px solid var(--line)' }}
              />
              <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
                Template preview · actual passes will have guest data merged in
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center"
                style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
                  style={{ color: 'var(--muted)' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No template uploaded</p>
              <p className="text-xs max-w-[260px]" style={{ color: 'var(--muted)' }}>
                Upload a pass template image for this event via the event settings, then configure the QR and name zones.
              </p>
              {ev && (
                <a href={`/admin/events/${ev.id}/edit`}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-white"
                  style={{ background: 'var(--brand)' }}>
                  Edit event settings
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Font library ──────────────────────────────────── */}
      <div className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)' }}>

        <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>
            FONT LIBRARY · {fonts.length}
          </p>
          {error && <p className="mb-2 text-[11px]" style={{ color: 'var(--danger)' }}>{error}</p>}
          {success && <p className="mb-2 text-[11px]" style={{ color: 'var(--brand)' }}>{success}</p>}
          <form onSubmit={handleUpload} className="space-y-2">
            <input ref={nameRef} type="text" placeholder="Font name" required
              className="w-full bg-transparent px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }} />
            <input ref={fileRef} type="file" accept=".ttf,.otf" required
              className="w-full text-[11px]" style={{ color: 'var(--muted)' }} />
            <button type="submit" disabled={uploading}
              className="w-full py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--brand)' }}>
              {uploading ? 'Uploading…' : 'Upload font'}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fonts.length === 0 ? (
            <p className="p-4 text-[12px]" style={{ color: 'var(--muted)' }}>No fonts uploaded yet.</p>
          ) : fonts.map((f) => {
            const fileUrl = f.file.startsWith('http') ? f.file : `${BASE_URL.replace('/api', '')}${f.file}`
            const fontFace = `@font-face { font-family: '${f.name}'; src: url('${fileUrl}'); }`
            return (
              <div key={f.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                <style>{fontFace}</style>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{f.name}</p>
                  <button onClick={() => handleDelete(f.id, f.name)} disabled={deleting === f.id}
                    className="flex-shrink-0 text-[11px] transition hover:opacity-70 disabled:opacity-40"
                    style={{ color: 'var(--danger)' }}>
                    {deleting === f.id ? '…' : 'Delete'}
                  </button>
                </div>
                <p className="mt-1 text-[13px]" style={{ fontFamily: `'${f.name}', serif`, color: 'var(--muted)' }}>
                  The quick brown fox
                </p>
              </div>
            )
          })}
        </div>

        {/* Active event font */}
        {ev?.name_font_name && (
          <div className="p-4" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>ACTIVE FONT</p>
            <p className="text-[12px]" style={{ color: 'var(--brand)' }}>{ev.name_font_name}</p>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              {ev.name_font_color} · {Math.round(ev.name_font_size_fraction * 100)}% size
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
