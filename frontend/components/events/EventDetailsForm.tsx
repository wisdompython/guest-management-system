'use client'

import { useState, useEffect } from 'react'
import { Event } from '@/lib/api'
import { FormSectionHeader } from '@/components/ui/FormSectionHeader'

const field = 'form-control'
const label = 'form-label'

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
  step?: number
  onDateChange?: (val: string) => void
  onValidationChange?: (valid: boolean) => void
}

export function EventDetailsForm({ event, localDateValue, subtitle, step, onDateChange, onValidationChange }: Props) {
  const [minVal] = useState(nowMin)
  const [dateVal, setDateVal] = useState(
    localDateValue ?? (event?.date ? toLocalDateTimeValue(event.date) : '')
  )
  const [dateError, setDateError] = useState('')

  function validate(val: string) {
    const isPast = Boolean(val && val < minVal)
    setDateError(isPast ? 'Event date cannot be in the past.' : '')
    onValidationChange?.(!isPast)
    return !isPast
  }

  useEffect(() => {
    const initial = localDateValue ?? (event?.date ? toLocalDateTimeValue(event.date) : '')
    if (initial) {
      setDateVal(initial)
      const isPast = Boolean(initial && initial < minVal)
      setDateError(isPast ? 'Event date cannot be in the past.' : '')
      onValidationChange?.(!isPast)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDateValue])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setDateVal(val)
    validate(val)
    onDateChange?.(val)
  }

  return (
    <div className="form-card">
      <FormSectionHeader step={step} tourId="event-details-section" title="Event details" description={subtitle || 'Start with the essentials guests and staff will recognise.'} />
      <div className="grid gap-5 p-6 sm:grid-cols-2">

        <div className="sm:col-span-2">
          <label className={label}>Event name <span className="text-[var(--brand)]">*</span></label>
          <input data-tour="event-name-field" name="name" type="text" required defaultValue={event?.name}
            placeholder="e.g. Annual Gala 2026" className={field} />
          <p className="form-hint">Use the name guests will see on invitations and passes.</p>
        </div>

        <div>
          <label className={label}>Date and time (WAT) <span className="text-[var(--brand)]">*</span></label>
          <input
            data-tour="event-date-field"
            name="date"
            type="datetime-local"
            required
            value={dateVal}
            min={minVal}
            onChange={handleDateChange}
            className={field}
            style={dateError ? { borderColor: 'var(--danger)' } : undefined}
          />
          {dateError && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--danger)' }}>{dateError}</p>
          )}
          {!dateError && <p className="form-hint">Times are saved in West Africa Time (UTC+1) for scheduling and reminders.</p>}
        </div>

        <div>
          <label className={label}>Venue <span className="font-normal text-[var(--muted)]">(optional)</span></label>
          <input name="venue" type="text" defaultValue={event?.venue}
            placeholder="e.g. Eko Hotel, Lagos" className={field} />
          <p className="form-hint">You can leave this blank and add it when confirmed.</p>
        </div>

        <div className="sm:col-span-2">
          <label className={label}>Description <span className="font-normal text-[var(--muted)]">(optional)</span></label>
          <textarea name="description" rows={3} defaultValue={event?.description}
            placeholder="Add a short internal note about this event" className={field} />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
          <p className="text-sm font-semibold text-[var(--ink)]">RSVP page content</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Shown to guests beneath the event details. Leave the welcome message blank to use the standard celebration copy.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Welcome message <span className="font-normal text-[var(--muted)]">(optional)</span></label>
              <textarea name="rsvp_message" rows={3} defaultValue={event?.rsvp_message}
                placeholder="Join us as we celebrate Lady Otunba Osibogun on the joyous occasion of her 70th birthday." className={field} />
            </div>
            <div>
              <label className={label}>Colour of the day <span className="font-normal text-[var(--muted)]">(optional)</span></label>
              <input name="color_of_day" type="text" defaultValue={event?.color_of_day}
                placeholder="e.g. Burgundy and gold" className={field} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
