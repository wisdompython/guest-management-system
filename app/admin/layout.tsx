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
    <div className="app-shell min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-white/8 px-4 py-4 lg:border-b-0 lg:border-r lg:border-r-white/8 lg:px-5 lg:py-5">
        <div className="shell-panel flex h-full flex-col rounded-[32px] p-4 text-white lg:p-5">
          <Link href="/" className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-4 transition hover:bg-white/8">
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--shell-muted)]">GuestOps</p>
            <p className="mt-2 font-display text-3xl leading-none text-white">Admin</p>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Operations for events, guests, delivery, and door flow.</p>
          </Link>
          <nav className="mt-5 flex-1 space-y-2">
            {NAV.map(({ href, label, code }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between rounded-[22px] px-4 py-3 text-sm transition ${
                  active
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--shell-muted)] hover:bg-white/6 hover:text-white'
                }`}
              >
                <span className="font-medium">{label}</span>
                <span className={`text-xs ${active ? 'text-white/70' : 'text-[var(--shell-muted)]'}`}>{code}</span>
              </Link>
            )
          })}
          </nav>
          <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--shell-muted)]">Door status</p>
            <p className="mt-3 text-2xl font-semibold text-white">Ready</p>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">Use check-in mode for a cleaner, focused scanning screen during live entry.</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-5">
          <div className="admin-panel min-h-[calc(100vh-2rem)] rounded-[32px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
