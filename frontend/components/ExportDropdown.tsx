'use client'

import { useEffect, useRef, useState } from 'react'
import { Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

interface Props {
  events: Event[]
}

export default function ExportDropdown({ events }: Props) {
  const [open, setOpen]             = useState(false)
  const [exportEvent, setExportEvent]   = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleDownload() {
    const params = new URLSearchParams()
    if (exportEvent)  params.set('event',  exportEvent)
    if (exportStatus) params.set('status', exportStatus)
    const qs = params.toString()
    window.location.href = `${BASE_URL}/guests/export/${qs ? '?' + qs : ''}`
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: 'var(--brand)' }}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-[14px] shadow-xl"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'var(--panel)' }}
        >
          <div className="border-b px-4 py-3.5" style={{ borderColor: 'var(--line)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Export Guest List</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>Download as CSV. Leave filters blank to export everyone.</p>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Event
              </label>
              <select
                value={exportEvent}
                onChange={(e) => setExportEvent(e.target.value)}
                className="w-full rounded-[10px] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: '#1a2030' }}
              >
                <option value="">All events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Status
              </label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="w-full rounded-[10px] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: '#1a2030' }}
              >
                <option value="">All statuses</option>
                <option value="registered">Pending</option>
                <option value="checked_in">Checked-in</option>
              </select>
            </div>

            <div className="rounded-[10px] px-3 py-2.5 text-xs" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
              Columns: Name · Email · Phone · Ticket · Table · Seat · Status · Registered · Checked-in · WhatsApp · Event
            </div>
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--brand)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
