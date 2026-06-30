'use client'

import { useState } from 'react'
import { useAuth, useRequireAuth } from '@/lib/auth'
import { NavSidebar } from '@/components/admin/NavSidebar'
import { MobileNav } from '@/components/admin/MobileNav'
import { TourProvider } from '@/components/tour/TourProvider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useRequireAuth()

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: 'var(--brand)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <TourProvider>
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <NavSidebar user={user} logout={logout} />

      {/* Mobile nav drawer */}
      <MobileNav user={user} logout={logout} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 lg:hidden"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold"
              style={{ background: 'var(--brand)', color: '#0d1016' }}>T</div>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>TWS E-GuestPass</span>
          </div>
          <button onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center transition hover:opacity-70"
            style={{ color: 'var(--muted)' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </TourProvider>
  )
}
