'use client'

import { Event } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] placeholder:text-[var(--muted-2)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

interface Props {
  event?: Event
  localDateValue?: string
  subtitle?: string
}

export function EventDetailsForm({ event, localDateValue, subtitle }: Props) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Event Details</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>}
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Event Name *</label>
          <input name="name" type="text" required defaultValue={event?.name} placeholder="e.g. Annual Gala 2026" className={field} />
        </div>
        <div>
          <label className={label}>Date & Time *</label>
          <input name="date" type="datetime-local" required defaultValue={localDateValue} className={field} />
        </div>
        <div>
          <label className={label}>Venue</label>
          <input name="venue" type="text" defaultValue={event?.venue} placeholder="optional" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Description</label>
          <textarea name="description" rows={2} defaultValue={event?.description} placeholder="optional" className={`${field} resize-none`} />
        </div>
      </div>
    </div>
  )
}
