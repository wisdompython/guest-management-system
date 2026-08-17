'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, Event, EventReminder, RsvpWorkflow } from '@/lib/api'

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function timingLabel(value: string | null, immediate: string) {
  return value ? formatDate(value) : immediate
}

export default function EventWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const eventId = Number(id)
  const [event, setEvent] = useState<Event | null>(null)
  const [workflow, setWorkflow] = useState<RsvpWorkflow | null>(null)
  const [reminders, setReminders] = useState<EventReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEvent(eventId)
      .then(async (currentEvent) => {
        setEvent(currentEvent)
        const [eventReminders, eventWorkflow] = await Promise.all([
          api.getReminders(eventId).catch(() => [] as EventReminder[]),
          currentEvent.rsvp_workflow_id
            ? api.getRsvpWorkflow(currentEvent.rsvp_workflow_id).catch(() => null)
            : Promise.resolve(null),
        ])
        setReminders(eventReminders)
        setWorkflow(eventWorkflow)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this event.'))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) return <div className="px-6 py-12 text-sm text-[var(--muted)]">Preparing event workspace...</div>
  if (!event) return <div className="px-6 py-12 text-sm text-[var(--danger)]">{error || 'Event not found.'}</div>

  const checks = [
    { label: 'Event details', detail: event.venue ? 'Date and venue added' : 'Date added; venue can follow later', done: Boolean(event.name && event.date), href: `/admin/events/${event.id}/edit` },
    { label: 'Guest list', detail: event.guest_count ? `${event.guest_count} guest${event.guest_count === 1 ? '' : 's'} added` : 'Add guests individually or upload a list', done: event.guest_count > 0, href: `/admin/guests?event=${event.id}` },
    { label: 'Pass design', detail: event.design_template ? 'Design uploaded' : 'Upload a design before passes are sent', done: Boolean(event.design_template), href: `/admin/events/${event.id}/edit#pass-design` },
    { label: event.rsvp_enabled ? 'RSVP workflow' : 'Delivery choice', detail: workflow ? `${workflow.status[0].toUpperCase()}${workflow.status.slice(1)} workflow` : event.rsvp_enabled ? 'RSVP is enabled; configure a workflow' : event.whatsapp_enabled ? 'Direct WhatsApp delivery selected' : 'WhatsApp delivery is off', done: event.rsvp_enabled ? Boolean(workflow) : true, href: workflow ? `/admin/rsvp/${workflow.id}` : event.rsvp_enabled ? `/admin/rsvp/add?event=${event.id}` : `/admin/events/${event.id}/edit` },
  ]
  const completed = checks.filter((item) => item.done).length
  const progress = Math.round((completed / checks.length) * 100)
  const nextAction = checks.find((item) => !item.done)

  const workspaceLinks = [
    { label: 'Guests', detail: `${event.guest_count} registered`, href: `/admin/guests?event=${event.id}` },
    { label: 'RSVP', detail: workflow ? `${workflow.stats.confirmed} confirmed` : event.rsvp_enabled ? 'Enabled; setup needed' : 'Not configured', href: event.rsvp_workflow_id ? `/admin/rsvp/${event.rsvp_workflow_id}` : `/admin/rsvp/add?event=${event.id}` },
    { label: 'Pass & settings', detail: event.design_template ? 'Design ready' : 'Design needed', href: `/admin/events/${event.id}/edit` },
    { label: 'Reminders', detail: `${reminders.length} configured`, href: `/admin/events/${event.id}/reminders` },
    { label: 'Check-in', detail: `${event.total_checked_in_count} of ${event.estimated_guest_count}`, href: '/admin/check-in' },
  ]
  const planningMetrics = [
    { label: event.rsvp_enabled ? 'Confirmed' : 'Registered', value: event.rsvp_enabled ? event.confirmed_count : event.guest_count, detail: event.rsvp_enabled ? `${event.guest_count} invited` : 'Primary guests' },
    { label: 'Plus-ones', value: event.plus_one_count, detail: event.allow_plus_one ? 'Additional guests declared' : 'Not enabled' },
    { label: 'Estimated guests', value: event.estimated_guest_count, detail: event.rsvp_enabled ? 'Confirmed + plus-ones' : 'Registered + plus-ones' },
    { label: 'Checked in', value: event.total_checked_in_count, detail: `${event.checked_in_count} guests · ${event.plus_one_checked_in_count} plus-ones` },
    { label: 'Aso Ebi', value: event.aso_ebi_quantity, detail: `${event.aso_ebi_request_count} request${event.aso_ebi_request_count === 1 ? '' : 's'} · yards` },
    { label: 'Preferences', value: event.preferences_submitted_count, detail: event.preferences_enabled ? 'Forms submitted' : event.rsvp_enabled ? 'Collected with RSVP' : 'Standalone form off' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 lg:px-8 lg:py-9">
      <Link href="/admin/events" className="text-xs font-semibold text-[var(--brand)] hover:underline">&larr; All events</Link>

      <header className="mt-4 flex flex-col gap-5 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${event.is_ended ? 'bg-[var(--chip)] text-[var(--muted)]' : 'bg-emerald-500/10 text-emerald-700'}`}>{event.is_ended ? 'Ended' : 'Upcoming'}</span>
            {event.rsvp_enabled && <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">RSVP {workflow?.status || 'setup needed'}</span>}
            {event.preferences_enabled && <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">Preferences only</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl text-[var(--ink)] sm:text-4xl">{event.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{formatDate(event.date)}{event.venue ? ` · ${event.venue}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/guests/add?event=${event.id}`} className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">Add guest</Link>
          <Link href={`/admin/events/${event.id}/edit`} className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:border-[var(--ink)]">Edit event</Link>
        </div>
      </header>

      <nav aria-label="Event workspace" className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {workspaceLinks.map((item) => <Link key={item.label} href={item.href} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 transition hover:-translate-y-0.5 hover:border-[rgba(184,150,62,0.45)]"><span className="block text-sm font-semibold text-[var(--ink)]">{item.label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{item.detail}</span></Link>)}
      </nav>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Planning dashboard</p><h2 className="mt-1 text-xl font-bold text-[var(--ink)]">Expected attendance and preferences</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{planningMetrics.map((metric) => <div key={metric.label} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{metric.label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-[var(--ink)]">{metric.value}</p><p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{metric.detail}</p></div>)}</div>
        {event.collect_celebrant && <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"><h3 className="text-sm font-semibold text-[var(--ink)]">Guests by celebrant</h3>{event.celebrant_breakdown.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{event.celebrant_breakdown.map((item) => <div key={item.name} className="rounded-lg bg-[var(--bg)] p-4"><p className="font-semibold text-[var(--ink)]">{item.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.guests} guest{item.guests === 1 ? '' : 's'} · {item.plus_ones} plus-one{item.plus_ones === 1 ? '' : 's'}</p><p className="mt-2 text-lg font-bold text-[var(--brand)]">{item.estimated_guests} estimated</p></div>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">No celebrant preferences have been submitted yet.</p>}</div>}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <section className="form-card">
          <div className="border-b border-[var(--line)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-[var(--ink)]">Event readiness</h2><p className="mt-1 text-xs text-[var(--muted)]">Complete the essentials before inviting guests.</p></div><span className="text-2xl font-bold text-[var(--brand)]">{progress}%</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg)]"><div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${progress}%` }}/></div>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {checks.map((item) => <Link key={item.label} href={item.href} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[var(--chip)] sm:px-6"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.done ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>{item.done ? '✓' : '!'}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--ink)]">{item.label}</span><span className="mt-0.5 block text-xs text-[var(--muted)]">{item.detail}</span></span><span className="text-[var(--muted)]">&rarr;</span></Link>)}
          </div>
          {nextAction && <div className="border-t border-[var(--line)] bg-[var(--brand-soft)] p-5 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">Recommended next step</p><div className="mt-2 flex items-center justify-between gap-3"><p className="text-sm text-[var(--ink)]">Finish {nextAction.label.toLowerCase()} to keep this event moving.</p><Link href={nextAction.href} className="shrink-0 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">Continue</Link></div></div>}
        </section>

        <aside className="space-y-5">
          <section className="form-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Guests</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div><p className="text-3xl font-bold text-[var(--ink)]">{event.guest_count}</p><p className="mt-1 text-xs text-[var(--muted)]">Registered</p></div>
              <div><p className="text-3xl font-bold text-[var(--ink)]">{event.total_checked_in_count}</p><p className="mt-1 text-xs text-[var(--muted)]">People checked in</p></div>
              {event.allow_plus_one && <><div><p className="text-3xl font-bold text-[var(--brand)]">{event.plus_one_count}</p><p className="mt-1 text-xs text-[var(--muted)]">Plus-ones</p></div><div><p className="text-3xl font-bold text-[var(--brand)]">{event.estimated_guest_count}</p><p className="mt-1 text-xs text-[var(--muted)]">Estimated guests</p></div></>}
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg)]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${event.estimated_guest_count ? Math.min(100, Math.round((event.total_checked_in_count / event.estimated_guest_count) * 100)) : 0}%` }}/></div>
          </section>

          <section className="form-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Delivery plan</p>
            {!event.whatsapp_enabled ? <p className="mt-3 text-sm text-[var(--ink)]">WhatsApp delivery is off.</p> : workflow ? <div className="mt-4 space-y-4"><div className="border-l-2 border-[var(--brand)] pl-3"><p className="text-xs text-[var(--muted)]">RSVP invitations</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]">{timingLabel(workflow.invitation_send_at, 'When workflow is launched')}</p></div><div className="border-l-2 border-[var(--brand)] pl-3"><p className="text-xs text-[var(--muted)]">Confirmed guest passes</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]">{workflow.auto_send_pass ? timingLabel(workflow.pass_send_at, 'Immediately after confirmation') : 'Manual delivery'}</p></div></div> : event.rsvp_enabled ? <div className="mt-4 border-l-2 border-amber-400 pl-3"><p className="text-xs text-[var(--muted)]">RSVP protection enabled</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]">All guest passes are held until a replacement workflow is configured.</p><Link href={`/admin/rsvp/add?event=${event.id}`} className="mt-2 inline-block text-xs font-semibold text-[var(--brand)]">Configure workflow &rarr;</Link></div> : <div className="mt-4 border-l-2 border-[var(--brand)] pl-3"><p className="text-xs text-[var(--muted)]">Direct guest passes</p><p className="mt-1 text-sm font-semibold text-[var(--ink)]">{timingLabel(event.pass_send_at, 'Immediately when a guest is added')}</p></div>}
          </section>

          <section className="form-card p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Reminders</p><p className="mt-2 text-sm text-[var(--ink)]">{reminders.length ? `${reminders.length} automatic reminder${reminders.length === 1 ? '' : 's'} configured` : 'No reminders configured'}</p></div><Link href={`/admin/events/${event.id}/reminders`} className="text-xs font-semibold text-[var(--brand)]">Manage &rarr;</Link></div>
          </section>
        </aside>
      </div>
    </div>
  )
}
