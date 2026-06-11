'use client'

import { AuthUser, UserRole } from '@/lib/api'
import { ROLES, ROLE_STYLE } from './roleConstants'

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
}

export function UserTable({
  users, loading, meId, editingId, editingRole, savingId, deletingId,
  onEditStart, onEditCancel, onEditingRoleChange, onRoleSave, onToggleActive, onDelete,
}: Props) {
  if (loading) return <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  if (users.length === 0) return <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>No users yet.</div>
  return (
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
          const isMe = u.id === meId
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
                    <select value={editingRole} onChange={(e) => onEditingRoleChange(e.target.value as UserRole)}
                      className="rounded-sm border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: '#1a2030' }}>
                      {ROLES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button onClick={() => onRoleSave(u.id)} disabled={savingId === u.id}
                      className="rounded-sm px-2 py-1 text-xs font-semibold text-white" style={{ background: 'var(--brand)' }}>
                      {savingId === u.id ? '…' : 'Save'}
                    </button>
                    <button onClick={onEditCancel} className="rounded-sm px-2 py-1 text-xs" style={{ color: 'var(--muted)' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => onEditStart(u.id, u.role)} disabled={isMe}
                    title={isMe ? 'Cannot change your own role' : 'Click to change role'}
                    className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: style.bg, color: style.color }}>
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
                    <button onClick={() => onToggleActive(u)} disabled={savingId === u.id}
                      className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40"
                      style={{ color: u.is_active ? 'var(--warn)' : 'var(--success)' }}>
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => onDelete(u)} disabled={deletingId === u.id}
                      className="text-xs font-semibold transition hover:opacity-70 disabled:opacity-40"
                      style={{ color: 'var(--danger)' }}>
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
  )
}
