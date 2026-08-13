'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { api, PublicRsvpDetails, RsvpResponseStatus } from '@/lib/api'
import AsoEbiYardSelector from '@/components/rsvp/AsoEbiYardSelector'

const RESPONSE_COPY: Record<RsvpResponseStatus, { title: string; body: string }> = {
  awaiting: {
    title: 'Please Confirm Your Attendance',
    body: 'Kindly confirm your attendance below.',
  },
  confirmed: {
    title: 'Attendance confirmed',
    body: 'Thank you for confirming. Your guest pass will be sent to you through WhatsApp.',
  },
  declined: {
    title: 'Response received',
    body: 'Thank you for letting us know that you will not be able to attend.',
  },
}

export default function PublicRsvpPage() {
  const token = useParams<{ token: string }>().token
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

  async function respond(answer: 'yes' | 'no') {
    if (answer === 'yes' && asoEbiRequested && asoEbiQuantity < 1) {
      setError('Choose how many yards of Aso Ebi you need.')
      return
    }
    setSubmitting(answer); setError('')
    try {
      const result = await api.submitPublicRsvp(token, answer, asoEbiRequested, asoEbiQuantity)
      setDetails((current) => current ? {
        ...current,
        response_status: result.response_status,
        can_respond: false,
        closed_reason: 'already_responded',
        responded_at: new Date().toISOString(),
        aso_ebi_requested: answer === 'yes' && asoEbiRequested,
        aso_ebi_quantity: answer === 'yes' && asoEbiRequested ? asoEbiQuantity : 0,
      } : current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your response could not be saved. Please try again.')
    } finally { setSubmitting(null) }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg overflow-hidden rounded-[18px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}>
        <div className="px-6 py-5 sm:px-8" style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold" style={{ background: 'var(--brand)', color: '#0d1016' }}>T</div>
            <div><p className="text-sm font-semibold">TWS E-GuestPass</p><p className="text-xs" style={{ color: 'var(--muted)' }}>Event RSVP</p></div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading your invitation…</div>
        ) : error && !details ? (
          <div className="px-6 py-16 text-center sm:px-8"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>!</div><h1 className="mt-4 text-lg font-bold">Invitation unavailable</h1><p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{error}</p></div>
        ) : details ? (
          <div className="px-6 py-7 sm:px-8 sm:py-8">
            {details.invitation_image && (
              <img src={details.invitation_image} alt={`RSVP invitation for ${details.guest_name}`}
                className="mb-6 w-full rounded-xl object-cover" style={{ border: '1px solid var(--line)' }} />
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--brand)' }}>You’re invited</p>
            <h1 className="mt-2 text-2xl font-bold">{details.event_name}</h1>
            <h2 className="mt-4 text-lg font-bold">Please Confirm Your Attendance</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Hello {details.guest_name}, kindly confirm your attendance below.</p>

            <div className="mt-6 grid gap-3 rounded-[12px] p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div className="flex gap-3"><span aria-hidden="true" style={{ color: 'var(--brand)' }}>◷</span><div><p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Date and time</p><p className="mt-1 text-sm font-semibold">{new Date(details.event_date).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</p></div></div>
              {details.response_deadline && <div className="flex gap-3"><span aria-hidden="true" style={{ color: 'var(--brand)' }}>✓</span><div><p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Respond by</p><p className="mt-1 text-sm font-semibold">{new Date(details.response_deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p></div></div>}
            </div>

            {details.can_respond ? (
              <div className="mt-7">
                <p className="text-center text-sm font-semibold">Will you be available to attend?</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" disabled={!!submitting} onClick={() => setAnswer('yes')} className="rounded-lg px-4 py-3 text-sm font-semibold transition disabled:opacity-50" style={{ background: answer === 'yes' ? 'var(--brand)' : 'var(--bg)', border: '1px solid var(--brand)', color: answer === 'yes' ? '#fff' : 'var(--ink)' }}>Yes, I’ll attend</button>
                  <button type="button" disabled={!!submitting} onClick={() => { setAnswer('no'); setAsoEbiRequested(false) }} className="rounded-lg px-4 py-3 text-sm font-semibold transition disabled:opacity-50" style={{ background: answer === 'no' ? 'var(--panel-2)' : 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}>No, I can’t attend</button>
                </div>

                {answer === 'yes' && details.collect_aso_ebi && (
                  <div className="mt-5 rounded-[12px] p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={asoEbiRequested} onChange={(e) => setAsoEbiRequested(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
                      <span><span className="block text-sm font-semibold">I would like to request Aso Ebi</span><span className="mt-1 block text-xs leading-5" style={{ color: 'var(--muted)' }}>Select this to include an Aso Ebi request with your RSVP.</span></span>
                    </label>
                    {asoEbiRequested && <div className="mt-4"><AsoEbiYardSelector value={asoEbiQuantity} onChange={setAsoEbiQuantity} /></div>}
                  </div>
                )}

                {answer && <button type="button" disabled={!!submitting} onClick={() => respond(answer)} className="mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--brand)' }}>{submitting ? 'Saving your response…' : 'Submit RSVP'}</button>}
              </div>
            ) : (
              <div className="mt-7 rounded-[12px] px-4 py-5 text-center" style={{ background: details.response_status === 'confirmed' ? 'var(--success-bg)' : 'var(--bg)', border: '1px solid var(--line)' }}><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ background: details.response_status === 'confirmed' ? 'var(--success)' : 'var(--panel-2)', color: details.response_status === 'confirmed' ? '#0d1016' : 'var(--muted)' }}>{details.response_status === 'confirmed' ? '✓' : '—'}</div><h2 className="mt-3 text-base font-bold">{details.closed_reason === 'deadline_passed' ? 'RSVP has closed' : details.closed_reason === 'workflow_inactive' ? 'Responses are currently closed' : RESPONSE_COPY[details.response_status].title}</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{details.closed_reason === 'deadline_passed' ? 'The response deadline for this event has passed.' : details.closed_reason === 'workflow_inactive' ? 'Please contact the event organiser if you need assistance.' : RESPONSE_COPY[details.response_status].body}</p>{details.response_status === 'confirmed' && details.aso_ebi_requested && <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--brand)' }}>Aso Ebi requested: {details.aso_ebi_quantity} yards</p>}</div>
            )}

            {error && <p className="mt-4 rounded-lg px-3 py-2 text-center text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
          </div>
        ) : null}
      </div>
    </main>
  )
}
