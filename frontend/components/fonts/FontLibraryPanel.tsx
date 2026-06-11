'use client'

import { RefObject } from 'react'
import { Font, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

interface Props {
  fonts: Font[]
  activeEvent: Event | null
  error: string
  success: string
  uploading: boolean
  deleting: number | null
  nameRef: RefObject<HTMLInputElement | null>
  fileRef: RefObject<HTMLInputElement | null>
  onUpload: (e: React.FormEvent<HTMLFormElement>) => void
  onDelete: (id: number, name: string) => void
}

export function FontLibraryPanel({
  fonts, activeEvent, error, success, uploading, deleting,
  nameRef, fileRef, onUpload, onDelete,
}: Props) {
  const ev = activeEvent
  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>
          FONT LIBRARY · {fonts.length}
        </p>
        {error && <p className="mb-2 text-[11px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        {success && <p className="mb-2 text-[11px]" style={{ color: 'var(--brand)' }}>{success}</p>}
        <form onSubmit={onUpload} className="space-y-2">
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
                <button onClick={() => onDelete(f.id, f.name)} disabled={deleting === f.id}
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
  )
}
