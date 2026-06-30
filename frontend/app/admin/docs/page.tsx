'use client'

import { useTour } from '@/components/tour/TourProvider'
import { TOURS } from '@/lib/tours'

const Ic = {
  events:    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  guests:    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  scanner:   <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3" rx="0.5"/><rect x="14" y="7" width="3" height="3" rx="0.5"/><rect x="7" y="14" width="3" height="3" rx="0.5"/></svg>,
  whatsapp:  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  templates: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  team:      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 15c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/><circle cx="12" cy="8" r="4"/></svg>,
}

const GUIDES: { id: string; title: string; description: string; icon: React.ReactNode }[] = [
  { id: 'events',   title: 'Creating an event',          description: 'Set up a new event with a date, venue, and pass design.', icon: Ic.events },
  { id: 'guests',   title: 'Adding guests',               description: 'Add guests one at a time, or bulk-upload a spreadsheet.', icon: Ic.guests },
  { id: 'checkin',  title: 'Checking guests in',           description: 'Scan QR codes at the door and watch arrivals live.', icon: Ic.scanner },
  { id: 'whatsapp', title: 'Sending WhatsApp messages',    description: 'Send guest passes and reminders over WhatsApp.', icon: Ic.whatsapp },
  { id: 'templates', title: 'Managing WhatsApp templates', description: 'Create and preview templates approved in Meta Business.', icon: Ic.templates },
  { id: 'team',     title: 'Managing your team',           description: 'Invite teammates and control what they can see and do.', icon: Ic.team },
]

export default function DocsPage() {
  const { start } = useTour()

  function launch(id: string) {
    const tour = TOURS.find((t) => t.id === id)
    if (tour) start(tour)
  }

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Docs &amp; How-To</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
          Pick a guide below — it'll walk you through the real interface, step by step.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => {
          const steps = TOURS.find((t) => t.id === g.id)?.steps.length ?? 0
          return (
            <button key={g.id} onClick={() => launch(g.id)}
              className="flex flex-col items-start gap-3 rounded-xl p-5 text-left transition hover:opacity-90"
              style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                {g.icon}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{g.title}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{g.description}</p>
              </div>
              <span className="mt-auto text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                {steps} steps · Start tour →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
