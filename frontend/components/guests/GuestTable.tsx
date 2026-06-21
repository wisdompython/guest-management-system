'use client'

import Link from 'next/link'
import { Guest } from '@/lib/api'
import { GuestTableRow } from './GuestTableRow'

interface Props {
  guests: Guest[]
  loading: boolean
  query: string
  selected: Set<string>
  deleting: string | null
  onToggleAll: () => void
  onToggleSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
  onClearQuery: () => void
}

function GuestCard({ g, isSel, deleting, onToggleSelect, onDelete }: {
  g: Guest; isSel: boolean; deleting: string | null
  onToggleSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
}) {
  const initials = g.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const checkedIn = g.status === 'checked_in'

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 transition"
      style={{ borderBottom: '1px solid var(--line)', background: isSel ? 'var(--brand-soft)' : 'transparent' }}>
      <input type="checkbox" checked={isSel} onChange={() => onToggleSelect(g.id)}
        className="mt-1 accent-[var(--brand)] flex-shrink-0" />
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{initials}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/admin/guests/${g.id}`} className="text-sm font-semibold hover:underline truncate"
            style={{ color: 'var(--ink)' }}>{g.full_name}</Link>
          <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold"
            style={{
              background: checkedIn ? 'var(--brand-soft)' : 'rgba(245,158,11,0.14)',
              color: checkedIn ? 'var(--brand)' : 'var(--warn)',
            }}>
            {checkedIn ? 'IN' : 'PENDING'}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>
          {g.phone_number && <span className="font-mono">{g.phone_number}</span>}
          {g.ticket_type && <span>{g.ticket_type.toUpperCase()}</span>}
          {g.table_number && <span>T-{g.table_number}</span>}
          {g.whatsapp_sent && <span style={{ color: 'var(--brand)' }}>● WA sent</span>}
        </div>
      </div>
      <button
        className="flex-shrink-0 p-1 transition hover:opacity-70 disabled:opacity-40"
        style={{ color: 'var(--danger)' }}
        onClick={() => onDelete(g.id, g.full_name)}
        disabled={deleting === g.id}>
        {deleting === g.id
          ? <span className="text-[11px]">…</span>
          : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
        }
      </button>
    </div>
  )
}

export function GuestTable({ guests, loading, query, selected, deleting, onToggleAll, onToggleSelect, onDelete, onClearQuery }: Props) {
  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }
  if (guests.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--panel)' }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        {query ? (
          <>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No guests match your filters</p>
            <button onClick={onClearQuery}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
              style={{ border: '1px solid var(--line)', color: 'var(--brand)' }}>
              Clear filters
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No guests yet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Add guests individually or use bulk upload.</p>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile card list — shown below md */}
      <div className="md:hidden divide-y" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 sticky top-0 z-10"
          style={{ background: 'var(--panel)', borderBottom: '1px solid var(--line)' }}>
          <input type="checkbox" checked={selected.size === guests.length && guests.length > 0}
            onChange={onToggleAll} className="accent-[var(--brand)]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-2)' }}>
            {selected.size > 0 ? `${selected.size} selected` : `${guests.length} guests`}
          </span>
        </div>
        {guests.map((g) => (
          <GuestCard key={g.id} g={g} isSel={selected.has(g.id)} deleting={deleting}
            onToggleSelect={onToggleSelect} onDelete={onDelete} />
        ))}
      </div>

      {/* Desktop table — hidden below md */}
      <table className="hidden md:table w-full text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ background: 'var(--panel)', borderBottom: '1px solid var(--line)', color: 'var(--muted-2)' }}>
            <th className="px-4 py-2.5 text-left w-8">
              <input type="checkbox" checked={selected.size === guests.length && guests.length > 0}
                onChange={onToggleAll} className="accent-[var(--brand)]" />
            </th>
            <th className="px-4 py-2.5 text-left">Guest</th>
            <th className="px-4 py-2.5 text-left">Contact</th>
            <th className="px-4 py-2.5 text-left">Ticket</th>
            <th className="px-4 py-2.5 text-left">Seat</th>
            <th className="px-4 py-2.5 text-left">WhatsApp</th>
            <th className="px-4 py-2.5 text-left">Status</th>
            <th className="px-4 py-2.5 text-left">Scan</th>
            <th className="px-4 py-2.5 text-left w-8" />
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <GuestTableRow key={g.id} g={g} isSel={selected.has(g.id)} deleting={deleting}
              onToggleSelect={onToggleSelect} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </>
  )
}
