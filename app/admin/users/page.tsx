'use client'

import { useState, useEffect } from 'react'
import { api, AuthUser, UserRole, CreateUserPayload } from '@/lib/api'
import { useAuth, useRequireAuth } from '@/lib/auth'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin',    label: 'Super Admin' },
  { value: 'event_manager',  label: 'Event Manager' },
  { value: 'check_in_staff', label: 'Check-In Staff' },
  { value: 'viewer',         label: 'Viewer' },
]

const ROLE_STYLE: Record<UserRole, { color: string; bg: string }> = {
  super_admin:    { color: '#92400e', bg: '#fef3c7' },
  event_manager:  { color: '#1e40af', bg: '#dbeafe' },
  check_in_staff: { color: '#065f46', bg: '#d1fae5' },
  viewer:         { color: '#374151', bg: '#f3f4f6' },
}

const ROLE_DESC: Record<UserRole, string> = {
  super_admin:    'Full access — manage users, roles, events, guests, settings.',
  event_manager:  'Create/edit events and manage guests. Cannot manage users.',
  check_in_staff: 'Can perform check-ins and view guest list. Read-only otherwise.',
  viewer:         'Read-only access across everything. No mutations allowed.',
}

const field = 'w-full bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const fieldStyle = { border: '1px solid var(--line)', color: 'var(--ink)' }
const labelCls = 'block text-xs font-semibold uppercase tracking-[0.16em] mb-1.5'

const EMPTY_FORM: CreateUserPayload = {
  username: '', email: '', first_name: '', last_name: '', role: 'viewer', password: '',
}

export default function UsersPage() {
  useRequireAuth('super_admin')
  const { user: me } = useAuth()

  const [users, setUsers]       = useState<AuthUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<CreateUserPayload>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // Edit role inline
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('viewer')
  const [savingId, setSavingId]       = useState<number | null>(null)
  const [deletingId, setDeletingId]   = useState<number | null>(null)

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof CreateUserPayload>(key: K, val: CreateUserPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const created = await api.createUser(form)
      setUsers((u) => [...u, created])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRoleSave(userId: number) {
    setSavingId(userId)
    try {
      const updated = await api.updateUser(userId, { role: editingRole })
      setUsers((u) => u.map((x) => x.id === userId ? updated : x))
      setEditingId(null)
    } catch { /* ignore */ }
    finally { setSavingId(null) }
  }

  async function handleToggleActive(user: AuthUser) {
    setSavingId(user.id)
    try {
      const updated = await api.updateUser(user.id, { is_active: !user.is_active })
      setUsers((u) => u.map((x) => x.id === user.id ? updated : x))
    } catch { /* ignore */ }
    finally { setSavingId(null) }
  }

  async function handleDelete(user: AuthUser) {
    if (!confirm(`Permanently delete ${user.username}?`)) return
    setDeletingId(user.id)
    try {
      await api.deleteUser(user.id)
      setUsers((u) => u.filter((x) => x.id !== user.id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10">

      {/* Header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--line)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>Administration</p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>Users & Roles</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Manage who can access the platform and what they can do.</p>
      </div>

      {/* Role legend */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map(({ value, label }) => (
          <div key={value} className="px-4 py-3" style={{ border: '1px solid var(--line)', background: '#fff' }}>
            <span className="inline-block mb-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold"
              style={{ background: ROLE_STYLE[value].bg, color: ROLE_STYLE[value].color }}>
              {label}
            </span>
            <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>{ROLE_DESC[value]}</p>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)', background: '#fff' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{users.length} users</p>
          <button
            onClick={() => { setShowForm((s) => !s); setFormError('') }}
            className="px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}
          >
            {showForm ? 'Cancel' : '+ Invite User'}
          </button>
        </div>

        {/* Invite form */}
        {showForm && (
          <form onSubmit={handleCreate} className="px-5 py-5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
            {formError && (
              <div className="mb-4 px-4 py-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5' }}>
                {formError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={`${labelCls}`} style={{ color: 'var(--muted)' }}>Username *</label>
                <input value={form.username} onChange={(e) => setField('username', e.target.value)} required className={field} style={fieldStyle} />
              </div>
              <div>
                <label className={`${labelCls}`} style={{ color: 'var(--muted)' }}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={field} style={fieldStyle} />
              </div>
              <div>
                <label className={`${labelCls}`} style={{ color: 'var(--muted)' }}>Password *</label>
                <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} required minLength={8} className={field} style={fieldStyle} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className={`${labelCls}`} style={{ color: 'var(--muted)' }}>First Name</label>
                <input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} className={field} style={fieldStyle} />
              </div>
              <div>
                <label className={`${labelCls}`} style={{ color: 'var(--muted)' }}>Last Name</label>
                <input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} className={field} style={fieldStyle} />
              </div>
              <div>
                <label className={`${labelCls}`} style={{ color: 'var(--muted)' }}>Role *</label>
                <select value={form.role} onChange={(e) => setField('role', e.target.value as UserRole)} className={field} style={fieldStyle}>
                  {ROLES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--brand)' }}>
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>No users yet.</div>
        ) : (
          <table className="w-full text-sm" style={{ background: '#fff' }}>
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--bg)' }}>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Last Login</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === me?.id
                const style = ROLE_STYLE[u.role]
                const isEditing = editingId === u.id
                return (
                  <tr key={u.id} className="transition-colors hover:bg-[var(--bg)]" style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--brand)' }}>
                          {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                            {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                            {isMe && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted-2)' }}>(you)</span>}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>{u.username} {u.email ? `· ${u.email}` : ''}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingRole}
                            onChange={(e) => setEditingRole(e.target.value as UserRole)}
                            className="rounded-sm border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                            style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                          >
                            {ROLES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <button onClick={() => handleRoleSave(u.id)} disabled={savingId === u.id}
                            className="rounded-sm px-2 py-1 text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>
                            {savingId === u.id ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-sm px-2 py-1 text-xs" style={{ color: 'var(--muted)' }}>✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(u.id); setEditingRole(u.role) }}
                          disabled={isMe}
                          title={isMe ? 'Cannot change your own role' : 'Click to change role'}
                          className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {u.role_display}
                          {!isMe && <span style={{ opacity: 0.6 }}>✎</span>}
                        </button>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold"
                        style={{ background: u.is_active ? '#d1fae5' : '#fee2e2', color: u.is_active ? '#065f46' : '#991b1b' }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: u.is_active ? '#10b981' : '#ef4444' }} />
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--muted)' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="px-5 py-3.5">
                      {!isMe && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={savingId === u.id}
                            className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40"
                            style={{ color: u.is_active ? 'var(--warn)' : 'var(--success)' }}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40"
                            style={{ color: 'var(--danger)' }}
                          >
                            {deletingId === u.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
