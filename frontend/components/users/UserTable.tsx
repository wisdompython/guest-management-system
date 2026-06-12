'use client'

import { useState } from 'react'
import { AuthUser, UserRole } from '@/lib/api'
import { ROLES, ROLE_STYLE } from './roleConstants'

interface EditForm {
  first_name: string
  last_name: string
  email: string
  role: UserRole
  is_active: boolean
  password: string
}

interface Props {
  users: AuthUser[]
  loading: boolean
  meId: number | undefined
  editingId: number | null
  editingRole: UserRole
  savingId: number | null
  deletingId: number | null
  onEditStart: (id: number, role: UserRole) => void
  onEditCancel: () => void
  onEditingRoleChange: (role: UserRole) => void
  onRoleSave: (id: number) => void
  onToggleActive: (user: AuthUser) => void
  onDelete: (user: AuthUser) => void
  onEditSave: (id: number, data: Partial<AuthUser> & { password?: string }) => Promise<void>
}

const input = 'w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]'
const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }
const label = 'block text-[10px] font-semibold uppercase tracking-[0.14em] mb-1'

export function UserTable({
  users, loading, meId, savingId, deletingId,
  onDelete, onEditSave,
}: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  function startEdit(u: AuthUser) {
    setExpandedId(u.id)
    setForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role, is_active: u.is_active, password: '' })
    setFormError('')
  }

  function cancelEdit() { setExpandedId(null); setForm(null); setFormError('') }

  async function handleSave(u: AuthUser) {
    if (!form) return
    setSaving(true); setFormError('')
    try {
      const payload: Partial<AuthUser> & { password?: string } = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      }
      if (form.password) payload.password = form.password
      await onEditSave(u.id, payload)
      setExpandedId(null); setForm(null)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  if (users.length === 0) return <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>No users yet.</div>

  return (
    <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
      {users.map((u) => {
        const isMe = u.id === meId
        const style = ROLE_STYLE[u.role]
        const isExpanded = expandedId === u.id

        return (
          <div key={u.id}>
            {/* Row */}
            <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg)]">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'var(--brand)' }}>
                {(u.first_name?.[0] || u.username[0]).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                    {isMe && <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--muted-2)' }}>(you)</span>}
                  </p>
                  <span className="rounded-sm px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: style.bg, color: style.color }}>
                    {u.role_display}
                  </span>
                  {!u.is_active && (
                    <span className="rounded-sm px-2 py-0.5 text-[10px] font-semibold" style={{ background: '#fee2e2', color: '#991b1b' }}>
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-2)' }}>
                  {u.username}{u.email ? ` · ${u.email}` : ''}
                  {u.last_login ? ` · Last login ${new Date(u.last_login).toLocaleDateString()}` : ' · Never logged in'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => isExpanded ? cancelEdit() : startEdit(u)}
                  className="text-xs font-semibold transition hover:opacity-70"
                  style={{ color: isExpanded ? 'var(--muted)' : 'var(--brand)' }}>
                  {isExpanded ? 'Cancel' : 'Edit'}
                </button>
                {!isMe && (
                  <button onClick={() => onDelete(u)} disabled={deletingId === u.id}
                    className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40"
                    style={{ color: 'var(--danger)' }}>
                    {deletingId === u.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* Inline edit panel */}
            {isExpanded && form && (
              <div className="px-5 pb-5 pt-1" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
                {formError && (
                  <div className="mb-3 rounded px-4 py-2.5 text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    {formError}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={label} style={{ color: 'var(--muted)' }}>First name</label>
                    <input className={input} style={inputStyle} value={form.first_name}
                      onChange={(e) => setForm((f) => f ? { ...f, first_name: e.target.value } : f)} />
                  </div>
                  <div>
                    <label className={label} style={{ color: 'var(--muted)' }}>Last name</label>
                    <input className={input} style={inputStyle} value={form.last_name}
                      onChange={(e) => setForm((f) => f ? { ...f, last_name: e.target.value } : f)} />
                  </div>
                  <div>
                    <label className={label} style={{ color: 'var(--muted)' }}>Email</label>
                    <input type="email" className={input} style={inputStyle} value={form.email}
                      onChange={(e) => setForm((f) => f ? { ...f, email: e.target.value } : f)} />
                  </div>
                  <div>
                    <label className={label} style={{ color: 'var(--muted)' }}>Role</label>
                    <select className={input} style={inputStyle} value={form.role} disabled={isMe}
                      onChange={(e) => setForm((f) => f ? { ...f, role: e.target.value as UserRole } : f)}>
                      {ROLES.map(({ value, label: l }) => <option key={value} value={value}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label} style={{ color: 'var(--muted)' }}>New password</label>
                    <input type="password" className={input} style={inputStyle} value={form.password}
                      placeholder="Leave blank to keep current"
                      onChange={(e) => setForm((f) => f ? { ...f, password: e.target.value } : f)} />
                  </div>
                  {!isMe && (
                    <div className="flex flex-col justify-end">
                      <label className={label} style={{ color: 'var(--muted)' }}>Account status</label>
                      <button type="button"
                        onClick={() => setForm((f) => f ? { ...f, is_active: !f.is_active } : f)}
                        className="px-3 py-2 text-xs font-semibold rounded transition text-left"
                        style={{ background: form.is_active ? '#d1fae5' : '#fee2e2', color: form.is_active ? '#065f46' : '#991b1b', border: '1px solid var(--line)' }}>
                        {form.is_active ? '● Active — click to disable' : '● Disabled — click to enable'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleSave(u)} disabled={saving}
                    className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: 'var(--brand)' }}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button onClick={cancelEdit}
                    className="rounded-full px-5 py-2 text-xs font-semibold transition hover:opacity-70"
                    style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
