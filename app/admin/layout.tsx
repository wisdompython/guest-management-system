'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', code: '01' },
  { href: '/admin/events', label: 'Events', code: '02' },
  { href: '/admin/guests', label: 'Guests', code: '03' },
  { href: '/admin/guests/bulk-upload', label: 'Bulk Upload', code: '04' },
  { href: '/admin/check-in', label: 'Check-In', code: '05' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="app-shell min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">

      {/* Sidebar */}
      <aside className="border-b border-white/5 px-3 py-3 lg:border-b-0 lg:border-r lg:border-white/5 lg:px-4 lg:py-4">
        <div className="shell-panel flex h-full flex-col rounded-[28px] p-4 text-white">

          {/* Logo */}
          <Link href="/" className="block rounded-[20px] px-4 py-4 transition hover:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/30">GuestOps</p>
            <p className="mt-2 font-display text-2xl leading-none text-white">Admin</p>
          </Link>

          {/* Nav */}
          <nav className="mt-4 flex-1 space-y-0.5">
            {NAV.map(({ href, label, code }) => {
              const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-between rounded-[16px] px-4 py-2.5 text-sm transition ${
                    active
                      ? 'bg-[var(--brand)] text-white'
                      : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  <span className={`text-[10px] ${active ? 'text-white/60' : 'text-white/20'}`}>{code}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer hint */}
          <div className="mt-4 rounded-[20px] border border-white/5 bg-black/20 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/25">Door status</p>
            <p className="mt-2 text-lg font-semibold text-white">Ready</p>
            <p className="mt-1 text-xs leading-5 text-white/30">Use check-in mode for a focused scanning screen during live entry.</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0">
        <div className="mx-auto max-w-7xl px-3 py-3 lg:px-5 lg:py-5">
          <div className="admin-panel min-h-[calc(100vh-2rem)] rounded-[28px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
