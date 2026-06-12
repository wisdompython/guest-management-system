'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuth, useRequireAuth } from '@/lib/auth'

const input = 'w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]'
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }
const label = 'block text-xs font-semibold uppercase tracking-[0.16em] mb-1.5'

export default function ProfilePage() {
  useRequireAuth()
  const { user, loading: authLoading } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email || '')
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (password && password !== confirm) { setError('Passwords do not match.'); return }
    if (password && password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      const payload: Record<string, string> = { first_name: firstName, last_name: lastName, email }
      if (password) payload.password = password
      await api.updateUser(user!.id, payload)
      setPassword(''); setConfirm('')
      setSuccess('Profile updated successfully.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  if (authLoading || !user) return null

  const initial = (user.first_name?.[0] || user.username[0]).toUpperCase()
  const displayName = user.first_name ? `${user.first_name} ${user.last_name}` : user.username

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-xl">
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--line)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>Account</p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>My Profile</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Update your name, email, and password.</p>
      </div>

      {/* Avatar + role */}
      <div className="flex items-center gap-4 mb-8 p-4 rounded-[12px]" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ background: 'var(--brand)' }}>{initial}</div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{displayName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{user.username} · {user.role_display}</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[12px] px-4 py-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-[12px] px-4 py-3 text-sm font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-[12px] p-5 space-y-4" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-2)' }}>Personal info</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} style={{ color: 'var(--muted)' }}>First name</label>
              <input className={input} style={inputStyle} value={firstName}
                onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--muted)' }}>Last name</label>
              <input className={input} style={inputStyle} value={lastName}
                onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label} style={{ color: 'var(--muted)' }}>Email</label>
            <input type="email" className={input} style={inputStyle} value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="rounded-[12px] p-5 space-y-4" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-2)' }}>Change password</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Leave blank to keep your current password.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} style={{ color: 'var(--muted)' }}>New password</label>
              <input type="password" className={input} style={inputStyle} value={password}
                placeholder="Min 8 characters"
                onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--muted)' }}>Confirm password</label>
              <input type="password" className={input} style={inputStyle} value={confirm}
                placeholder="Repeat new password"
                onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--brand)' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
