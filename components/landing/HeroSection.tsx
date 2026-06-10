import Link from 'next/link'

const mockGuests = [
  { initials: 'JD', bg: '#1a3ed4', name: 'Julianne Devis',  email: 'j.devis@enterprise.com', ticket: 'VIP Platinum', status: 'Checked-in', sc: '#16a34a', sb: '#dcfce7' },
  { initials: 'MK', bg: '#6b7280', name: 'Marcus Knight',   email: 'm.knight@techcorp.io',    ticket: 'General',     status: 'Pending',    sc: '#b45309', sb: '#fef3c7' },
  { initials: 'RL', bg: '#0f1b2d', name: 'Robert Lang',     email: 'r.lang@logistics.com',    ticket: 'VIP Platinum', status: 'Checked-in', sc: '#16a34a', sb: '#dcfce7' },
]

export function HeroSection() {
  return (
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

      <div className="mt-12 lg:mt-0">
        <div className="relative overflow-hidden rounded-[18px] shadow-2xl" style={{ border: '1px solid var(--line)', background: '#fff' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Guest Directory</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>Check-In Mode</span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-2)', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
            <span>Name</span><span>Ticket</span><span>Status</span>
          </div>
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
        <div className="mt-3 ml-auto w-fit rounded-[12px] px-4 py-2.5 shadow-lg" style={{ background: 'var(--ink)', color: '#fff' }}>
          <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>Avg. entry speed</p>
          <p className="text-xl font-bold">1.2s <span className="text-xs font-normal" style={{ color: 'rgba(255,255,255,0.50)' }}>ultra-fast QR</span></p>
        </div>
      </div>
    </section>
  )
}
