'use client'

import { useState } from 'react'
import { EventLocation } from '@/lib/api'
import { toWatDateTimeInput, watDateTimeInputToIso } from '@/lib/datetime'

const field = 'form-control'
const label = 'form-label'

/** Must match MAX_TEMPLATE_LOCATION_SLOTS in backend/core/guests/models.py. */
export const MAX_LOCATIONS = 5

/** A location row while it is being edited — times are WAT wall-clock strings. */
export type LocationDraft = {
  title: string
  venue: string
  startsAt: string
  notes: string
}

export function toDrafts(locations?: EventLocation[]): LocationDraft[] {
  return (locations ?? []).map((location) => ({
    title: location.title,
    venue: location.venue,
    startsAt: location.starts_at ? toWatDateTimeInput(location.starts_at) : '',
    notes: location.notes ?? '',
  }))
}

/** Serialise drafts for the API. Rows with no content at all are dropped. */
export function draftsToPayload(drafts: LocationDraft[]) {
  return drafts
    .filter((draft) => draft.title.trim() || draft.venue.trim() || draft.startsAt)
    .map((draft, index) => ({
      title: draft.title.trim(),
      venue: draft.venue.trim(),
      starts_at: watDateTimeInputToIso(draft.startsAt),
      notes: draft.notes.trim(),
      order: index,
    }))
}

/** Returns a message when the drafts cannot be saved, or '' when they are fine. */
export function validateDrafts(drafts: LocationDraft[]): string {
  const filled = drafts.filter(
    (draft) => draft.title.trim() || draft.venue.trim() || draft.startsAt,
  )
  for (const draft of filled) {
    if (!draft.title.trim()) return 'Give every part of the event a name, e.g. "Church Ceremony".'
    if (!draft.venue.trim()) return `Add the address for "${draft.title.trim()}".`
    if (!draft.startsAt) return `Add the date and time for "${draft.title.trim()}".`
  }
  return ''
}

const EMPTY: LocationDraft = { title: '', venue: '', startsAt: '', notes: '' }

interface Props {
  value: LocationDraft[]
  onChange: (next: LocationDraft[]) => void
}

export function EventLocationsSection({ value, onChange }: Props) {
  const [error, setError] = useState('')

  function update(index: number, patch: Partial<LocationDraft>) {
    const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
    setError(validateDrafts(next))
  }

  function add() {
    if (value.length >= MAX_LOCATIONS) return
    onChange([...value, { ...EMPTY }])
  }

  function remove(index: number) {
    const next = value.filter((_, i) => i !== index)
    onChange(next)
    setError(validateDrafts(next))
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="sm:col-span-2">
      <div className="mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Schedule <span className="font-normal text-[var(--muted)]">(optional)</span>
        </p>
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
          For events that happen in more than one place — a church ceremony and a reception,
          for example. Each part can be on its own day.
        </p>
      </div>

      {value.length === 0 && (
        <p className="mb-3 text-xs leading-5" style={{ color: 'var(--muted)' }}>
          Not needed for a single-venue event — the date and venue above are used on their own.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {value.map((row, index) => (
          <div
            key={index}
            className="rounded-xl p-4"
            style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Part {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move earlier"
                  className="rounded-md px-2 py-1 text-xs disabled:opacity-30"
                  style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move later"
                  className="rounded-md px-2 py-1 text-xs disabled:opacity-30"
                  style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-md px-2 py-1 text-xs font-semibold"
                  style={{ border: '1px solid rgba(239,68,68,0.35)', color: 'var(--danger)' }}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Name</label>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder="e.g. Church Ceremony"
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Date &amp; time</label>
                <input
                  type="datetime-local"
                  value={row.startsAt}
                  onChange={(e) => update(index, { startsAt: e.target.value })}
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Address</label>
                <input
                  type="text"
                  value={row.venue}
                  onChange={(e) => update(index, { venue: e.target.value })}
                  placeholder="e.g. St. Saviour's Church, Ikoyi"
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>
                  Note <span className="font-normal text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={row.notes}
                  onChange={(e) => update(index, { notes: e.target.value })}
                  placeholder="e.g. Strictly white attire"
                  className={field}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={value.length >= MAX_LOCATIONS}
          className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          + Add a part
        </button>
        {value.length >= MAX_LOCATIONS && (
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Up to {MAX_LOCATIONS} parts can be added.
          </span>
        )}
      </div>

      {value.length > 0 && (
        <p className="form-hint mt-2">
          Guests see these on the RSVP page, and they can be used in WhatsApp messages.
          The event date above follows the earliest part automatically.
        </p>
      )}
    </div>
  )
}
