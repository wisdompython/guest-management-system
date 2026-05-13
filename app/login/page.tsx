'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/admin/dashboard')
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.')
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-lg font-bold text-white"
            style={{ background: 'var(--brand)' }}>
            T
          </div>
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--ink)' }}>TWS GuestOps</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Sign in to your account</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)' }} className="p-8">

          {error && (
            <div className="mb-5 px-4 py-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="w-full bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-sm font-semibold tracking-[0.06em] uppercase text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--brand)' }}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted-2)' }}>
          TWS GuestOps · Luxury Event Management
        </p>
      </div>
    </div>
  )
}
