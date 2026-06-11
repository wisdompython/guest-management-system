'use client'

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

export function GuestTable({ guests, loading, query, selected, deleting, onToggleAll, onToggleSelect, onDelete, onClearQuery }: Props) {
  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
  }
  if (guests.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No guests match your filters.</p>
        {query && <button onClick={onClearQuery} className="text-xs" style={{ color: 'var(--brand)' }}>Clear filters</button>}
      </div>
    )
  }
  return (
    <table className="w-full text-[13px]">
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
  )
}
