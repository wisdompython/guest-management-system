'use client'

import { Guest } from '@/lib/api'

interface Props {
  guests: Guest[]
  loading: boolean
  activeId: string | null
  sent: number
  notSent: number
  total: number
  onSelect: (id: string) => void
}

export function GuestList({ guests, loading, activeId, sent, notSent, total, onSelect }: Props) {
  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>WhatsApp</h2>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>
          {sent} sent · {notSent} pending · {total} total
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : guests.length === 0 ? (
          <div className="py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>No guests with phone numbers.</div>
        ) : guests.map((g) => {
          const initials = g.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
          const isActive = activeId === g.id
          return (
            <button key={g.id} onClick={() => onSelect(g.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
              style={{ borderBottom: '1px solid var(--line)', background: isActive ? 'var(--brand-soft)' : 'transparent' }}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{g.full_name}</p>
                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full"
                    style={{ background: g.whatsapp_sent ? 'var(--brand)' : 'var(--muted-2)' }} />
                </div>
                <p className="truncate text-[12px]" style={{ color: 'var(--muted)' }}>{g.phone_number}</p>
                <p className="text-[11px]" style={{ color: 'var(--muted-2)' }}>
                  {g.whatsapp_sent ? 'Pass sent' : 'Not sent'}
                  {g.whatsapp_sent_at ? ' · ' + new Date(g.whatsapp_sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
