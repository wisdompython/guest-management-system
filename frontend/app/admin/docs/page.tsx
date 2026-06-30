'use client'

import { useState } from 'react'

interface Step {
  title: string
  body: string
  image?: string // path under /public, e.g. /docs/events-create.png
}

interface Section {
  id: string
  title: string
  description: string
  steps: Step[]
}

const SECTIONS: Section[] = [
  {
    id: 'events',
    title: 'Creating an event',
    description: 'Events are the top-level container for guests, passes, and WhatsApp messaging.',
    steps: [
      {
        title: '1. Open Events and click "+ New Event"',
        body: 'Go to Events in the sidebar, then click the "+ New Event" button in the top right.',
        image: '/docs/events-new-button.png',
      },
      {
        title: '2. Fill in event details',
        body: 'Add the event name, date, and venue. These appear on guest passes and in WhatsApp messages.',
        image: '/docs/events-form.png',
      },
      {
        title: '3. Design the guest pass',
        body: 'Use the Pass Designer to set a background, fonts, and QR placement for the printable/digital pass.',
        image: '/docs/events-pass-design.png',
      },
    ],
  },
  {
    id: 'guests',
    title: 'Adding guests',
    description: 'Add guests one at a time, or bulk-upload a spreadsheet for large events.',
    steps: [
      {
        title: '1. Add a single guest',
        body: 'From Guests, click "+ Add Guest" and fill in their name, phone number, and event.',
        image: '/docs/guests-add.png',
      },
      {
        title: '2. Bulk upload a guest list',
        body: 'Go to Bulk Upload, download the template, fill it in with your guest list, then upload it. You\'ll see a results summary showing how many guests were imported successfully.',
        image: '/docs/guests-bulk-upload.png',
      },
      {
        title: '3. Search across all events',
        body: 'Use the global guest search to quickly find any guest by name or phone number, regardless of which event they belong to.',
        image: '/docs/guests-search.png',
      },
    ],
  },
  {
    id: 'checkin',
    title: 'Checking guests in',
    description: 'Use the scanner station to check guests in at the door by scanning their QR code.',
    steps: [
      {
        title: '1. Open the Scanner station',
        body: 'Go to Scanner stations in the sidebar. This screen is optimized for tablets and phones at the entrance.',
        image: '/docs/checkin-scanner.png',
      },
      {
        title: '2. Scan a guest\'s QR code',
        body: 'Point the camera at the guest pass QR code. A green "Checked In" screen confirms success; a duplicate scan shows a warning instead of checking them in twice.',
        image: '/docs/checkin-success.png',
      },
      {
        title: '3. Watch arrivals live on the Dashboard',
        body: 'The Dashboard shows a live feed of check-ins as they happen, along with attendance stats for the event.',
        image: '/docs/checkin-dashboard.png',
      },
    ],
  },
  {
    id: 'whatsapp',
    title: 'Sending WhatsApp messages',
    description: 'Send guest passes and reminders directly to guests over WhatsApp.',
    steps: [
      {
        title: '1. Pick an event',
        body: 'Open WhatsApp in the sidebar and select the event you want to message guests for.',
        image: '/docs/whatsapp-event-picker.png',
      },
      {
        title: '2. Send to one guest or in bulk',
        body: 'Send a pass to an individual guest from their row, or use "Send to all" to bulk-send to every guest with a phone number who hasn\'t received one yet.',
        image: '/docs/whatsapp-bulk-send.png',
      },
      {
        title: '3. Set up automatic reminders',
        body: 'Go to Reminders to schedule WhatsApp reminders (e.g. "1 day before") that send automatically using an approved template.',
        image: '/docs/whatsapp-reminders.png',
      },
    ],
  },
  {
    id: 'templates',
    title: 'Managing WhatsApp templates',
    description: 'Templates must be approved in Meta WhatsApp Business before they can be used to message guests.',
    steps: [
      {
        title: '1. Open Templates',
        body: 'Go to Settings → Templates. This lists every WhatsApp template available to your account, grouped by category.',
        image: '/docs/templates-list.png',
      },
      {
        title: '2. Add or edit a template',
        body: 'Click "+ Add template" or select an existing one. Use {{1}}, {{2}}, etc. as placeholders — these get filled in per guest (e.g. {{1}} = guest name).',
        image: '/docs/templates-edit.png',
      },
      {
        title: '3. Preview before saving',
        body: 'The preview bubble shows exactly how the message will look once placeholders are filled in, so you can catch mismatches before sending to guests.',
        image: '/docs/templates-preview.png',
      },
    ],
  },
  {
    id: 'team',
    title: 'Managing your team',
    description: 'Invite teammates and control what they can see and do.',
    steps: [
      {
        title: '1. Invite a teammate',
        body: 'Go to Team (super admins only) and click "+ Add user". Assign a role to control their access level.',
        image: '/docs/team-add-user.png',
      },
      {
        title: '2. Understand the roles',
        body: 'Viewer can only view data. Event Manager can create/edit events and guests. Super Admin has full access, including team management and templates.',
      },
    ],
  },
]

function ImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="relative max-h-full max-w-3xl overflow-hidden rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:opacity-80"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block max-h-[80vh] w-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      </div>
    </div>
  )
}

function StepRow({ step }: { step: Step }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-start gap-4 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{step.title}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{step.body}</p>
        </div>
        {step.image && (
          <button onClick={() => setOpen(true)}
            className="flex flex-shrink-0 flex-col items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            View screenshot
          </button>
        )}
      </div>
      {open && step.image && (
        <ImageModal src={step.image} alt={step.title} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function SectionCard({ section, defaultOpen }: { section: Section; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen)

  return (
    <div id={section.id} className="overflow-hidden rounded-xl scroll-mt-6" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
      <button onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:opacity-90">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{section.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{section.description}</p>
        </div>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
          style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="px-5 pb-2" style={{ borderTop: '1px solid var(--line)' }}>
          {section.steps.map((step, i) => (
            <StepRow key={i} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocsPage() {
  return (
    <div className="px-6 py-6 lg:px-8 lg:py-7">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Docs &amp; How-To</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
          A quick guide to setting up events, managing guests, and sending WhatsApp messages.
        </p>
      </div>

      {/* Quick nav */}
      <div className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            {s.title}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section, i) => (
          <SectionCard key={section.id} section={section} defaultOpen={i === 0} />
        ))}
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--muted-2)' }}>
        Screenshots not loading? Drop image files into <code>frontend/public/docs/</code> matching the paths referenced in this page.
      </p>
    </div>
  )
}
