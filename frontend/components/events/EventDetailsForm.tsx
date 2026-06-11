'use client'

import { useState, useEffect } from 'react'
import { Event } from '@/lib/api'

const field = 'w-full border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]'
const fieldStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] mb-1.5'
const labelStyle = { color: 'var(--muted)' }

function toLocalDateTimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function nowMin() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return toLocalDateTimeValue(now.toISOString())
}

interface Props {
  event?: Event
  localDateValue?: string
  subtitle?: string
  onDateChange?: (val: string) => void
}

export function EventDetailsForm({ event, localDateValue, subtitle, onDateChange }: Props) {
  const [minVal] = useState(nowMin)
  const [dateVal, setDateVal] = useState(
    localDateValue ?? (event?.date ? toLocalDateTimeValue(event.date) : '')
  )
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    if (localDateValue) setDateVal(localDateValue)
  }, [localDateValue])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setDateVal(val)
    if (val && val < minVal) {
      setDateError('Event date cannot be in the past.')
    } else {
      setDateError('')
    }
    onDateChange?.(val)
  }

  return (
    <div className="overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Event Details</h2>
        {subtitle && <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      <div className="grid gap-5 p-6 sm:grid-cols-2">

        <div className="sm:col-span-2">
          <label className={label} style={labelStyle}>Event Name *</label>
          <input name="name" type="text" required defaultValue={event?.name}
            placeholder="e.g. Annual Gala 2026" className={field} style={fieldStyle} />
        </div>

        <div>
          <label className={label} style={labelStyle}>Date & Time *</label>
          <input
            name="date"
            type="datetime-local"
            required
            value={dateVal}
            min={minVal}
            onChange={handleDateChange}
            className={field}
            style={{
              ...fieldStyle,
              colorScheme: 'dark',
              ...(dateError ? { border: '1px solid var(--danger)' } : {}),
            }}
          />
          {dateError && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--danger)' }}>{dateError}</p>
          )}
          <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>
            Must be a future date and time.
          </p>
        </div>

        <div>
          <label className={label} style={labelStyle}>Venue</label>
          <input name="venue" type="text" defaultValue={event?.venue}
            placeholder="optional" className={field} style={fieldStyle} />
        </div>

        <div className="sm:col-span-2">
          <label className={label} style={labelStyle}>Description</label>
          <textarea name="description" rows={3} defaultValue={event?.description}
            placeholder="optional" className={`${field} resize-none`} style={fieldStyle} />
        </div>

      </div>
    </div>
  )
}
