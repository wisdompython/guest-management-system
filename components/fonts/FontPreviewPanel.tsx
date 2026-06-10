'use client'

import { Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

interface Props {
  activeEvent: Event | null
}

export function FontPreviewPanel({ activeEvent }: Props) {
  const ev = activeEvent
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between px-5 py-2.5"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {ev ? `${ev.name} · ${new Date(ev.date).toLocaleDateString('en-GB')}` : 'Select an event'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {ev?.ticket_types?.length ?? 0} ticket type{ev?.ticket_types?.length !== 1 ? 's' : ''} · {ev?.guest_count ?? 0} guests
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-8">
        {ev?.design_template ? (
          <div className="w-full max-w-[640px]">
            <img
              src={ev.design_template.startsWith('http') ? ev.design_template : `${BASE_URL.replace('/api', '')}${ev.design_template}`}
              alt="Pass template"
              className="w-full"
              style={{ border: '1px solid var(--line)' }}
            />
            <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
              Template preview · actual passes will have guest data merged in
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center"
              style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
                style={{ color: 'var(--muted)' }}>
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No template uploaded</p>
            <p className="text-xs max-w-[260px]" style={{ color: 'var(--muted)' }}>
              Upload a pass template image for this event via the event settings, then configure the QR and name zones.
            </p>
            {ev && (
              <a href={`/admin/events/${ev.id}/edit`}
                className="mt-2 px-4 py-2 text-xs font-semibold text-white"
                style={{ background: 'var(--brand)' }}>
                Edit event settings
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
