'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { api, RsvpWorkflow, RsvpWorkflowStatus } from '@/lib/api'

const STATUS_LABEL: Record<RsvpWorkflowStatus, string> = {
  draft: 'Draft',
  active: 'Collecting responses',
  paused: 'Paused',
  completed: 'Completed',
}

export default function RsvpWorkflowsPage() {
  const [workflows, setWorkflows] = useState<RsvpWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | RsvpWorkflowStatus>('all')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getRsvpWorkflows().then(setWorkflows).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => workflows.filter((workflow) => {
    const matchesSearch = workflow.event_name.toLowerCase().includes(search.trim().toLowerCase())
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter
    return matchesSearch && matchesStatus
  }), [workflows, search, statusFilter])

  async function deleteWorkflow(workflow: RsvpWorkflow) {
    const warning = workflow.status === 'active' || workflow.status === 'paused'
      ? 'This will remove all RSVP responses. The event will remain RSVP-enabled and guest passes will stay held.'
      : 'This will remove the workflow and all of its RSVP recipients and responses. The event will remain RSVP-enabled.'
    if (!confirm(`Delete the RSVP workflow for "${workflow.event_name}"?\n\n${warning}\n\nThis cannot be undone.`)) return
    setDeleting(workflow.id)
    setError('')
    try {
      await api.deleteRsvpWorkflow(workflow.id)
      setWorkflows((current) => current.filter((item) => item.id !== workflow.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The RSVP workflow could not be deleted.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--brand)' }}>Optional workflow</p>
          <h1 className="mt-1 text-xl font-bold" style={{ color: 'var(--ink)' }}>RSVP Workflows</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Ask guests to confirm their attendance or availability before issuing passes.</p>
        </div>
        <Link href="/admin/rsvp/add" className="rounded-lg px-4 py-2 text-center text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
          + New RSVP Workflow
        </Link>
      </div>

      <div className="mb-5 rounded-[12px] px-4 py-3" style={{ border: '1px solid rgba(184,150,62,0.25)', background: 'var(--brand-soft)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Standard event delivery remains unchanged</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Only events listed here hold passes until guests confirm. All other events continue using the normal workflow.</p>
      </div>

      {workflows.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2.5 rounded-[12px] px-4 py-3" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event…" className="min-w-[190px] flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none" style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | RsvpWorkflowStatus)} className="rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none" style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      )}

      {error && <p className="mb-4 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}

      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading workflows…</div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No RSVP workflows yet</p>
            <p className="mt-1 max-w-md text-xs" style={{ color: 'var(--muted)' }}>Create one for an event where guests need to confirm their attendance or availability. Events that do not need RSVP require no setup.</p>
            <Link href="/admin/rsvp/add" className="mt-5 rounded-full px-5 py-2 text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>Create first workflow</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm" style={{ color: 'var(--muted)' }}>No workflows match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Responses</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider">Confirmed</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider">Passes sent</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody>{filtered.map((workflow) => {
                const responded = workflow.stats.confirmed + workflow.stats.declined
                return (
                  <tr key={workflow.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="px-4 py-4"><p className="font-semibold" style={{ color: 'var(--ink)' }}>{workflow.event_name}</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{new Date(workflow.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></td>
                    <td className="px-4 py-4"><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: workflow.status === 'active' ? 'var(--success-bg)' : 'var(--brand-soft)', color: workflow.status === 'active' ? 'var(--success)' : 'var(--brand)' }}>{STATUS_LABEL[workflow.status]}</span></td>
                    <td className="px-4 py-4"><div className="flex items-center justify-between gap-4 text-xs"><span>{responded} / {workflow.stats.invited}</span><span style={{ color: 'var(--muted)' }}>{workflow.stats.response_rate}%</span></div><div className="mt-2 h-1.5 min-w-[130px] overflow-hidden rounded-full" style={{ background: 'var(--line)' }}><div className="h-full rounded-full" style={{ width: `${workflow.stats.response_rate}%`, background: 'var(--brand)' }} /></div></td>
                    <td className="px-4 py-4 text-right font-semibold">{workflow.stats.confirmed}</td>
                    <td className="px-4 py-4 text-right">{workflow.stats.passes_sent}</td>
                    <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-3"><Link href={`/admin/rsvp/${workflow.id}`} className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>View</Link><Link href={`/admin/rsvp/add?workflow=${workflow.id}`} className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Edit</Link><button type="button" disabled={deleting === workflow.id} onClick={() => deleteWorkflow(workflow)} className="text-xs font-semibold disabled:opacity-40" style={{ color: 'var(--danger)' }}>{deleting === workflow.id ? 'Deleting…' : 'Delete'}</button></div></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
