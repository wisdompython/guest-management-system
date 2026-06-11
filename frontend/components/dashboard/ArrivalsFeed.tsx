'use client'

import Link from 'next/link'
import { Guest } from '@/lib/api'

interface Props {
  guests: Guest[]
  loading: boolean
}

export function ArrivalsFeed({ guests, loading }: Props) {
  return (
    <div style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: 'var(--brand)' }} />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Arrivals feed</p>
        </div>
        <Link href="/admin/guests" className="text-[11px] transition hover:opacity-70" style={{ color: 'var(--brand)' }}>
          View all →
        </Link>
      </div>
      <div>
        {loading ? (
          <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : guests.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>No arrivals yet.</div>
        ) : guests.map((g) => {
          const initials = g.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
          const checkedInTime = g.checked_in_at
            ? new Date(g.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : null
          return (
            <div key={g.id} className="flex items-center gap-3 px-5 py-2.5"
              style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="w-10 text-[11px] font-mono tabular-nums" style={{ color: checkedInTime ? 'var(--ink)' : 'var(--muted-2)' }}>
                {checkedInTime || '--:--'}
              </div>
              {checkedInTime
                ? <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>IN</span>
                : <span className="w-8" />
              }
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                {initials}
              </div>
              <p className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                {g.full_name}
                <span className="ml-1.5 text-[11px] font-normal" style={{ color: 'var(--muted)' }}>
                  · {g.ticket_type.toUpperCase()}
                </span>
              </p>
              <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                {g.table_number ? `T-${g.table_number}` : '—'}
              </span>
              <span className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: g.status === 'checked_in' ? 'var(--brand)' : 'var(--muted-2)' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
