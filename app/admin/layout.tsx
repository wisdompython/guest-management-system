'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/dashboard',          label: 'Dashboard',        icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: '/admin/events',             label: 'Events',           icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { href: '/admin/guests',             label: 'Guest List',       icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/admin/guests/bulk-upload', label: 'Bulk Upload',      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
  { href: '/admin/check-in',           label: 'Check-In Scanner', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3" rx="0.5"/><rect x="14" y="7" width="3" height="3" rx="0.5"/><rect x="7" y="14" width="3" height="3" rx="0.5"/></svg> },
  { href: '/admin/fonts',              label: 'Font Library',     icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg> },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside className="hidden w-[230px] flex-shrink-0 flex-col lg:flex" style={{ background: 'var(--sidebar)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex h-full flex-col px-4 py-5">

          {/* Brand */}
          <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">GuestOps</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Enterprise Guest Management</p>
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
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  style={{
                    background: active ? 'var(--brand)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.50)',
                  }}
                >
                  <span className="flex-shrink-0" style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          {/* Add guest CTA */}
          <Link
            href="/admin/guests/add"
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add New Guest
          </Link>

          {/* Bottom links */}
          <div className="mt-3 space-y-0.5">
            {[
              { l: 'Settings', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
              { l: 'Support',  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg> },
            ].map(({ l, icon }) => (
              <div key={l} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {icon}<span>{l}</span>
              </div>
            ))}
          </div>

          {/* User */}
          <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>A</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">Admin User</p>
              <p className="truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>eventmaster.admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar */}
        <div className="flex h-[56px] flex-shrink-0 items-center justify-between border-b px-6" style={{ background: '#fff', borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>G</div>
            </Link>
            <div className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--muted-2)', minWidth: '240px', background: 'var(--bg)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Search guests, email or table...
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/check-in" className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              Check-In Mode
            </Link>
            <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-sm transition hover:bg-gray-50" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold text-white" style={{ background: 'var(--brand)', borderColor: 'var(--brand)' }}>A</div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="min-h-full rounded-[16px]" style={{ background: '#fff', border: '1px solid var(--line)' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
