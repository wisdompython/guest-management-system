import Link from 'next/link'

const features = [
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h7v7h-7z" strokeDasharray="2 2"/>
      </svg>
    ),
    title: 'Smart QR Check-In',
    body: 'Fast, secure entry with real-time verification. Duplicate scan detection keeps the door clean and queue-free.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    title: 'Branded Pass Designer',
    body: 'Upload event artwork, position the QR zone to the pixel, and generate fully personalised passes per guest.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Automated Delivery',
    body: 'Track which passes have been sent via WhatsApp and what still needs attention before doors open.',
  },
]

const mockGuests = [
  { initials: 'JD', bg: '#1a3ed4', name: 'Julianne Devis',  email: 'j.devis@enterprise.com', ticket: 'VIP Platinum', status: 'Checked-in', sc: '#16a34a', sb: '#dcfce7' },
  { initials: 'MK', bg: '#6b7280', name: 'Marcus Knight',   email: 'm.knight@techcorp.io',    ticket: 'General',     status: 'Pending',    sc: '#b45309', sb: '#fef3c7' },
  { initials: 'RL', bg: '#0f1b2d', name: 'Robert Lang',     email: 'r.lang@logistics.com',    ticket: 'VIP Platinum', status: 'Checked-in', sc: '#16a34a', sb: '#dcfce7' },
]

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>

      {/* ── Nav ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--ink)' }}>GuestOps</span>
            <span className="hidden text-xs font-medium sm:block" style={{ color: 'var(--muted-2)' }}>GMS</span>
          </div>
          <nav className="hidden items-center gap-8 sm:flex">
            {['Product', 'Features', 'Enterprise', 'Pricing'].map(l => (
              <span key={l} className="cursor-pointer text-sm font-medium transition hover:opacity-60" style={{ color: 'var(--ink-2)' }}>{l}</span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-sm sm:flex" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Search guests...
            </div>
            <Link href="/admin/check-in" className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              Check-In Mode
            </Link>
            <div className="hidden h-8 w-8 items-center justify-center rounded-full sm:flex" style={{ background: 'var(--brand)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>A</div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:px-10 lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-14 lg:pb-20 lg:pt-24">
        <div className="pt-2">
          <div className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            THE PROFESSIONAL CHOICE
          </div>
          <h1 className="text-[44px] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[52px]" style={{ color: 'var(--ink)' }}>
            Seamless Guest<br />
            Experiences,<br />
            <span className="grad-text">Mastered.</span>
          </h1>
          <p className="mt-5 max-w-sm text-base leading-7" style={{ color: 'var(--muted)' }}>
            Empower your high-stakes events with instant QR check-ins, fully branded digital passes, and automated communication workflows.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/admin/dashboard" className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
              Get Started
            </Link>
            <Link href="/admin/guests" className="flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:bg-white" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
              Watch Demo
            </Link>
          </div>
        </div>

        {/* Mockup card */}
        <div className="mt-12 lg:mt-0">
          <div className="relative overflow-hidden rounded-[18px] shadow-2xl" style={{ border: '1px solid var(--line)', background: '#fff' }}>
            {/* Mockup header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Guest Directory</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>Check-In Mode</span>
              </div>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-2)', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
              <span>Name</span><span>Ticket</span><span>Status</span>
            </div>
            {/* Rows */}
            {mockGuests.map((g) => (
              <div key={g.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: g.bg }}>{g.initials}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{g.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--muted-2)' }}>{g.email}</p>
                  </div>
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{g.ticket}</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: g.sb, color: g.sc }}>{g.status}</span>
              </div>
            ))}
            <div className="px-5 py-3 text-xs" style={{ color: 'var(--muted-2)' }}>Showing 1 to 3 of 248 guests</div>
          </div>
          {/* Speed badge */}
          <div className="mt-3 ml-auto w-fit rounded-[12px] px-4 py-2.5 shadow-lg" style={{ background: 'var(--ink)', color: '#fff' }}>
            <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>Avg. entry speed</p>
            <p className="text-xl font-bold">1.2s <span className="text-xs font-normal" style={{ color: 'rgba(255,255,255,0.50)' }}>ultra-fast QR</span></p>
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Engineered for Excellence</h2>
          <p className="mx-auto mt-3 max-w-md text-base" style={{ color: 'var(--muted)' }}>
            Powerful tools designed to simplify the complex logistics of guest management.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map(({ icon, title, body }) => (
            <div key={title} className="rounded-[16px] p-7" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                {icon}
              </div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{title}</h3>
              <p className="mt-2.5 text-sm leading-6" style={{ color: 'var(--muted)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Split section ── */}
      <section style={{ background: '#fff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <h2 className="text-3xl font-bold leading-snug" style={{ color: 'var(--ink)' }}>
              Total Visibility into<br />Your Guest Ecosystem
            </h2>
            <div className="mt-8 space-y-6">
              {[
                { title: 'Admin Dashboard', body: 'Monitor arrival rates, VIP alerts, and capacity status in real time from a single command center.' },
                { title: 'Guest List Management', body: 'Intelligent search, categorisation, and mass-action tools to handle lists of thousands in seconds.' },
              ].map(({ title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: 'var(--brand-soft)' }}>
                    <div className="h-2 w-2 rounded-sm" style={{ background: 'var(--brand)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
                    <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/dashboard" className="mt-8 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
              Open Dashboard
            </Link>
          </div>

          {/* Mini mockup */}
          <div className="mt-12 overflow-hidden rounded-[16px] shadow-xl lg:mt-0" style={{ border: '1px solid var(--line)' }}>
            <div className="px-5 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
              Guest List
              <span className="ml-2 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--brand)', color: '#fff' }}>+ Add Guest</span>
              <span className="ml-2 text-xs font-medium" style={{ color: 'var(--brand)' }}>Export</span>
            </div>
            {[
              { n: 'Jonathan Doe', e: 'j.doe@enterprise.com', s: 'CHECKED IN', sc: '#16a34a', sb: '#dcfce7' },
              { n: 'Alice Smith',  e: 'a.smith@globaltech.co', s: 'PENDING',    sc: '#b45309', sb: '#fef3c7' },
              { n: 'Marcus Reed', e: 'm.reed@venture.co',     s: 'CHECKED IN', sc: '#16a34a', sb: '#dcfce7' },
            ].map(({ n, e, s, sc, sb }) => (
              <div key={n} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{n}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-2)' }}>{e}</p>
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: sb, color: sc }}>{s}</span>
              </div>
            ))}
            <div className="px-5 py-3.5" style={{ background: 'var(--bg)' }}>
              <div className="mb-1.5 flex justify-between text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                <span style={{ color: 'var(--muted)' }}>CHECK-IN PROGRESS</span>
                <span>72.4%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
                <div className="h-full rounded-full" style={{ width: '72.4%', background: 'var(--brand)' }} />
              </div>
              <p className="mt-1.5 text-xs font-medium" style={{ color: '#16a34a' }}>+5.2% from last hour</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="rounded-[20px] px-10 py-16 text-center" style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2e4a 60%, #1a3ed4 100%)' }}>
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
            Ready to elevate your event?
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Join event teams worldwide and streamline your guest management process today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/admin/dashboard" className="rounded-lg px-7 py-3 text-sm font-semibold transition hover:opacity-90" style={{ background: '#fff', color: 'var(--brand)' }}>
              Open Dashboard
            </Link>
            <Link href="/admin/guests/bulk-upload" className="rounded-lg border px-7 py-3 text-sm font-semibold transition hover:bg-white/10" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
              Import Guest List
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#fff', borderTop: '1px solid var(--line)' }}>
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 lg:grid lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>GuestOps GMS</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-6" style={{ color: 'var(--muted)' }}>
              The enterprise standard for high-stakes event guest management. Built for precision and scale.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-2)' }}>Platform</p>
            {['Dashboard', 'Guest List', 'Bulk Upload', 'Check-In Scanner'].map(l => (
              <Link key={l} href="/admin/dashboard" className="mb-2 block text-sm transition hover:opacity-60" style={{ color: 'var(--muted)' }}>{l}</Link>
            ))}
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-2)' }}>Resources</p>
            {['Documentation', 'Support Center', 'Security', 'Privacy Policy'].map(l => (
              <Link key={l} href="/admin/dashboard" className="mb-2 block text-sm transition hover:opacity-60" style={{ color: 'var(--muted)' }}>{l}</Link>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-4 sm:px-10 flex justify-between" style={{ borderTop: '1px solid var(--line)' }}>
          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>© 2026 GuestOps GMS. All rights reserved.</p>
          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>Terms of Service · Cookie Policy</p>
        </div>
      </footer>

    </div>
  )
}
