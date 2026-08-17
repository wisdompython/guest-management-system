'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { api, QueueMonitorSnapshot } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

function formatAge(seconds: number | null) {
  if (seconds === null) return 'Never'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

function shortTaskName(name: string) {
  return name.split('.').slice(-2).join('.') || 'Unknown task'
}

function statusColor(status: string) {
  const normalised = status.toLowerCase()
  if (['success', 'delivered', 'read', 'online', 'healthy'].includes(normalised)) return 'var(--success)'
  if (['failure', 'failed', 'offline', 'unhealthy'].includes(normalised)) return 'var(--danger)'
  if (['started', 'sending', 'active'].includes(normalised)) return 'var(--brand)'
  return 'var(--muted)'
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold capitalize"
      style={{ background: 'var(--bg)', color: statusColor(value), border: '1px solid var(--line)' }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor(value) }} />
      {value.toLowerCase()}
    </span>
  )
}

function SummaryCard({ label, value, note, danger = false }: { label: string; value: string | number; note: string; danger?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: danger ? 'var(--danger)' : 'var(--ink)' }}>{value}</p>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>{note}</p>
    </div>
  )
}

export default function QueueMonitorPage() {
  const { user, loading: authLoading } = useRequireAuth('super_admin')
  const [snapshot, setSnapshot] = useState<QueueMonitorSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [deliveryStatus, setDeliveryStatus] = useState<'all' | 'queued' | 'sending' | 'failed'>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const result = await api.getQueueMonitor()
      setSnapshot(result)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load queue diagnostics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading || user?.role !== 'super_admin') return
    load()
  }, [authLoading, load, user?.role])

  useEffect(() => {
    if (!autoRefresh || authLoading || user?.role !== 'super_admin') return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(true)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [authLoading, autoRefresh, load, user?.role])

  const deliveries = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (snapshot?.deliveries ?? []).filter((delivery) => (
      (deliveryStatus === 'all' || delivery.status === deliveryStatus)
      && (!needle || `${delivery.event} ${delivery.guest} ${delivery.template} ${delivery.error}`.toLowerCase().includes(needle))
    ))
  }, [deliveryStatus, search, snapshot?.deliveries])

  if (authLoading || (loading && !snapshot)) {
    return <div className="px-6 py-14 text-sm" style={{ color: 'var(--muted)' }}>Loading queue diagnostics…</div>
  }
  if (user?.role !== 'super_admin') return null

  const messageQueue = snapshot?.broker.queues.find((queue) => queue.name === 'messages')
  const onlineWorkers = snapshot?.workers.workers.filter((worker) => worker.online).length ?? 0
  const activeTasks = snapshot?.workers.tasks.filter((task) => task.state === 'active').length ?? 0
  const failedDeliveries = snapshot?.deliveries.filter((delivery) => delivery.status === 'failed').length ?? 0

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--brand)' }}>Developer</p>
          <h1 className="mt-1 text-xl font-bold" style={{ color: 'var(--ink)' }}>Queue monitor</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Read-only Celery, Redis, scheduler, and WhatsApp delivery diagnostics.</p>
          {snapshot && <p className="mt-1 text-[10px]" style={{ color: 'var(--muted-2)' }}>Snapshot: {formatDate(snapshot.generated_at)}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
            Refresh every 15s
          </label>
          <button onClick={() => load()} disabled={refreshing} className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ border: '1px solid var(--line)', color: 'var(--brand)' }}>{refreshing ? 'Refreshing…' : 'Refresh now'}</button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>}

      {snapshot && <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Messages pending" value={messageQueue?.pending ?? '—'} note={snapshot.broker.available ? 'Waiting in the Redis messages queue' : 'Broker unavailable'} danger={(messageQueue?.pending ?? 0) > 100} />
          <SummaryCard label="Workers online" value={onlineWorkers} note={`${snapshot.workers.workers.length} worker node${snapshot.workers.workers.length === 1 ? '' : 's'} detected`} danger={onlineWorkers === 0} />
          <SummaryCard label="Tasks active" value={activeTasks} note={`${snapshot.workers.tasks.length} active, reserved, or scheduled`} />
          <SummaryCard label="24h send budget" value={`${snapshot.send_budget.remaining}/${snapshot.send_budget.daily_limit}`} note={`${snapshot.message_rate.estimated_global_ceiling_per_minute}/min estimated message ceiling`} danger={snapshot.send_budget.remaining === 0} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Broker queues</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Pending tasks waiting for a worker.</p></div><StatusPill value={snapshot.broker.available ? 'online' : 'offline'} /></div>
            {!snapshot.broker.available && <p className="mt-3 text-xs" style={{ color: 'var(--danger)' }}>{snapshot.broker.error}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {snapshot.broker.queues.map((queue) => <div key={queue.name} className="rounded-lg px-3 py-3" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}><p className="text-xs font-semibold">{queue.name}</p><p className="mt-1 text-xl font-bold tabular-nums">{queue.pending ?? '—'}</p></div>)}
            </div>
          </section>

          <section className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Workers</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Live worker responses and subscribed queues.</p></div><StatusPill value={onlineWorkers > 0 ? 'online' : 'offline'} /></div>
            {snapshot.workers.error && <p className="mt-3 text-xs" style={{ color: 'var(--danger)' }}>{snapshot.workers.error}</p>}
            <div className="mt-4 space-y-2">
              {snapshot.workers.workers.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>No workers responded to inspection.</p>}
              {snapshot.workers.workers.map((worker) => <div key={worker.name} className="rounded-lg px-3 py-3" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">{worker.name}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>{worker.queues.join(', ') || 'No queues reported'} · concurrency {worker.concurrency ?? '—'}</p></div><StatusPill value={worker.online ? 'online' : 'offline'} /></div><p className="mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>{worker.active} active · {worker.reserved} reserved · {worker.scheduled} scheduled</p></div>)}
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="px-5 py-4"><h2 className="text-sm font-semibold">Live tasks</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Tasks currently active, reserved by a worker, or scheduled for later. Arguments and payloads are hidden.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}><th className="px-5 py-3">Task</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Queue</th><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Timing</th></tr></thead><tbody>{snapshot.workers.tasks.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ color: 'var(--muted)' }}>No live tasks reported.</td></tr> : snapshot.workers.tasks.map((task) => <tr key={`${task.worker}-${task.id}-${task.state}`} style={{ borderBottom: '1px solid var(--line)' }}><td className="px-5 py-3"><p className="font-semibold">{shortTaskName(task.name)}</p><p className="mt-0.5 max-w-[250px] truncate font-mono text-[9px]" style={{ color: 'var(--muted)' }}>{task.id}</p></td><td className="px-4 py-3"><StatusPill value={task.state} /></td><td className="px-4 py-3 font-mono text-[10px]">{task.queue || '—'}</td><td className="max-w-[220px] truncate px-4 py-3 text-[10px]">{task.worker}</td><td className="px-4 py-3 text-[10px]">{task.eta ? `ETA ${formatDate(task.eta)}` : task.time_start ? `Started ${new Date(task.time_start * 1000).toLocaleTimeString('en-GB')}` : '—'}</td></tr>)}</tbody></table></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="px-5 py-4"><h2 className="text-sm font-semibold">Periodic dispatchers</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Database-backed Celery Beat schedule activity. Healthy means the dispatcher is not overdue for its own scheduled run.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}><th className="px-5 py-3">Dispatcher</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Last run</th><th className="px-4 py-3">Runs</th></tr></thead><tbody>{snapshot.periodic_dispatchers.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center" style={{ color: 'var(--muted)' }}>No periodic task records yet.</td></tr> : snapshot.periodic_dispatchers.map((task) => <tr key={task.name} style={{ borderBottom: '1px solid var(--line)' }}><td className="px-5 py-3"><p className="font-semibold">{task.name}</p><p className="mt-0.5 text-[10px]" style={{ color: 'var(--muted)' }}>{shortTaskName(task.task)}</p></td><td className="px-4 py-3"><StatusPill value={task.healthy ? 'healthy' : 'unhealthy'} /></td><td className="px-4 py-3">{formatAge(task.seconds_since_last_run)}<p className="mt-0.5 text-[10px]" style={{ color: 'var(--muted)' }}>{formatDate(task.last_run_at)}</p></td><td className="px-4 py-3 tabular-nums">{task.total_runs}</td></tr>)}</tbody></table></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold">RSVP delivery pipeline</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{failedDeliveries} recent failures · phone numbers masked</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event, guest, template…" className="min-w-[220px] rounded-lg px-3 py-2 text-xs focus:outline-none" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }} /><select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value as typeof deliveryStatus)} className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}><option value="all">All states</option><option value="queued">Queued</option><option value="sending">Sending</option><option value="failed">Failed</option></select></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}><th className="px-5 py-3">Recipient</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Template / attempt</th><th className="px-4 py-3">Error</th></tr></thead><tbody>{deliveries.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ color: 'var(--muted)' }}>No delivery records match.</td></tr> : deliveries.map((delivery) => <tr key={`${delivery.recipient_id}-${delivery.channel}`} style={{ borderBottom: '1px solid var(--line)' }}><td className="px-5 py-3"><Link href={`/admin/rsvp/${delivery.workflow_id}`} className="font-semibold" style={{ color: 'var(--brand)' }}>{delivery.guest}</Link><p className="mt-0.5 text-[10px]" style={{ color: 'var(--muted)' }}>{delivery.event} · {delivery.phone}</p></td><td className="px-4 py-3 capitalize">{delivery.channel}</td><td className="px-4 py-3"><StatusPill value={delivery.status} /><p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>{delivery.retries} auto retries</p></td><td className="px-4 py-3"><p className="max-w-[220px] truncate font-mono text-[10px]">{delivery.template || 'Not claimed by worker yet'}</p><p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>{formatDate(delivery.queued_at)}</p></td><td className="max-w-[320px] px-4 py-3 text-[10px] leading-4" style={{ color: delivery.error ? 'var(--danger)' : 'var(--muted)' }}>{delivery.error || '—'}</td></tr>)}</tbody></table></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="px-5 py-4"><h2 className="text-sm font-semibold">Recent task results</h2><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>No task arguments or raw payloads are exposed.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}><th className="px-5 py-3">Task</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Finished</th><th className="px-4 py-3">Result</th></tr></thead><tbody>{snapshot.recent_tasks.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ color: 'var(--muted)' }}>No persisted task results yet.</td></tr> : snapshot.recent_tasks.map((task) => <tr key={task.id} style={{ borderBottom: '1px solid var(--line)' }}><td className="px-5 py-3"><p className="font-semibold">{shortTaskName(task.name)}</p><p className="mt-0.5 max-w-[220px] truncate font-mono text-[9px]" style={{ color: 'var(--muted)' }}>{task.id}</p></td><td className="px-4 py-3"><StatusPill value={task.status} /></td><td className="max-w-[180px] truncate px-4 py-3 text-[10px]">{task.worker || '—'}</td><td className="px-4 py-3">{formatDate(task.finished_at)}<p className="mt-0.5 text-[10px]" style={{ color: 'var(--muted)' }}>{task.runtime_ms === null ? 'runtime unavailable' : `${task.runtime_ms}ms`}</p></td><td className="max-w-[320px] px-4 py-3 text-[10px]" style={{ color: task.error ? 'var(--danger)' : 'var(--muted)' }}>{task.error || 'Completed'}</td></tr>)}</tbody></table></div>
        </section>
      </>}
    </div>
  )
}
