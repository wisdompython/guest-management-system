import Link from 'next/link'

const features = [
  {
    icon: '⊞',
    title: 'Smart QR Check-In',
    body: 'Fast, secure entry with real-time verification. Duplicate scan detection keeps the door clean.',
  },
  {
    icon: '◈',
    title: 'Branded Pass Designer',
    body: 'Upload event artwork, drop the QR zone exactly where you want it, generate passes per guest.',
  },
  {
    icon: '◎',
    title: 'Automated Delivery',
    body: 'Track which passes have been sent via WhatsApp and what still needs attention before doors open.',
  },
]

const mockGuests = [
  { initials: 'JD', color: '#6D8196', name: 'Julianne Devis', email: 'j.devis@enterprise.com', ticket: 'VIP', status: 'Checked-in', statusColor: '#16a34a', statusBg: '#dcfce7' },
  { initials: 'MK', color: '#888880', name: 'Marcus Knight',  email: 'm.knight@techcorp.io',   ticket: 'General', status: 'Pending', statusColor: '#ca8a04', statusBg: '#fef9c3' },
  { initials: 'RL', color: '#4A4A4A', name: 'Robert Lang',    email: 'r.lang@logistics.com',   ticket: 'VIP', status: 'Checked-in', statusColor: '#16a34a', statusBg: '#dcfce7' },
]

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* ── Top Nav ── */}
      <header style={{ borderBottom: '1px solid var(--line)', background: 'rgba(250,250,248,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold" style={{ background: 'var(--brand)', color: '#fff' }}>G</div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>GuestOps</span>
          </div>
          <nav className="hidden items-center gap-7 sm:flex">
            {['Features', 'Dashboard', 'Check-In'].map(l => (
              <span key={l} className="text-sm cursor-pointer transition hover:opacity-60" style={{ color: 'var(--muted)' }}>{l}</span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="hidden rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-70 sm:block" style={{ color: 'var(--ink)' }}>
              Sign in
            </Link>
            <Link href="/admin/dashboard" className="rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-85" style={{ background: 'var(--brand)', color: '#fff' }}>
              Open Admin
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-20 sm:px-10 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-28">
        {/* Left copy */}
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ background: 'rgba(109,129,150,0.10)', color: 'var(--brand)' }}>
            Guest experience ops
          </div>
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
            Seamless Guest<br />
            <span className="grad-text">Experiences,</span><br />
            Mastered.
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 font-light" style={{ color: 'var(--muted)' }}>
            Instant QR check-ins, fully branded digital passes, and automated WhatsApp delivery — the guest management workflow that keeps your team calm before doors open.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin/dashboard" className="rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-85"
              style={{ background: 'var(--brand)' }}>
              Get Started
            </Link>
            <Link href="/admin/guests/bulk-upload" className="flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-white"
              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
              <span className="text-base">▷</span> Import Guests
            </Link>
          </div>
          {/* Social proof */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['#6D8196','#888880','#4A4A4A','#a0b4c4'].map((c,i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white" style={{ background: c }}>
                  {['A','B','C','D'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Trusted by event teams worldwide</p>
          </div>
        </div>

        {/* Right — UI mockup */}
        <div className="mt-14 lg:mt-0">
          <div className="relative rounded-[24px] p-1.5 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(109,129,150,0.30) 0%, rgba(203,203,203,0.20) 100%)', boxShadow: '0 32px 80px rgba(109,129,150,0.22)' }}>
            <div className="rounded-[20px] overflow-hidden" style={{ background: '#fff', border: '1px solid var(--line)' }}>
              {/* Mock topbar */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Guest Directory</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-xs font-semibold" style={{ background: 'var(--brand)', color: '#fff', padding: '3px 10px', borderRadius: '20px' }}>Check-In Mode</span>
                </div>
              </div>
              {/* Mock rows */}
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                {mockGuests.map((g) => (
                  <div key={g.name} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0" style={{ background: g.color }}>{g.initials}</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{g.name}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-2)' }}>{g.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:block" style={{ background: 'rgba(109,129,150,0.10)', color: 'var(--brand)' }}>{g.ticket}</span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: g.statusBg, color: g.statusColor }}>{g.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Mock footer */}
              <div className="px-5 py-3 text-xs" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted-2)' }}>
                Showing 1–3 of 248 guests
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-4 -right-4 hidden rounded-[14px] px-4 py-3 shadow-xl lg:block"
            style={{ background: 'var(--ink)', color: '#fff', position: 'relative', marginTop: '-32px', marginLeft: 'auto', width: 'fit-content' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Avg. entry time</p>
            <p className="text-lg font-bold">1.2s</p>
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <div style={{ background: 'var(--ink)' }}>
        <div className="mx-auto grid max-w-6xl grid-cols-3 px-6 py-14 sm:px-10">
          {[
            { value: '1M+',   label: 'Guests Managed' },
            { value: '99.9%', label: 'Delivery Rate' },
            { value: '100+',  label: 'Events Run' },
          ].map(({ value, label }) => (
            <div key={value} className="text-center">
              <p className="font-display text-4xl font-bold text-white sm:text-5xl">{value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--brand)' }}>What the team gets</p>
          <h2 className="font-display text-4xl" style={{ color: 'var(--ink)' }}>Engineered for smooth events.</h2>
          <p className="mx-auto mt-4 max-w-md text-base font-light leading-7" style={{ color: 'var(--muted)' }}>
            Powerful tools designed to simplify the logistics of guest management, from upload to check-in.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map(({ icon, title, body }) => (
            <div key={title} className="rounded-[20px] p-7 transition hover:-translate-y-0.5"
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[14px] text-xl" style={{ background: 'rgba(109,129,150,0.10)', color: 'var(--brand)' }}>
                {icon}
              </div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{title}</h3>
              <p className="mt-2.5 text-sm leading-7 font-light" style={{ color: 'var(--muted)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Split feature section ── */}
      <section style={{ background: 'var(--panel)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: 'var(--brand)' }}>Total visibility</p>
            <h2 className="font-display text-4xl leading-tight" style={{ color: 'var(--ink)' }}>
              Total visibility into<br />your guest ecosystem.
            </h2>
            <div className="mt-8 space-y-5">
              {[
                { title: 'Live Dashboard', body: 'Monitor arrival rates, VIP alerts, and capacity status in real time from a single command center.' },
                { title: 'Guest List Management', body: 'Intelligent search, categorisation, and bulk actions to handle lists of thousands in seconds.' },
              ].map(({ title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: 'var(--brand)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
                    <p className="mt-1 text-sm leading-6 font-light" style={{ color: 'var(--muted)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/dashboard" className="mt-8 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-85"
              style={{ background: 'var(--brand)' }}>
              Open Dashboard →
            </Link>
          </div>
          {/* Mini dashboard mockup */}
          <div className="mt-12 lg:mt-0">
            <div className="rounded-[20px] overflow-hidden shadow-xl" style={{ border: '1px solid var(--line)' }}>
              <div className="px-5 py-4 text-sm font-semibold" style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
                Guest List
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
                {[
                  { n: 'Jonathan Doe', e: 'j.doe@enterprise.com', s: 'CHECKED IN', sc: '#16a34a', sb: '#dcfce7' },
                  { n: 'Alice Smith',  e: 'a.smith@globaltech.co', s: 'PENDING',    sc: '#ca8a04', sb: '#fef9c3' },
                  { n: 'Marcus Reed', e: 'm.reed@venture.co',     s: 'CHECKED IN', sc: '#16a34a', sb: '#dcfce7' },
                ].map(({ n, e, s, sc, sb }) => (
                  <div key={n} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{n}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-2)' }}>{e}</p>
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: sb, color: sc }}>{s}</span>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div className="px-5 py-4" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="mb-2 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="font-semibold uppercase tracking-widest">Check-in progress</span>
                  <span className="font-bold" style={{ color: 'var(--ink)' }}>72.4%</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                  <div className="h-full rounded-full" style={{ width: '72.4%', background: 'linear-gradient(90deg, var(--brand), #a0b4c4)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <div className="rounded-[28px] px-10 py-16 text-center"
          style={{
            background: 'linear-gradient(135deg, var(--ink) 0%, #3a3a3a 60%, var(--brand-strong) 100%)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          }}>
          <h2 className="font-display text-4xl text-white sm:text-5xl">
            Ready to elevate<br />
            <span className="grad-text">your next event?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-base font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Get your guest list, passes, and check-in flow running in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/admin/dashboard" className="rounded-full px-7 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ background: '#fff', color: 'var(--ink)' }}>
              Open Dashboard
            </Link>
            <Link href="/admin/guests/bulk-upload" className="rounded-full border px-7 py-3 text-sm font-semibold transition hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.80)' }}>
              Import Guest List
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--line)' }}>
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 lg:grid lg:grid-cols-[1fr_1fr_1fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>GuestOps</span>
            </div>
            <p className="mt-3 max-w-xs text-sm font-light leading-6" style={{ color: 'var(--muted)' }}>
              The guest management workflow for event teams that care about the details.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--muted)' }}>Platform</p>
            {['Dashboard', 'Guest List', 'Bulk Upload', 'Check-In'].map(l => (
              <Link key={l} href="/admin/dashboard" className="block mb-2 text-sm font-light transition hover:opacity-60" style={{ color: 'var(--ink)' }}>{l}</Link>
            ))}
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--muted)' }}>Resources</p>
            {['Add Guest', 'Events', 'Check-In Scanner'].map(l => (
              <Link key={l} href="/admin/dashboard" className="block mb-2 text-sm font-light transition hover:opacity-60" style={{ color: 'var(--ink)' }}>{l}</Link>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-5 sm:px-10 flex items-center justify-between" style={{ borderTop: '1px solid var(--line)' }}>
          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>© 2026 GuestOps. All rights reserved.</p>
          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>Privacy · Terms</p>
        </div>
      </footer>

    </div>
  )
}
