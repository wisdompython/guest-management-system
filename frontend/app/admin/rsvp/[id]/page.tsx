'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { api, RsvpRecipient, RsvpResponseStatus, RsvpWorkflow } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

const RESPONSE_LABEL: Record<RsvpResponseStatus, string> = {
  awaiting: 'Awaiting', confirmed: 'Confirmed', declined: 'Declined',
}

function metric(label: string, value: number, note: string, color?: string) {
  return <div className="rounded-[12px] p-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}><p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</p><p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: color || 'var(--ink)' }}>{value}</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{note}</p></div>
}

export default function RsvpWorkflowDetailPage() {
  const id = Number(useParams<{ id: string }>().id)
  const [workflow, setWorkflow] = useState<RsvpWorkflow | null>(null)
  const [recipients, setRecipients] = useState<RsvpRecipient[]>([])
  const [recipientCount, setRecipientCount] = useState(0)
  const [responseFilter, setResponseFilter] = useState<'all' | RsvpResponseStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const loadWorkflow = useCallback(async () => {
    const result = await api.getRsvpWorkflow(id)
    setWorkflow(result)
  }, [id])

  const loadRecipients = useCallback(async () => {
    const result = await api.getRsvpRecipients({
      workflow: id,
      page,
      search: search || undefined,
      response_status: responseFilter === 'all' ? undefined : responseFilter,
    })
    setRecipients(result.results)
    setRecipientCount(result.count)
  }, [id, page, responseFilter, search])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadWorkflow(), loadRecipients()]).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load workflow.')).finally(() => setLoading(false))
  }, [loadWorkflow, loadRecipients])

  async function runAction(name: string, action: () => Promise<unknown>) {
    setWorking(name); setError('')
    try { await action(); await Promise.all([loadWorkflow(), loadRecipients()]) }
    catch (err) { setError(err instanceof Error ? err.message : 'The action could not be completed.') }
    finally { setWorking('') }
  }

  if (loading && !workflow) return <div className="px-6 py-14 text-sm" style={{ color: 'var(--muted)' }}>Loading RSVP workflow…</div>
  if (!workflow) return <div className="px-6 py-14"><p className="text-sm" style={{ color: 'var(--danger)' }}>{error || 'Workflow not found.'}</p><Link href="/admin/rsvp" className="mt-4 inline-block text-xs font-semibold" style={{ color: 'var(--brand)' }}>← RSVP workflows</Link></div>

  const stats = workflow.stats
  const responded = stats.confirmed + stats.declined
  const totalPages = Math.max(1, Math.ceil(recipientCount / 50))

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">
      <Link href="/admin/rsvp" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>← All RSVP workflows</Link>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{workflow.event_name}</h1><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize" style={{ background: workflow.status === 'active' ? 'var(--success-bg)' : 'var(--brand-soft)', color: workflow.status === 'active' ? 'var(--success)' : 'var(--brand)' }}>{workflow.status}</span></div><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{new Date(workflow.event_date).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}{workflow.response_deadline ? ` · Replies close ${new Date(workflow.response_deadline).toLocaleDateString('en-GB')}` : ''}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { window.location.href = `${BASE_URL}/rsvp/workflows/${id}/export/` }} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Export CSV</button>
          {workflow.status === 'draft' && <button disabled={!!working} onClick={() => runAction('launch', () => api.launchRsvpWorkflow(id))} className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand)' }}>{working === 'launch' ? 'Launching…' : workflow.invitation_send_at ? `Schedule for ${new Date(workflow.invitation_send_at).toLocaleString('en-GB')}` : `Launch to ${stats.invited} guests`}</button>}
          {workflow.status === 'active' && <><button disabled={!!working || stats.awaiting === 0} onClick={() => { if (confirm(`Send another RSVP invitation to ${stats.awaiting} awaiting guests?`)) runAction('remind', () => api.remindAwaitingRsvpGuests(id)) }} className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40" style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>Remind awaiting</button><button disabled={!!working} onClick={() => runAction('pause', () => api.pauseRsvpWorkflow(id))} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Pause</button></>}
          {workflow.status === 'paused' && <button disabled={!!working} onClick={() => runAction('resume', () => api.resumeRsvpWorkflow(id))} className="rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>Resume</button>}
          {(workflow.status === 'active' || workflow.status === 'paused') && <button disabled={!!working} onClick={() => { if (confirm('Complete this RSVP workflow? Normal pass delivery will resume for the event.')) runAction('complete', () => api.completeRsvpWorkflow(id)) }} className="rounded-lg px-4 py-2 text-xs font-semibold" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Complete</button>}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}
      {workflow.status === 'draft' && <div className="mt-5 rounded-[12px] px-4 py-3" style={{ background: 'var(--brand-soft)', border: '1px solid rgba(184,150,62,0.25)' }}><p className="text-sm font-semibold">Ready for review</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{stats.invited} eligible guests were added. {workflow.invitation_send_at ? `Launch now to activate invitation delivery for ${new Date(workflow.invitation_send_at).toLocaleString('en-GB')}.` : 'No messages have been sent. Launch when the Meta RSVP template is approved and ready.'}{workflow.auto_send_pass && workflow.pass_send_at ? ` Confirmed passes are scheduled for ${new Date(workflow.pass_send_at).toLocaleString('en-GB')}.` : ''}</p></div>}
      {workflow.status === 'active' && workflow.invitation_send_at && new Date(workflow.invitation_send_at) > new Date() && <div className="mt-5 rounded-[12px] px-4 py-3" style={{ background: 'var(--brand-soft)', border: '1px solid rgba(184,150,62,0.25)' }}><p className="text-sm font-semibold">Invitations scheduled</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>RSVP requests will begin sending at {new Date(workflow.invitation_send_at).toLocaleString('en-GB')}.</p></div>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metric('Confirmed', stats.confirmed, `${stats.confirmation_rate}% of invitees`, 'var(--success)')}
        {metric('Declined', stats.declined, `${responded} total responses`)}
        {metric('Awaiting', stats.awaiting, 'Eligible for reminders')}
        {metric('Passes sent', stats.passes_sent, stats.passes_failed ? `${stats.passes_failed} failed` : 'No failed deliveries')}
        {metric('Aso Ebi yards', stats.aso_ebi_quantity, `${stats.aso_ebi_requests} guest request${stats.aso_ebi_requests === 1 ? '' : 's'}`, 'var(--brand)')}
      </div>

      <div className="mt-5 rounded-[12px] p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-sm font-semibold">Response progress</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{responded} of {stats.invited} guests have responded</p></div><p className="text-sm font-bold tabular-nums" style={{ color: 'var(--brand)' }}>{stats.response_rate}%</p></div>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}><span style={{ width: `${stats.invited ? (stats.confirmed / stats.invited) * 100 : 0}%`, background: 'var(--success)' }} /><span style={{ width: `${stats.invited ? (stats.declined / stats.invited) * 100 : 0}%`, background: 'var(--danger)' }} /></div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px]" style={{ color: 'var(--muted)' }}><span>● <b style={{ color: 'var(--success)' }}>Confirmed</b> {stats.confirmed}</span><span>● <b style={{ color: 'var(--danger)' }}>Declined</b> {stats.declined}</span><span>● Awaiting {stats.awaiting}</span></div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[12px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid var(--line)' }}><div><h2 className="text-sm font-semibold">Recipients</h2><p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{recipientCount} matching guests</p></div><div className="flex flex-wrap gap-2"><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search guest…" className="min-w-[170px] flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /><select value={responseFilter} onChange={(e) => { setResponseFilter(e.target.value as 'all' | RsvpResponseStatus); setPage(1) }} className="rounded-lg px-3 py-2 text-xs focus:outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}><option value="all">All responses</option><option value="awaiting">Awaiting</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Guest</th><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Response</th><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Invitation</th><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Pass</th><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Responded</th><th className="px-4 py-3"></th></tr></thead><tbody>{recipients.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-xs" style={{ color: 'var(--muted)' }}>No recipients match these filters.</td></tr> : recipients.map((recipient) => <RecipientRow key={recipient.id} recipient={recipient} working={working} retry={(kind) => runAction(`${kind}-${recipient.id}`, () => kind === 'invitation' ? api.retryRsvpInvitation(recipient.id) : api.retryRsvpPass(recipient.id))} />)}</tbody></table></div>
        {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 text-xs" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)' }}><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded px-3 py-1.5 disabled:opacity-30" style={{ border: '1px solid var(--line)' }}>← Previous</button><span>Page {page} of {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="rounded px-3 py-1.5 disabled:opacity-30" style={{ border: '1px solid var(--line)' }}>Next →</button></div>}
      </div>
    </div>
  )
}

function RecipientRow({ recipient, retry, working }: { recipient: RsvpRecipient; retry: (kind: 'invitation' | 'pass') => void; working: string }) {
  const responseColor = recipient.response_status === 'confirmed' ? 'var(--success)' : recipient.response_status === 'declined' ? 'var(--danger)' : 'var(--muted)'
  return <tr style={{ borderBottom: '1px solid var(--line)' }}><td className="px-4 py-3"><p className="font-semibold">{recipient.guest_name}</p><p className="mt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>{recipient.ticket_type || 'Guest'}{recipient.table_number ? ` · Table ${recipient.table_number}` : ''}{recipient.aso_ebi_requested ? ` · Aso Ebi ${recipient.aso_ebi_quantity} yd` : ''}</p></td><td className="px-4 py-3"><span className="text-xs font-semibold" style={{ color: responseColor }}>{RESPONSE_LABEL[recipient.response_status]}</span></td><td className="px-4 py-3 text-xs capitalize" style={{ color: recipient.invitation_status === 'failed' ? 'var(--danger)' : 'var(--muted)' }}>{recipient.invitation_status.replace('_', ' ')}</td><td className="px-4 py-3 text-xs capitalize" style={{ color: recipient.pass_status === 'failed' ? 'var(--danger)' : 'var(--muted)' }}>{recipient.pass_status.replace('_', ' ')}</td><td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{recipient.responded_at ? new Date(recipient.responded_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td><td className="px-4 py-3 text-right">{recipient.invitation_status === 'failed' && <button disabled={!!working} onClick={() => retry('invitation')} className="text-xs font-semibold disabled:opacity-40" style={{ color: 'var(--brand)' }}>{working === `invitation-${recipient.id}` ? 'Queuing…' : 'Retry invitation'}</button>}{recipient.pass_status === 'failed' && <button disabled={!!working} onClick={() => retry('pass')} className="text-xs font-semibold disabled:opacity-40" style={{ color: 'var(--brand)' }}>{working === `pass-${recipient.id}` ? 'Queuing…' : 'Retry pass'}</button>}</td></tr>
}
