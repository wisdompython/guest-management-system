'use client'

import { useEffect, useState, use } from 'react'

import { api, GuestPreferencesDetails } from '@/lib/api'
import AsoEbiYardSelector from '@/components/rsvp/AsoEbiYardSelector'

export default function GuestPreferencesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const token = code.slice(-36)
  const [details, setDetails] = useState<GuestPreferencesDetails | null>(null)
  const [plusOne, setPlusOne] = useState(false)
  const [plusOneFullName, setPlusOneFullName] = useState('')
  const [plusOnePhoneNumber, setPlusOnePhoneNumber] = useState('')
  const [asoEbi, setAsoEbi] = useState(false)
  const [yards, setYards] = useState(2)
  const [celebrant, setCelebrant] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getGuestPreferences(token).then((result) => {
      setDetails(result)
      setPlusOne(result.plus_one_attending)
      setPlusOneFullName(result.plus_one_full_name || '')
      setPlusOnePhoneNumber(result.plus_one_phone_number || '')
      setAsoEbi(result.aso_ebi_requested)
      setYards(result.aso_ebi_quantity || 2)
      setCelebrant(result.celebrant_name || '')
    }).catch((err) => setError(err instanceof Error ? err.message : 'This preferences page could not be loaded.')).finally(() => setLoading(false))
  }, [token])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (plusOne && (!plusOneFullName.trim() || !plusOnePhoneNumber.trim())) {
      setError('Enter the full name and WhatsApp phone number of your plus one.')
      return
    }
    setSaving(true); setError('')
    try {
      await api.submitGuestPreferences(token, {
        plus_one_attending: plusOne,
        plus_one_full_name: plusOne ? plusOneFullName : '',
        plus_one_phone_number: plusOne ? plusOnePhoneNumber : '',
        aso_ebi_requested: asoEbi,
        aso_ebi_quantity: asoEbi ? yards : 0,
        celebrant_name: celebrant,
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your preferences could not be saved.')
    } finally { setSaving(false) }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-8">
    <div className="w-full max-w-xl overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
      <header className="border-b border-[var(--line)] bg-[var(--sidebar)] px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">Guest preferences</p><h1 className="mt-2 text-2xl font-bold text-[var(--ink)]">{details?.event_name || 'Event preferences'}</h1></header>
      {loading ? <p className="px-6 py-16 text-center text-sm text-[var(--muted)]">Loading…</p> : !details ? <p className="px-6 py-16 text-center text-sm text-[var(--danger)]">{error}</p> : saved ? <div className="px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)] text-white">✓</div><h2 className="mt-4 text-xl font-bold">Preferences saved</h2><p className="mt-2 text-sm text-[var(--muted)]">Thank you, {details.guest_name}. You can revisit this link to update them before the event.</p><button type="button" onClick={() => setSaved(false)} className="mt-6 text-sm font-semibold text-[var(--brand)]">Update preferences</button></div> : <form onSubmit={submit} className="space-y-5 p-6">
        <div><p className="text-base font-semibold">Hi {details.guest_name}</p><p className="mt-1 text-sm text-[var(--muted)]">Please share the planning details that apply to you. This does not change your attendance or pass delivery.</p></div>
        {details.allow_plus_one && <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={plusOne} onChange={(event) => { setPlusOne(event.target.checked); if (!event.target.checked) { setPlusOneFullName(''); setPlusOnePhoneNumber('') } }} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" /><span><span className="block text-sm font-semibold">I’m bringing a plus one</span><span className="mt-1 block text-xs text-[var(--muted)]">They will receive their own event pass and QR code.</span></span></label>{plusOne && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="text-xs font-semibold" htmlFor="preference-plus-one-name">Plus one name</label><input id="preference-plus-one-name" required value={plusOneFullName} onChange={(event) => setPlusOneFullName(event.target.value)} placeholder="Full name" className="form-control mt-2" /></div><div><label className="text-xs font-semibold" htmlFor="preference-plus-one-phone">WhatsApp phone number</label><input id="preference-plus-one-phone" required type="tel" value={plusOnePhoneNumber} onChange={(event) => setPlusOnePhoneNumber(event.target.value)} placeholder="e.g. +234 800 000 0000" className="form-control mt-2" /></div></div>}</div>}
        {details.collect_celebrant && <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4"><label className="text-sm font-semibold">Which celebrant are you here for?</label>{details.celebrant_options.length ? <select value={celebrant} onChange={(event) => setCelebrant(event.target.value)} className="form-control mt-3"><option value="">Select a celebrant</option>{details.celebrant_options.map((name) => <option key={name}>{name}</option>)}</select> : <input value={celebrant} onChange={(event) => setCelebrant(event.target.value)} placeholder="Enter the celebrant’s name" className="form-control mt-3" />}</div>}
        {details.collect_aso_ebi && <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={asoEbi} onChange={(event) => setAsoEbi(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" /><span className="text-sm font-semibold">I would like to request Aso Ebi</span></label>{asoEbi && <div className="mt-4"><AsoEbiYardSelector value={yards} onChange={setYards} /></div>}</div>}
        {error && <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger)]">{error}</p>}
        <button disabled={saving || !details.can_respond} className="w-full rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : details.can_respond ? 'Save preferences' : 'Preferences are closed'}</button>
      </form>}
    </div>
  </main>
}
