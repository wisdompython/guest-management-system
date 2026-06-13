import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer style={{ background: '#fff', borderTop: '1px solid var(--line)' }}>
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 lg:grid lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
            <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>TWS E-GuestPass</span>
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
        <p className="text-xs" style={{ color: 'var(--muted-2)' }}>© 2026 TWS E-GuestPass. All rights reserved.</p>
        <p className="text-xs" style={{ color: 'var(--muted-2)' }}>Terms of Service · Cookie Policy</p>
      </div>
    </footer>
  )
}
