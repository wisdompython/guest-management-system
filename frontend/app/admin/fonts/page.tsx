'use client'

import { useState, useEffect, useRef } from 'react'
import { api, Font, Event } from '@/lib/api'
import { FontLayersPanel } from '@/components/fonts/FontLayersPanel'
import { FontPreviewPanel } from '@/components/fonts/FontPreviewPanel'
import { FontLibraryPanel } from '@/components/fonts/FontLibraryPanel'

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
      .then(([f, e]) => { setFonts(f); setEvents(e); setActiveEvent(e[0] ?? null) })
      .catch(console.error)
  }, [])

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setSuccess('')
    const name = nameRef.current?.value.trim()
    const file = fileRef.current?.files?.[0]
    if (!name || !file) { setError('Name and file are required.'); return }
    setUploading(true)
    const formData = new FormData()
    formData.append('name', name); formData.append('file', file)
    const csrfToken = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='))?.split('=')[1] ?? ''
    try {
      const res = await fetch(`${BASE_URL}/fonts/`, { method: 'POST', body: formData, credentials: 'include', headers: { 'X-CSRFToken': csrfToken } })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.name?.[0] ?? err.detail ?? 'Upload failed.') }
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
    try { await api.deleteFont(id); setFonts((prev) => prev.filter((f) => f.id !== id)) }
    catch { setError('Could not delete font.') }
    finally { setDeleting(null) }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <FontLayersPanel events={events} activeEvent={activeEvent} onEventChange={setActiveEvent} />
      <FontPreviewPanel activeEvent={activeEvent} />
      <FontLibraryPanel
        fonts={fonts} activeEvent={activeEvent} error={error} success={success}
        uploading={uploading} deleting={deleting} nameRef={nameRef} fileRef={fileRef}
        onUpload={handleUpload} onDelete={handleDelete}
      />
    </div>
  )
}
