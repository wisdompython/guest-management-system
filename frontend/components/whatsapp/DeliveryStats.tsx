'use client'

import { Event } from '@/lib/api'

interface Props {
  total: number
  sent: number
  notSent: number
  loading: boolean
  events: Event[]
  selectedEvent: number | ''
  bulkSending: boolean
  onEventChange: (val: number | '') => void
  onBulkSend: (resend: boolean) => void
}

export function DeliveryStats({
  total, sent, notSent, loading, events, selectedEvent, bulkSending, onEventChange, onBulkSend,
}: Props) {
  return (
    <div className="w-[220px] flex-shrink-0 overflow-y-auto"
      style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>DELIVERY</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'TOTAL',   value: loading ? '--' : String(total) },
            { label: 'SENT',    value: loading ? '--' : String(sent) },
            { label: 'PENDING', value: loading ? '--' : String(notSent), warn: notSent > 0 },
          ].map(({ label, value, warn }) => (
            <div key={label}>
              <p className="text-[9px]" style={{ color: 'var(--muted-2)' }}>{label}</p>
              <p className="text-[22px] font-bold tabular-nums"
                style={{ color: warn ? 'var(--warn)' : 'var(--ink)' }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
          <div className="h-1 transition-all rounded-full"
            style={{ width: total > 0 ? `${Math.round((sent / total) * 100)}%` : '0%', background: 'var(--brand)' }} />
        </div>
      </div>

      <div className="p-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>BULK SEND</p>
        <select
          value={selectedEvent}
          onChange={(e) => onEventChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="mb-2 w-full rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          style={{ background: '#1a2030', color: 'var(--ink)', border: '1px solid var(--line)' }}>
          <option value="">Select event…</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
        <button onClick={() => onBulkSend(false)} disabled={bulkSending || !selectedEvent}
          className="mb-2 w-full rounded-full py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--brand)' }}>
          {bulkSending ? 'Sending…' : 'Send to unsent'}
        </button>
        <button onClick={() => onBulkSend(true)} disabled={bulkSending || !selectedEvent}
          className="w-full rounded-full py-2 text-[12px] font-semibold transition hover:opacity-80 disabled:opacity-40"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
          Resend all
        </button>
      </div>

      <div className="p-4">
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>QUICK ACTIONS</p>
        <div className="space-y-2">
          <a href="/admin/guests/bulk-upload"
            className="block w-full rounded-lg py-2 text-center text-[12px] font-semibold transition hover:opacity-80"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
            Bulk upload guests
          </a>
          <a href="/admin/fonts"
            className="block w-full rounded-lg py-2 text-center text-[12px] font-semibold transition hover:opacity-80"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel-2)' }}>
            Pass designer
          </a>
        </div>
      </div>
    </div>
  )
}
