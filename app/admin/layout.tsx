'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/dashboard',          label: 'Dashboard',   icon: '⊟' },
  { href: '/admin/events',             label: 'Events',      icon: '◫' },
  { href: '/admin/guests',             label: 'Guest List',  icon: '◉' },
  { href: '/admin/guests/bulk-upload', label: 'Bulk Upload', icon: '⊕' },
  { href: '/admin/check-in',           label: 'Check-In',    icon: '⊛' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside className="hidden w-[220px] flex-shrink-0 flex-col lg:flex" style={{ background: 'var(--sidebar)' }}>
        <div className="flex h-full flex-col px-4 py-5">

          {/* Logo */}
          <Link href="/" className="mb-6 flex items-center gap-2.5 rounded-[12px] px-3 py-3 transition hover:bg-white/5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">GuestOps</p>
              <p className="mt-0.5 text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Event Management</p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5">
            {NAV.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition"
                  style={{
                    background: active ? 'rgba(109,129,150,0.25)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="font-medium">{label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.6)' }} />}
                </Link>
              )
            })}
          </nav>

          <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          {/* Add Guest CTA */}
          <Link
            href="/admin/guests/add"
            className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition hover:opacity-85"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            + Add New Guest
          </Link>

          {/* Bottom links */}
          <div className="mt-3 space-y-0.5">
            {[{ l: 'Settings', i: '⊙' }, { l: 'Support', i: '?' }].map(({ l, i }) => (
              <div key={l} className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 text-sm transition hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span>{i}</span><span>{l}</span>
              </div>
            ))}
          </div>

          {/* User tag */}
          <div className="mt-4 flex items-center gap-3 rounded-[12px] px-3 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>A</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">Admin User</p>
              <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>guestops.admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b px-6" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>GuestOps</span>
            </Link>
            <div className="hidden items-center gap-2 rounded-full px-4 py-1.5 text-sm sm:flex" style={{ background: 'var(--bg)', color: 'var(--muted-2)', border: '1px solid var(--line)', minWidth: '220px' }}>
              <span>⌕</span> Search guests, events…
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/check-in" className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-85" style={{ background: 'var(--brand)' }}>
              <span>⊛</span> Check-In Mode
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}>◎</div>
          </div>
        </div>

        {/* Page */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
