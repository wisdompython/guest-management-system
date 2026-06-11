'use client'

import Link from 'next/link'
import { Guest } from '@/lib/api'

const WA_STATUS_LABEL: Record<string, string> = {
  read: 'Read', delivered: 'Delivered', sent: 'Sent', failed: 'Failed', pending: '',
}
const WA_DOT: Record<string, string> = {
  read: 'var(--brand)', delivered: 'var(--brand)', sent: 'var(--muted)', failed: 'var(--danger)',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  checked_in: { bg: 'rgba(34,201,160,0.14)', color: 'var(--brand)', label: 'CHECKED-IN' },
  registered:  { bg: 'rgba(245,158,11,0.14)',  color: 'var(--warn)',  label: 'PENDING' },
  no_show:     { bg: 'rgba(239,68,68,0.14)',    color: 'var(--danger)', label: 'NO-SHOW' },
}

interface Props {
  g: Guest
  isSel: boolean
  deleting: string | null
  onToggleSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
}

export function GuestTableRow({ g, isSel, deleting, onToggleSelect, onDelete }: Props) {
  const initials = g.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const st = g.status === 'checked_in' ? STATUS_STYLE.checked_in : STATUS_STYLE.registered
  const checkedInTime = g.checked_in_at
    ? new Date(g.checked_in_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null
  const waStatus = g.whatsapp_sent ? 'delivered' : 'pending'
  const waLabel = WA_STATUS_LABEL[waStatus] || ''
  const waDot = WA_DOT[waStatus] || 'var(--muted-2)'
  const ticketLabel = g.ticket_type === 'vip' ? 'VIP' : g.ticket_type === 'vvip' ? 'VVIP'
    : g.ticket_type.charAt(0).toUpperCase() + g.ticket_type.slice(1)
  return (
    <tr className="transition-colors"
      style={{ borderBottom: '1px solid var(--line)', background: isSel ? 'rgba(34,201,160,0.05)' : 'transparent' }}
      onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--panel)' }}
      onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <td className="px-4 py-3"><input type="checkbox" checked={isSel} onChange={() => onToggleSelect(g.id)} className="accent-[var(--brand)]" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(34,201,160,0.15)', color: 'var(--brand)' }}>{initials}</div>
          <div>
            <Link href={`/admin/guests/${g.id}`} className="font-semibold hover:underline" style={{ color: 'var(--ink)' }}>{g.full_name}</Link>
            <p className="text-[11px] font-mono" style={{ color: 'var(--muted-2)' }}>
              G-{g.id.slice(-3).toUpperCase()}
              {g.ticket_type === 'vip' && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>· VIP</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-[12px] truncate max-w-[160px]" style={{ color: 'var(--muted)' }}>{g.email || '—'}</p>
        <p className="text-[11px] font-mono" style={{ color: 'var(--muted-2)' }}>{g.phone_number || '—'}</p>
      </td>
      <td className="px-4 py-3"><span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{ticketLabel}</span></td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-mono" style={{ color: g.table_number ? 'var(--ink)' : 'var(--muted-2)' }}>
          {g.table_number ? `T-${g.table_number}` : '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        {waLabel ? (
          <span className="flex items-center gap-1.5 text-[12px]">
            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: waDot }} />
            <span style={{ color: 'var(--muted)' }}>{waLabel}</span>
          </span>
        ) : <span style={{ color: 'var(--muted-2)' }}>—</span>}
      </td>
      <td className="px-4 py-3">
        <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-[0.08em]" style={{ background: st.bg, color: st.color }}>{st.label}</span>
      </td>
      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--muted-2)' }}>{checkedInTime || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link href={`/admin/guests/${g.id}`} className="p-1 transition hover:opacity-70" style={{ color: 'var(--muted)' }} title="View">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </Link>
          <button className="p-1 transition hover:opacity-70" style={{ color: 'var(--muted)' }} title="Message">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button className="p-1 text-[15px] leading-none transition hover:opacity-70" style={{ color: 'var(--muted-2)' }}
            title="Delete" onClick={() => onDelete(g.id, g.full_name)} disabled={deleting === g.id}>
            {deleting === g.id ? '…' : '···'}
          </button>
        </div>
      </td>
    </tr>
  )
}
