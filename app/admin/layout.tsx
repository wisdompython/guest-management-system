'use client'

import { useAuth, useRequireAuth } from '@/lib/auth'
import { NavSidebar } from '@/components/admin/NavSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()

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
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <NavSidebar user={user} logout={logout} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
