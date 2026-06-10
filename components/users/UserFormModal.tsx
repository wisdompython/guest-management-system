'use client'

import { UserRole, CreateUserPayload } from '@/lib/api'
import { ROLES } from './roleConstants'

const field = 'w-full bg-[#1a2030] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const fieldStyle = { border: '1px solid var(--line)', color: 'var(--ink)' }
const labelCls = 'block text-xs font-semibold uppercase tracking-[0.16em] mb-1.5'

interface Props {
  form: CreateUserPayload
  submitting: boolean
  formError: string
  onSubmit: (e: React.SyntheticEvent) => void
  onFieldChange: <K extends keyof CreateUserPayload>(key: K, val: CreateUserPayload[K]) => void
}

export function UserFormModal({ form, submitting, formError, onSubmit, onFieldChange }: Props) {
  return (
    <form onSubmit={onSubmit} className="px-5 py-5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
      {formError && (
        <div className="mb-4 px-4 py-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5' }}>
          {formError}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls} style={{ color: 'var(--muted)' }}>Username *</label>
          <input value={form.username} onChange={(e) => onFieldChange('username', e.target.value)} required className={field} style={fieldStyle} />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted)' }}>Email</label>
          <input type="email" value={form.email} onChange={(e) => onFieldChange('email', e.target.value)} className={field} style={fieldStyle} />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted)' }}>Password *</label>
          <input type="password" value={form.password} onChange={(e) => onFieldChange('password', e.target.value)} required minLength={8} className={field} style={fieldStyle} placeholder="Min 8 characters" />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted)' }}>First Name</label>
          <input value={form.first_name} onChange={(e) => onFieldChange('first_name', e.target.value)} className={field} style={fieldStyle} />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted)' }}>Last Name</label>
          <input value={form.last_name} onChange={(e) => onFieldChange('last_name', e.target.value)} className={field} style={fieldStyle} />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--muted)' }}>Role *</label>
          <select value={form.role} onChange={(e) => onFieldChange('role', e.target.value as UserRole)} className={field} style={fieldStyle}>
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
  )
}
