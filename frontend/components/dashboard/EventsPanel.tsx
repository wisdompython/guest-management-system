'use client'

import Link from 'next/link'
import { Event } from '@/lib/api'

interface Props {
  events: Event[]
  loading: boolean
}

export function EventsPanel({ events, loading }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Events</p>
          <Link href="/admin/events" className="text-[11px] transition hover:opacity-70" style={{ color: 'var(--brand)' }}>
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>No events yet.</div>
        ) : events.slice(0, 4).map((ev) => (
          <div key={ev.id} className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{ev.name}</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                {new Date(ev.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                {ev.venue ? ' · ' + ev.venue : ''}
              </p>
            </div>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {ev.guest_count}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/guests/add"
          className="p-4 transition hover:opacity-80"
          style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>New</p>
          <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Add Guest</p>
        </Link>
        <Link href="/admin/guests/bulk-upload"
          className="p-4 transition hover:opacity-80"
          style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>Import</p>
          <p className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Bulk Upload</p>
        </Link>
      </div>
    </div>
  )
}
