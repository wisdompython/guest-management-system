'use client'

import { useState, useEffect } from 'react'

interface Step {
  title: string
  body: string
  image?: string // path under /public, e.g. /docs/events-create.png
}

interface Section {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  steps: Step[]
}

const Ic = {
  events:    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  guests:    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  scanner:   <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3" rx="0.5"/><rect x="14" y="7" width="3" height="3" rx="0.5"/><rect x="7" y="14" width="3" height="3" rx="0.5"/></svg>,
  whatsapp:  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  templates: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  team:      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 15c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/><circle cx="12" cy="8" r="4"/></svg>,
}

const SECTIONS: Section[] = [
  {
    id: 'events',
    title: 'Creating an event',
    description: 'Set up a new event with a date, venue, and pass design.',
    icon: Ic.events,
    steps: [
      {
        title: 'Open Events and click "+ New Event"',
        body: 'Go to Events in the sidebar, then click the "+ New Event" button in the top right.',
        image: '/docs/events-new-button.png',
      },
      {
        title: 'Fill in event details',
        body: 'Add the event name, date, and venue. These appear on guest passes and in WhatsApp messages.',
        image: '/docs/events-form.png',
      },
      {
        title: 'Design the guest pass',
        body: 'Use the Pass Designer to set a background, fonts, and QR placement for the printable/digital pass.',
        image: '/docs/events-pass-design.png',
      },
    ],
  },
  {
    id: 'guests',
    title: 'Adding guests',
    description: 'Add guests one at a time, or bulk-upload a spreadsheet.',
    icon: Ic.guests,
    steps: [
      {
        title: 'Add a single guest',
        body: 'From Guests, click "+ Add Guest" and fill in their name, phone number, and event.',
        image: '/docs/guests-add.png',
      },
      {
        title: 'Bulk upload a guest list',
        body: 'Go to Bulk Upload, download the template, fill it in with your guest list, then upload it. You\'ll see a results summary showing how many guests were imported successfully.',
        image: '/docs/guests-bulk-upload.png',
      },
      {
        title: 'Search across all events',
        body: 'Use the global guest search to quickly find any guest by name or phone number, regardless of which event they belong to.',
        image: '/docs/guests-search.png',
      },
    ],
  },
  {
    id: 'checkin',
    title: 'Checking guests in',
    description: 'Scan QR codes at the door and watch arrivals live.',
    icon: Ic.scanner,
    steps: [
      {
        title: 'Open the Scanner station',
        body: 'Go to Scanner stations in the sidebar. This screen is optimized for tablets and phones at the entrance.',
        image: '/docs/checkin-scanner.png',
      },
      {
        title: 'Scan a guest\'s QR code',
        body: 'Point the camera at the guest pass QR code. A green "Checked In" screen confirms success; a duplicate scan shows a warning instead of checking them in twice.',
        image: '/docs/checkin-success.png',
      },
      {
        title: 'Watch arrivals live on the Dashboard',
        body: 'The Dashboard shows a live feed of check-ins as they happen, along with attendance stats for the event.',
        image: '/docs/checkin-dashboard.png',
      },
    ],
  },
  {
    id: 'whatsapp',
    title: 'Sending WhatsApp messages',
    description: 'Send guest passes and reminders over WhatsApp.',
    icon: Ic.whatsapp,
    steps: [
      {
        title: 'Pick an event',
        body: 'Open WhatsApp in the sidebar and select the event you want to message guests for.',
        image: '/docs/whatsapp-event-picker.png',
      },
      {
        title: 'Send to one guest or in bulk',
        body: 'Send a pass to an individual guest from their row, or use "Send to all" to bulk-send to every guest with a phone number who hasn\'t received one yet.',
        image: '/docs/whatsapp-bulk-send.png',
      },
      {
        title: 'Set up automatic reminders',
        body: 'Go to Reminders to schedule WhatsApp reminders (e.g. "1 day before") that send automatically using an approved template.',
        image: '/docs/whatsapp-reminders.png',
      },
    ],
  },
  {
    id: 'templates',
    title: 'Managing WhatsApp templates',
    description: 'Create and preview templates approved in Meta Business.',
    icon: Ic.templates,
    steps: [
      {
        title: 'Open Templates',
        body: 'Go to Settings → Templates. This lists every WhatsApp template available to your account, grouped by category.',
        image: '/docs/templates-list.png',
      },
      {
        title: 'Add or edit a template',
        body: 'Click "+ Add template" or select an existing one. Use {{1}}, {{2}}, etc. as placeholders — these get filled in per guest (e.g. {{1}} = guest name).',
        image: '/docs/templates-edit.png',
      },
      {
        title: 'Preview before saving',
        body: 'The preview bubble shows exactly how the message will look once placeholders are filled in, so you can catch mismatches before sending to guests.',
        image: '/docs/templates-preview.png',
      },
    ],
  },
  {
    id: 'team',
    title: 'Managing your team',
    description: 'Invite teammates and control what they can see and do.',
    icon: Ic.team,
    steps: [
      {
        title: 'Invite a teammate',
        body: 'Go to Team (super admins only) and click "+ Add user". Assign a role to control their access level.',
        image: '/docs/team-add-user.png',
      },
      {
        title: 'Understand the roles',
        body: 'Viewer can only view data. Event Manager can create/edit events and guests. Super Admin has full access, including team management and templates.',
      },
    ],
  },
]

function StepModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const step = section.steps[index]
  const isFirst = index === 0
  const isLast = index === section.steps.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && !isLast) setIndex((i) => i + 1)
      if (e.key === 'ArrowLeft' && !isFirst) setIndex((i) => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFirst, isLast, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--brand)' }}>{section.icon}</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{section.title}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-70" style={{ color: 'var(--muted)' }}>
            ✕
          </button>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center" style={{ background: 'var(--bg)', minHeight: '220px', borderBottom: '1px solid var(--line)' }}>
          {step.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={step.image} alt={step.title} className="max-h-[320px] w-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--muted-2)' }}>
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-xs">No screenshot yet</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--brand)' }}>
            Step {index + 1} of {section.steps.length}
          </p>
          <p className="mt-1.5 text-base font-semibold" style={{ color: 'var(--ink)' }}>{step.title}</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{step.body}</p>
        </div>

        {/* Footer: dots + nav */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="flex items-center gap-1.5">
            {section.steps.map((_, i) => (
              <button key={i} onClick={() => setIndex(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === index ? '18px' : '6px', background: i === index ? 'var(--brand)' : 'var(--line)' }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={() => setIndex((i) => i - 1)}
                className="rounded-full px-4 py-2 text-xs font-semibold transition hover:opacity-80"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
                Back
              </button>
            )}
            {!isLast ? (
              <button onClick={() => setIndex((i) => i + 1)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: 'var(--brand)' }}>
                Next
              </button>
            ) : (
              <button onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: 'var(--brand)' }}>
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GuideCard({ section, onOpen }: { section: Section; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="flex flex-col items-start gap-3 rounded-xl p-5 text-left transition hover:opacity-90"
      style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
        {section.icon}
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{section.title}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{section.description}</p>
      </div>
      <span className="mt-auto text-xs font-semibold" style={{ color: 'var(--brand)' }}>
        {section.steps.length} steps →
      </span>
    </button>
  )
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeSection = SECTIONS.find((s) => s.id === activeId) ?? null

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Docs &amp; How-To</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
          Pick a guide below to walk through it step by step.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <GuideCard key={section.id} section={section} onOpen={() => setActiveId(section.id)} />
        ))}
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--muted-2)' }}>
        Screenshots not loading? Drop image files into <code>frontend/public/docs/</code> matching the paths referenced in this page.
      </p>

      {activeSection && (
        <StepModal section={activeSection} onClose={() => setActiveId(null)} />
      )}
    </div>
  )
}
