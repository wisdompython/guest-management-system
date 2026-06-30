'use client'

import { Guest } from '@/lib/api'

const TICKET_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  vvip:    { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  vip:     { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  general: { bg: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: 'rgba(255,255,255,0.1)' },
}

export function GuestFoundScreen({
  guest, checkingIn, onConfirm, onCancel,
}: {
  guest: Guest
  checkingIn: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="h-full overflow-auto flex flex-col px-4 py-8 max-w-lg mx-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onCancel}
          className="w-10 h-10 rounded-sm border flex items-center justify-center transition hover:bg-[var(--bg)]"
          style={{ borderColor: 'var(--line)', color: 'var(--muted)', background: 'var(--panel)' }}>
          ←
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--brand)' }}>Guest Found</p>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Confirm to check in</p>
        </div>
      </div>
      <div className="bg-[rgba(255,255,255,0.04)] overflow-hidden mb-6" style={{ border: '1px solid var(--line)', borderRadius: '2px' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--muted-2)' }}>Guest</p>
              <h2 className="font-display text-2xl font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{guest.full_name}</h2>
              {guest.event_name && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{guest.event_name}</p>}
            </div>
            {(() => { const tc = TICKET_COLORS[guest.ticket_type] ?? TICKET_COLORS.general; return (
              <span className="text-xs font-bold px-3 py-1.5 flex-shrink-0 mt-1"
                style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                {guest.ticket_type.toUpperCase()}
              </span>
            )})()}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: 'var(--line)' }}>
          {[
            { label: 'Phone', value: guest.phone_number || '—' },
            { label: 'Registered', value: new Date(guest.registered_at).toLocaleDateString() },
            { label: 'Table', value: guest.table_number || '—' },
            { label: 'Seat', value: guest.seat_number || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-4" style={{ borderColor: 'var(--line)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-0.5" style={{ color: 'var(--muted-2)' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onConfirm} disabled={checkingIn}
        className="w-full font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase transition-all active:scale-95 disabled:opacity-60 mb-3"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        {checkingIn ? 'Checking in…' : 'Confirm Check-In'}
      </button>
      <button onClick={onCancel}
        className="w-full font-semibold rounded-sm py-4 text-sm transition-colors"
        style={{ border: '1px solid var(--line)', color: 'var(--muted)', background: 'var(--panel)' }}>
        Cancel
      </button>
    </div>
  )
}
