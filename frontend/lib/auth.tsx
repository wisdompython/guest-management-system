'use client'

import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { api, AuthUser, UserRole } from './api'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  // Role helpers
  isSuperAdmin: boolean
  isEventManager: boolean   // event_manager OR super_admin
  isCheckInStaff: boolean   // check_in_staff OR above
  can: (minRole: UserRole) => boolean
}

const ROLE_RANK: Record<UserRole, number> = {
  super_admin:    4,
  event_manager:  3,
  check_in_staff: 2,
  viewer:         1,
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // On mount, try to restore session from the backend
  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password)
    setUser(u)
    // Navigation is handled by the calling page (supports ?next= redirect)
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
    router.replace('/login')
  }, [router])

  const can = useCallback((minRole: UserRole) => {
    if (!user) return false
    return (ROLE_RANK[user.role] ?? 0) >= (ROLE_RANK[minRole] ?? 0)
  }, [user])

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    isSuperAdmin:   user?.role === 'super_admin',
    isEventManager: can('event_manager'),
    isCheckInStaff: can('check_in_staff'),
    can,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Redirects to /login if not authenticated. Use in admin pages. */
export function useRequireAuth(minRole?: UserRole) {
  const { user, loading, can } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (minRole && !can(minRole)) { router.replace('/admin/dashboard'); return }
  }, [user, loading, minRole, can, router])

  return { user, loading }
}
