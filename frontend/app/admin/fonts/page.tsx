'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api, Font, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function FontsPage() {
  const [fonts, setFonts]         = useState<Font[]>([])
  const [events, setEvents]       = useState<Event[]>([])
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting]   = useState<number | null>(null)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const [fontName, setFontName]   = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([api.getFonts(), api.getEvents()])
      .then(([f, e]) => { setFonts(f); setEvents(e); setActiveEvent(e[0] ?? null) })
      .catch(console.error)
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(ttf|otf)$/i)) { setError('Only .ttf and .otf files are supported.'); return }
    setSelectedFile(file)
    setError('')
    if (!fontName) setFontName(file.name.replace(/\.(ttf|otf)$/i, '').replace(/[-_]/g, ' '))
  }, [fontName])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('')
    if (!fontName.trim() || !selectedFile) { setError('Name and font file are required.'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('name', fontName.trim())
    formData.append('file', selectedFile)
    const csrfToken = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
    try {
      const res = await fetch(`${BASE_URL}/fonts/`, { method: 'POST', body: formData, credentials: 'include', headers: { 'X-CSRFToken': csrfToken } })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.name?.[0] ?? err.detail ?? 'Upload failed.') }
      const newFont: Font = await res.json()
      setFonts((prev) => [...prev, newFont].sort((a, b) => a.name.localeCompare(b.name)))
      setSuccess(`"${newFont.name}" uploaded successfully.`)
      setFontName(''); setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally { setUploading(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete font "${name}"?`)) return
    setDeleting(id)
    try { await api.deleteFont(id); setFonts((prev) => prev.filter((f) => f.id !== id)) }
    catch { setError('Could not delete font.') }
    finally { setDeleting(null) }
  }

  const ev = activeEvent

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Pass Designer</p>
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Font library &amp; pass preview</p>
        </div>
        {events.length > 0 && (
          <select
            value={ev?.id ?? ''}
            onChange={(e) => setActiveEvent(events.find((ev) => ev.id === Number(e.target.value)) ?? null)}
            className="text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            style={{ background: '#1a2030', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left — Upload + Library */}
        <div className="flex w-[300px] flex-shrink-0 flex-col overflow-hidden"
          style={{ borderRight: '1px solid var(--line)' }}>

          {/* Upload form */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--line)' }}>
            <p data-tour="fonts-upload-section" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
              Upload Font
            </p>

            {error && (
              <div className="mb-3 px-3 py-2 text-[12px]" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="mb-3 px-3 py-2 text-[12px]" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(34,201,160,0.3)' }}>
                {success}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3">
              {/* Drag and drop zone */}
              <div
                data-tour="fonts-drop-zone"
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center gap-2 px-4 py-6 text-center transition-colors"
                style={{
                  border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--line)'}`,
                  background: dragOver ? 'var(--brand-soft)' : 'transparent',
                }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
                  style={{ color: dragOver ? 'var(--brand)' : 'var(--muted)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-[12px]" style={{ color: dragOver ? 'var(--brand)' : 'var(--muted)' }}>
                  {selectedFile ? selectedFile.name : 'Drop .ttf or .otf here or click to browse'}
                </p>
                <input ref={fileRef} type="file" accept=".ttf,.otf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              <input
                data-tour="fonts-name-input"
                type="text"
                placeholder="Font name"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                required
                className="w-full px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />

              <button data-tour="fonts-upload-button" type="submit" disabled={uploading || !selectedFile}
                className="w-full py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--brand)' }}>
                {uploading ? 'Uploading…' : 'Upload Font'}
              </button>
            </form>
          </div>

          {/* Font list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <p data-tour="fonts-library" className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Library · {fonts.length} font{fonts.length !== 1 ? 's' : ''}
              </p>
            </div>
            {fonts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="text-[13px]" style={{ color: 'var(--muted)' }}>No fonts uploaded yet.</p>
                <p className="text-[11px] max-w-[180px]" style={{ color: 'var(--muted-2)' }}>
                  Upload a .ttf or .otf font to use on guest passes.
                </p>
              </div>
            ) : fonts.map((f) => {
              const fileUrl = f.file.startsWith('http') ? f.file : `${BASE_URL.replace('/api', '')}${f.file}`
              const isActive = ev?.name_font_name === f.name
              return (
                <div key={f.id} className="px-5 py-4 transition-colors"
                  style={{ borderBottom: '1px solid var(--line)', background: isActive ? 'var(--brand-soft)' : 'transparent' }}>
                  <style>{`@font-face { font-family: '${f.name}'; src: url('${fileUrl}'); }`}</style>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{f.name}</p>
                        {isActive && (
                          <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: 'var(--brand)', color: '#0d1016' }}>Active</span>
                        )}
                      </div>
                      <p className="mt-2 text-[18px] leading-snug" style={{ fontFamily: `'${f.name}', serif`, color: 'var(--ink-2)' }}>
                        Aa Bb Cc
                      </p>
                      <p className="mt-1 text-[13px]" style={{ fontFamily: `'${f.name}', serif`, color: 'var(--muted)' }}>
                        The quick brown fox
                      </p>
                    </div>
                    <button onClick={() => handleDelete(f.id, f.name)} disabled={deleting === f.id}
                      className="flex-shrink-0 mt-0.5 transition hover:opacity-70 disabled:opacity-40"
                      style={{ color: 'var(--danger)' }}>
                      {deleting === f.id ? (
                        <span className="text-[11px]">…</span>
                      ) : (
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right — Pass preview */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-shrink-0 items-center justify-between px-6 py-3"
            style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
            <p data-tour="fonts-preview-panel" className="text-[12px]" style={{ color: 'var(--muted)' }}>
              {ev ? `${ev.name} · Pass template preview` : 'Select an event to preview'}
            </p>
            {ev && (
              <a href={`/admin/events/${ev.id}/edit`}
                className="text-[11px] font-semibold transition hover:opacity-80"
                style={{ color: 'var(--brand)' }}>
                Edit event →
              </a>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-8">
            {ev?.design_template ? (
              <div className="w-full max-w-[560px]">
                <img
                  src={ev.design_template.startsWith('http') ? ev.design_template : `${BASE_URL.replace('/api', '')}${ev.design_template}`}
                  alt="Pass template"
                  className="w-full shadow-2xl"
                  style={{ border: '1px solid var(--line)' }}
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'QR Zone', x: ev.qr_zone_x, y: ev.qr_zone_y, w: ev.qr_zone_w, h: ev.qr_zone_h },
                    { label: 'Name Zone', x: ev.name_zone_x, y: ev.name_zone_y, w: ev.name_zone_w, h: ev.name_zone_h },
                  ].map(({ label, x, y, w, h }) => (
                    <div key={label} className="px-4 py-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{label}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[['X', x], ['Y', y], ['W', w], ['H', h]].map(([k, v]) => (
                          <div key={String(k)} className="flex items-center justify-between text-[12px]">
                            <span style={{ color: 'var(--muted)' }}>{k}</span>
                            <span className="font-mono" style={{ color: v != null ? 'var(--ink)' : 'var(--muted-2)' }}>{v ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {ev.name_font_name && (
                  <div className="mt-3 px-4 py-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>Typography</p>
                    <div className="flex items-center gap-4 text-[12px]">
                      <span style={{ color: 'var(--muted)' }}>Font</span>
                      <span style={{ color: 'var(--ink)' }}>{ev.name_font_name}</span>
                      <span style={{ color: 'var(--muted)' }}>Color</span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full border border-white/10" style={{ background: ev.name_font_color ?? '#fff' }} />
                        <span style={{ color: 'var(--ink)' }}>{ev.name_font_color ?? '—'}</span>
                      </span>
                      <span style={{ color: 'var(--muted)' }}>Size</span>
                      <span style={{ color: 'var(--ink)' }}>{Math.round((ev.name_font_size_fraction ?? 0) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center"
                  style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24"
                    style={{ color: 'var(--muted)' }}>
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No template uploaded</p>
                  <p className="mt-1 text-[12px] max-w-[280px]" style={{ color: 'var(--muted)' }}>
                    Upload a pass design template for this event, then configure the QR and name placement zones.
                  </p>
                </div>
                {ev && (
                  <a href={`/admin/events/${ev.id}/edit`}
                    className="px-5 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
                    style={{ background: 'var(--brand)' }}>
                    Upload template in event settings
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
