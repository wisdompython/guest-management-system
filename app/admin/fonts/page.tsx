'use client'

import { useState, useEffect, useRef } from 'react'
import { api, Font } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

export default function FontsPage() {
  const [fonts, setFonts]       = useState<Font[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const fileRef  = useRef<HTMLInputElement>(null)
  const nameRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getFonts()
      .then(setFonts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccess('')
    const name = nameRef.current?.value.trim()
    const file = fileRef.current?.files?.[0]
    if (!name) { setError('Font name is required.'); return }
    if (!file) { setError('Please select a font file.'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('name', name)
    formData.append('file', file)

    try {
      const res = await fetch(`${BASE_URL}/fonts/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.name?.[0] ?? err.detail ?? 'Upload failed.')
      }
      const newFont: Font = await res.json()
      setFonts((prev) => [...prev, newFont].sort((a, b) => a.name.localeCompare(b.name)))
      setSuccess(`"${newFont.name}" uploaded successfully.`)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete font "${name}"? Events using it will fall back to the default font.`)) return
    setDeleting(id)
    try {
      await api.deleteFont(id)
      setFonts((prev) => prev.filter((f) => f.id !== id))
    } catch {
      setError('Could not delete font.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Font Library</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
            Upload TTF or OTF fonts. These are available for personalised name printing on guest passes.
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          {fonts.length} font{fonts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Upload card */}
      <div className="mb-6 overflow-hidden rounded-[16px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--line)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Upload a new font</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>Accepts .ttf and .otf files</p>
        </div>

        <form onSubmit={handleUpload} className="p-6">
          {error && (
            <div className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Display Name *
              </label>
              <input
                ref={nameRef}
                type="text"
                placeholder="e.g. Playfair Display"
                required
                className="w-full rounded-[10px] border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Font File *
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".ttf,.otf"
                required
                className="w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
                style={{ color: 'var(--muted)' }}
                // inline style on file button via CSS hack
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--brand)' }}
            >
              {uploading ? 'Uploading…' : 'Upload Font'}
            </button>
          </div>
        </form>
      </div>

      {/* Font list */}
      <div className="overflow-hidden rounded-[16px]" style={{ border: '1px solid var(--line)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : fonts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--brand-soft)' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ color: 'var(--brand)' }}>
                <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No fonts uploaded yet</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Upload a TTF or OTF file above to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest"
                style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--bg)' }}>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Preview</th>
                <th className="px-5 py-3 text-left">File</th>
                <th className="px-5 py-3 text-left">Uploaded</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fonts.map((f) => {
                const fileUrl = f.file.startsWith('http') ? f.file : `${BASE_URL.replace('/api', '')}${f.file}`
                const fileName = f.file.split('/').pop() ?? f.file
                return (
                  <tr key={f.id} style={{ borderTop: '1px solid var(--line)' }}
                    className="transition-colors hover:bg-[var(--bg)]">
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>{f.name}</td>
                    <td className="px-5 py-3.5">
                      <FontPreviewCell fontUrl={fileUrl} fontName={f.name} />
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      <a href={fileUrl} download className="hover:underline" style={{ color: 'var(--brand)' }}>
                        {fileName}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(f.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleDelete(f.id, f.name)}
                        disabled={deleting === f.id}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 transition"
                      >
                        {deleting === f.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function FontPreviewCell({ fontUrl, fontName }: { fontUrl: string; fontName: string }) {
  const fontFace = `@font-face { font-family: '${fontName}'; src: url('${fontUrl}'); }`
  return (
    <>
      <style>{fontFace}</style>
      <span style={{ fontFamily: `'${fontName}', serif`, fontSize: '16px', color: 'var(--ink)' }}>
        The quick brown fox
      </span>
    </>
  )
}
