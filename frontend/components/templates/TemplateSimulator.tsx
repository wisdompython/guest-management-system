'use client'

import { useEffect, useState } from 'react'
import { api, Event, Guest, TemplateSimulation } from '@/lib/api'

/**
 * Runs a template against a real event and guest through the backend, using the
 * same resolver a real send uses. Unlike the static preview, this shows the
 * actual values an event will produce and reports the errors that would block
 * delivery — most usefully a template referencing a location the event lacks.
 */
export function TemplateSimulator({ bodyText, bodyParams }: {
  bodyText: string
  bodyParams: string[]
}) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [eventId, setEventId] = useState<number | null>(null)
  const [guestId, setGuestId] = useState<string>('')
  const [result, setResult] = useState<TemplateSimulation | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open || events.length) return
    api.getEvents()
      .then((list) => {
        setEvents(list)
        if (list.length && eventId === null) setEventId(list[0].id)
      })
      .catch(() => setError('Could not load your events.'))
  }, [open, events.length, eventId])

  useEffect(() => {
    if (!eventId) { setGuests([]); return }
    setGuestId('')
    api.getGuests({ event: String(eventId), page_size: '50' })
      .then((page) => setGuests(page.results ?? []))
      .catch(() => setGuests([]))
  }, [eventId])

  // A changed template invalidates whatever was last rendered.
  useEffect(() => { setResult(null) }, [bodyText, bodyParams])

  async function run() {
    if (!eventId) return
    setRunning(true)
    setError('')
    try {
      const simulation = await api.simulateTemplate({
        event: eventId,
        guest: guestId || undefined,
        body_text: bodyText,
        body_params: bodyParams,
      })
      setResult(simulation)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'The test run could not be completed.')
    } finally {
      setRunning(false)
    }
  }

  if (!bodyText.trim()) return null

  return (
    <div className="mt-4 rounded-xl p-4" style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Test against a real event
          </span>
          <span className="mt-0.5 block text-xs leading-5" style={{ color: 'var(--muted)' }}>
            See exactly what one of your guests would receive, and catch problems before sending.
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--brand)' }}>
          {open ? 'Hide' : 'Open'}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">Event</label>
              <select
                className="form-control"
                value={eventId ?? ''}
                onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)}
              >
                {events.length === 0 && <option value="">No events yet</option>}
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Guest <span className="font-normal text-[var(--muted)]">(optional)</span>
              </label>
              <select
                className="form-control"
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
              >
                <option value="">First guest on the event</option>
                {guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>{guest.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={running || !eventId}
            className="mt-3 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            {running ? 'Running…' : 'Run test'}
          </button>

          {error && (
            <p className="mt-3 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
          )}

          {result && <SimulationResult result={result} />}
        </div>
      )}
    </div>
  )
}

function SimulationResult({ result }: { result: TemplateSimulation }) {
  return (
    <div className="mt-4">
      <div
        className="mb-3 rounded-lg px-3 py-2 text-xs leading-5"
        style={
          result.would_send
            ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--ink)' }
            : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--ink)' }
        }
      >
        {result.would_send ? (
          <>✓ This message would be delivered to {result.guest.full_name}.</>
        ) : (
          <>
            <p className="font-semibold">This message would not be sent.</p>
            <ul className="mt-1 list-disc pl-4">
              {result.problems.map((problem, index) => <li key={index}>{problem}</li>)}
            </ul>
          </>
        )}
      </div>

      <p className="mb-2 text-[11px]" style={{ color: 'var(--muted)' }}>
        Using <strong>{result.guest.full_name}</strong> on <strong>{result.event.name}</strong>
        {result.event.location_count > 0 && <> · {result.event.location_count} location{result.event.location_count === 1 ? '' : 's'}</>}
      </p>

      <div
        className="inline-block max-w-sm rounded-[16px] rounded-tl-[4px] px-4 py-3 text-sm leading-relaxed"
        style={{ background: 'var(--chip)', border: '1px solid var(--line)', color: 'var(--ink)' }}
      >
        <p style={{ whiteSpace: 'pre-wrap' }}>{result.rendered}</p>
      </div>

      {result.resolved.length > 0 && (
        <table className="mt-3 w-full text-[11px]">
          <tbody>
            {result.resolved.map((row, index) => {
              const isMissing = result.missing_params.includes(row.key)
              return (
                <tr key={`${row.key}-${index}`} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-1.5 pr-3 align-top font-mono" style={{ color: 'var(--muted)' }}>
                    {'{{'}{index + 1}{'}}'} {row.key}
                  </td>
                  <td className="py-1.5 align-top" style={{ color: isMissing ? 'var(--danger)' : 'var(--ink)' }}>
                    {row.value || 'nothing — this is what blocks the send'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
