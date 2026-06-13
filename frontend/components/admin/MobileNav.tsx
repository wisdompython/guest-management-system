'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { AuthUser } from '@/lib/api'

const Ic = {
  grid:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  scanner:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3" rx="0.5"/><rect x="14" y="7" width="3" height="3" rx="0.5"/><rect x="7" y="14" width="3" height="3" rx="0.5"/></svg>,
  events:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  guests:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  design:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  whatsapp:  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  reminders: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  team:      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 15c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z"/><circle cx="12" cy="8" r="4"/></svg>,
  templates: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  upload:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  logout:   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  close:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
}

const NAV_GROUPS = [
  { label: 'LIVE', items: [
    { href: '/admin/dashboard',  label: 'Dashboard',     icon: Ic.grid },
    { href: '/admin/check-in',   label: 'Scanner',       icon: Ic.scanner },
  ]},
  { label: 'PLAN', items: [
    { href: '/admin/events',             label: 'Events',        icon: Ic.events },
    { href: '/admin/guests',             label: 'Guests',        icon: Ic.guests },
    { href: '/admin/guests/bulk-upload', label: 'Bulk Upload',   icon: Ic.upload,  minRole: 'event_manager' as const },
    { href: '/admin/fonts',              label: 'Pass Designer', icon: Ic.design,  minRole: 'event_manager' as const },
  ]},
  { label: 'COMMS', items: [
    { href: '/admin/whatsapp',  label: 'WhatsApp',  icon: Ic.whatsapp },
    { href: '/admin/reminders', label: 'Reminders', icon: Ic.reminders },
  ]},
  { label: 'ADMIN', items: [
    { href: '/admin/users',              label: 'Team',      icon: Ic.team,      minRole: 'super_admin' as const },
    { href: '/admin/settings/templates', label: 'Templates', icon: Ic.templates, minRole: 'super_admin' as const },
  ]},
]

interface Props {
  user: AuthUser
  logout: () => void
  open: boolean
  onClose: () => void
}

export function MobileNav({ user, logout, open, onClose }: Props) {
  const pathname = usePathname()
  const { can } = useAuth()
  const initial = (user.first_name?.[0] || user.username[0]).toUpperCase()
  const displayName = user.first_name ? `${user.first_name} ${user.last_name}` : user.username

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 lg:hidden"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col lg:hidden"
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--line)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold"
              style={{ background: 'var(--brand)', color: '#0d1016' }}>T</div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>TWS E-GuestPass</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}>
            {Ic.close}
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map(({ label, items }) => {
            const visible = items.filter(({ minRole }) => !minRole || can(minRole))
            if (!visible.length) return null
            return (
              <div key={label}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.14em]"
                  style={{ color: 'var(--muted-2)' }}>{label}</p>
                <div className="space-y-0.5">
                  {visible.map(({ href, label: itemLabel, icon }) => {
                    const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
                    return (
                      <Link key={href} href={href} onClick={onClose}
                        className="flex items-center gap-3 rounded px-3 py-2.5 text-[14px] transition-colors"
                        style={{
                          background: active ? 'var(--brand-soft)' : 'transparent',
                          color: active ? 'var(--brand)' : 'var(--muted)',
                        }}>
                        <span style={{ opacity: active ? 1 : 0.7, color: active ? 'var(--brand)' : 'inherit' }}>
                          {icon}
                        </span>
                        <span>{itemLabel}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* User footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{initial}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{displayName}</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{user.username}</p>
            </div>
            <button onClick={() => { logout(); onClose() }} title="Sign out"
              className="flex-shrink-0 transition-opacity hover:opacity-60"
              style={{ color: 'var(--muted-2)' }}>
              {Ic.logout}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
