import Link from 'next/link'

export function LandingNav() {
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
          <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--ink)' }}>TWS E-GuestPass</span>
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
  )
}
