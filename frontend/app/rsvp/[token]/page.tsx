'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { api, PublicRsvpDetails, RsvpResponseStatus } from '@/lib/api'
import AsoEbiYardSelector from '@/components/rsvp/AsoEbiYardSelector'

const RESPONSE_COPY: Record<RsvpResponseStatus, { title: string; body: string }> = {
  awaiting: {
    title: 'Please confirm your availability',
    body: 'Kindly confirm your availability below.',
  },
  confirmed: {
    title: 'Availability confirmed',
    body: 'Thank you for confirming. Your guest pass will be sent to you through WhatsApp.',
  },
  declined: {
    title: 'Response received',
    body: 'Thank you for letting us know that you will not be able to attend.',
  },
}

function ordinalDate(value: string) {
  const date = new Date(value)
  const day = Number(date.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric' }))
  const suffix = day % 100 >= 11 && day % 100 <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] || 'th'
  const monthAndYear = date.toLocaleDateString('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'long',
    year: 'numeric',
  })
  return `${day}${suffix} ${monthAndYear}`
}

export default function PublicRsvpPage() {
  const params = useParams<{ token?: string; code?: string; guestCode?: string }>()
  const routeValue = params.token ?? params.code ?? params.guestCode ?? ''
  const token = params.guestCode
    ? routeValue.slice(routeValue.lastIndexOf('-') + 1)
    : routeValue
  const [details, setDetails] = useState<PublicRsvpDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<'yes' | 'no' | null>(null)
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null)
  const [asoEbiRequested, setAsoEbiRequested] = useState(false)
  const [asoEbiQuantity, setAsoEbiQuantity] = useState(2)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getPublicRsvp(token)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : 'This RSVP invitation could not be loaded.'))
      .finally(() => setLoading(false))
  }, [token])

  async function respond(response: 'yes' | 'no') {
    if (response === 'yes' && asoEbiRequested && asoEbiQuantity < 1) {
      setError('Choose how many yards of Aso Ebi you need.')
      return
    }
    setSubmitting(response)
    setError('')
    try {
      const result = await api.submitPublicRsvp(token, response, asoEbiRequested, asoEbiQuantity)
      setDetails((current) => current ? {
        ...current,
        response_status: result.response_status,
        can_respond: false,
        closed_reason: 'already_responded',
        responded_at: new Date().toISOString(),
        aso_ebi_requested: response === 'yes' && asoEbiRequested,
        aso_ebi_quantity: response === 'yes' && asoEbiRequested ? asoEbiQuantity : 0,
      } : current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your response could not be saved. Please try again.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center sm:px-4 sm:py-8 lg:items-center lg:px-6 lg:py-12" style={{ background: 'var(--bg)' }}>
      <div className="min-w-0 w-full overflow-hidden rounded-none sm:max-w-2xl sm:rounded-[18px] lg:max-w-3xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}>
        <header className="px-4 py-4 sm:px-7 sm:py-5 lg:px-10" style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold" style={{ background: 'var(--brand)', color: '#0d1016' }}>T</div>
            <div><p className="text-sm font-semibold">TWS E-GuestPass</p><p className="text-xs" style={{ color: 'var(--muted)' }}>RSVP</p></div>
          </div>
        </header>

        {loading ? (
          <div className="px-6 py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading your invitation…</div>
        ) : error && !details ? (
          <div className="px-6 py-16 text-center sm:px-8"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>!</div><h1 className="mt-4 text-lg font-bold">Invitation unavailable</h1><p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{error}</p></div>
        ) : details ? (
          <div className="px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-9">
            {details.invitation_image ? (
              <img src={details.invitation_image} alt={`RSVP banner for ${details.guest_name}`} className="mb-6 block h-auto w-full rounded-xl sm:mb-8" style={{ border: '1px solid var(--line)' }} />
            ) : (
              <div className="mb-7 rounded-xl px-5 py-8 text-center" style={{ background: 'var(--brand-soft)', border: '1px solid rgba(184,150,62,0.3)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--brand)' }}>RSVP</p>
                <h1 className="mt-3 text-2xl font-bold">{details.event_name}</h1>
              </div>
            )}

            <section aria-labelledby="event-details-heading">
              <h1 id="event-details-heading" className="text-lg font-bold">Event Details</h1>
              <div className="mt-4 grid divide-y divide-[var(--line)] overflow-hidden rounded-[14px] md:grid-cols-3 md:divide-x md:divide-y-0" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <DetailRow icon="📅" label="Date" value={new Date(details.event_date).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                <DetailRow icon="🕑" label="Time (WAT)" value={new Date(details.event_date).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: 'numeric', minute: '2-digit', hour12: true })} />
                {details.venue && <DetailRow icon="📍" label="Venue" value={details.venue} />}
              </div>
            </section>

            <section className="mt-6 text-sm leading-7" style={{ color: 'var(--muted)' }}>
              <p className="whitespace-pre-line" style={{ color: 'var(--ink)' }}>{details.rsvp_message || 'Welcome. You are warmly invited to this special occasion. Please review the event details below and kindly confirm your availability.'}</p>
              {details.color_of_day && (
                <div className="mt-4 flex items-center gap-4 rounded-[14px] px-4 py-4 sm:px-5" style={{ background: 'var(--brand-soft)', border: '1px solid rgba(184,150,62,0.45)', boxShadow: 'inset 3px 0 0 var(--brand)' }}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: 'rgba(184,150,62,0.18)', border: '1px solid rgba(184,150,62,0.35)' }} aria-hidden="true">🎨</div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>Colour of the day</p>
                    <p className="mt-1 break-words text-lg font-bold leading-6" style={{ color: 'var(--ink)' }}>{details.color_of_day}</p>
                  </div>
                </div>
              )}
            </section>

            {details.can_respond ? (
              <section className="mt-7 border-t border-[var(--line)] pt-6 sm:mt-9 sm:pt-8">
                <p className="mx-auto max-w-xl text-center text-base font-semibold leading-6 sm:text-lg">Hi {details.guest_name}, are you attending?</p>
                <div className="mx-auto mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
                  <button type="button" disabled={!!submitting} onClick={() => setAnswer('yes')} className="min-h-12 rounded-lg px-4 py-3 text-sm font-semibold transition disabled:opacity-50" style={{ background: answer === 'yes' ? 'var(--brand)' : 'var(--bg)', border: '1px solid var(--brand)', color: answer === 'yes' ? '#fff' : 'var(--ink)' }}>Yes, I’m Coming</button>
                  <button type="button" disabled={!!submitting} onClick={() => { setAnswer('no'); setAsoEbiRequested(false) }} className="min-h-12 rounded-lg px-4 py-3 text-sm font-semibold transition disabled:opacity-50" style={{ background: answer === 'no' ? 'var(--panel-2)' : 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}>No, I Can’t Make It</button>
                </div>

                {details.response_deadline && (
                  <div className="mx-auto mt-4 flex max-w-xl items-start gap-4 rounded-[14px] px-4 py-4 sm:px-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }} aria-hidden="true">⏳</div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>RSVP deadline</p>
                      <p className="mt-1 text-lg font-bold leading-6" style={{ color: 'var(--ink)' }}>{ordinalDate(details.response_deadline)}</p>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>Kindly confirm your availability before the deadline.</p>
                    </div>
                  </div>
                )}

                {answer === 'yes' && details.collect_aso_ebi && (
                  <div className="mx-auto mt-5 max-w-2xl rounded-[12px] p-4 sm:p-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={asoEbiRequested} onChange={(event) => setAsoEbiRequested(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
                      <span><span className="block text-sm font-semibold">I would like to request Aso Ebi</span><span className="mt-1 block text-xs leading-5" style={{ color: 'var(--muted)' }}>Select this to include an Aso Ebi request with your RSVP.</span></span>
                    </label>
                    {asoEbiRequested && <div className="mt-4"><AsoEbiYardSelector value={asoEbiQuantity} onChange={setAsoEbiQuantity} /></div>}
                  </div>
                )}

                {answer && <button type="button" disabled={!!submitting} onClick={() => respond(answer)} className="mx-auto mt-5 block min-h-12 w-full max-w-xl rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--brand)' }}>{submitting ? 'Saving your response…' : 'Submit RSVP'}</button>}
              </section>
            ) : (
              <ResponseCard details={details} />
            )}

            {error && <p className="mt-4 rounded-lg px-3 py-2 text-center text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
          </div>
        ) : null}
      </div>
    </main>
  )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-3 px-4 py-4 sm:gap-4 md:px-4 md:py-5"><span className="shrink-0 text-xl" aria-hidden="true">{icon}</span><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</p><p className="mt-1 break-words text-sm font-semibold leading-6">{value}</p></div></div>
}

function ResponseCard({ details }: { details: PublicRsvpDetails }) {
  const title = details.closed_reason === 'deadline_passed'
    ? 'RSVP has closed'
    : details.closed_reason === 'workflow_inactive'
      ? 'Responses are currently closed'
      : RESPONSE_COPY[details.response_status].title
  const body = details.closed_reason === 'deadline_passed'
    ? 'The response deadline for this event has passed.'
    : details.closed_reason === 'workflow_inactive'
      ? 'Please contact the event organiser if you need assistance.'
      : RESPONSE_COPY[details.response_status].body

  return <div className="mt-8 rounded-[12px] px-4 py-5 text-center" style={{ background: details.response_status === 'confirmed' ? 'var(--success-bg)' : 'var(--bg)', border: '1px solid var(--line)' }}><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ background: details.response_status === 'confirmed' ? 'var(--success)' : 'var(--panel-2)', color: details.response_status === 'confirmed' ? '#0d1016' : 'var(--muted)' }}>{details.response_status === 'confirmed' ? '✓' : '—'}</div><h2 className="mt-3 text-base font-bold">{title}</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{body}</p>{details.response_status === 'confirmed' && details.aso_ebi_requested && <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--brand)' }}>Aso Ebi requested: {details.aso_ebi_quantity} yards</p>}</div>
}
