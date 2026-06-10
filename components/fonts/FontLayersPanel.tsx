'use client'

import { Event } from '@/lib/api'

interface Props {
  events: Event[]
  activeEvent: Event | null
  onEventChange: (ev: Event | null) => void
}

export function FontLayersPanel({ events, activeEvent, onEventChange }: Props) {
  const ev = activeEvent
  return (
    <div className="w-[200px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
          PASS DESIGNER
        </p>
        <p className="mt-0.5 text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {ev ? ev.name : 'No event selected'}
        </p>
      </div>

      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>EVENT</p>
        {events.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--muted)' }}>No events yet.</p>
        ) : (
          <select
            value={ev?.id ?? ''}
            onChange={(e) => onEventChange(events.find((ev) => ev.id === Number(e.target.value)) ?? null)}
            className="w-full bg-transparent text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)] px-2 py-1.5"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>TEMPLATE</p>
        {ev?.design_template ? (
          <p className="text-[12px] break-all" style={{ color: 'var(--brand)' }}>{ev.design_template}</p>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--muted)' }}>No template set for this event.</p>
        )}

        {ev && (
          <div className="mt-4 space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>QR ZONE</p>
            {[
              ['X', ev.qr_zone_x], ['Y', ev.qr_zone_y], ['W', ev.qr_zone_w], ['H', ev.qr_zone_h],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between text-[12px]">
                <span style={{ color: 'var(--muted)' }}>{k}</span>
                <span className="font-mono" style={{ color: v != null ? 'var(--ink)' : 'var(--muted-2)' }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        {ev && (
          <div className="mt-4 space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.20em]" style={{ color: 'var(--muted-2)' }}>NAME ZONE</p>
            {[
              ['X', ev.name_zone_x], ['Y', ev.name_zone_y], ['W', ev.name_zone_w], ['H', ev.name_zone_h],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between text-[12px]">
                <span style={{ color: 'var(--muted)' }}>{k}</span>
                <span className="font-mono" style={{ color: v != null ? 'var(--ink)' : 'var(--muted-2)' }}>{v ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
