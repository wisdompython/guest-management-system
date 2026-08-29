'use client'

import { RefObject } from 'react'
import type { TicketTypeDef } from '@/lib/api'

type FilterToken = { key: string; value: string }

export type GuestSortKey = '' | 'name' | '-name' | 'registered' | '-registered' | 'checked_in' | '-checked_in'

const SORT_OPTIONS: { value: GuestSortKey; label: string }[] = [
  { value: '',            label: 'Recently added' },
  { value: '-registered', label: 'Registration: newest first' },
  { value: 'registered',  label: 'Registration: oldest first' },
  { value: 'name',        label: 'Name (A–Z)' },
  { value: '-name',       label: 'Name (Z–A)' },
  { value: '-checked_in', label: 'Check-in: newest first' },
  { value: 'checked_in',  label: 'Check-in: oldest first' },
]

interface Props {
  tokens: FilterToken[]
  freeText: string
  filteredCount: number
  totalCount: number
  page: number
  pageSize: number
  selectedCount: number
  inputRef: RefObject<HTMLInputElement | null>
  onQueryChange: (q: string) => void
  sort: GuestSortKey
  onSortChange: (s: GuestSortKey) => void
  registeredFrom: string
  registeredTo: string
  onRegisteredFromChange: (v: string) => void
  onRegisteredToChange: (v: string) => void
  ticketTypes: TicketTypeDef[]
}

export function GuestFilterBar({
  tokens, freeText, filteredCount, totalCount, page, pageSize, selectedCount, inputRef, onQueryChange,
  sort, onSortChange, registeredFrom, registeredTo, onRegisteredFromChange, onRegisteredToChange,
  ticketTypes,
}: Props) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, totalCount)
  const statusFilter = tokens.find((token) => token.key === 'status')?.value ?? ''
  const ticketFilter = tokens.find((token) => token.key === 'ticket')?.value ?? ''
  const whatsappFilter = tokens.find((token) => token.key === 'wa')?.value ?? ''
  const hasFilters = Boolean(statusFilter || ticketFilter || whatsappFilter || registeredFrom || registeredTo || sort)

  function changeToken(key: string, value: string) {
    const nextTokens = tokens
      .filter((token) => token.key !== key)
      .map((token) => `${token.key}:${token.value}`)
    if (value) nextTokens.push(`${key}:${value}`)
    onQueryChange([...nextTokens, freeText].filter(Boolean).join(' '))
  }

  function clearFilters() {
    onQueryChange(freeText)
    onSortChange('')
    onRegisteredFromChange('')
    onRegisteredToChange('')
  }

  return (
    <div className="flex flex-shrink-0 flex-col gap-2.5 px-4 py-3"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="flex items-center gap-3">
        <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--brand-soft)]"
          style={{ border: '1px solid var(--line-strong)', background: 'var(--field)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
            style={{ color: 'var(--muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
          </svg>
          <input
            ref={inputRef}
            value={freeText}
            onChange={(e) => {
              const prefix = tokens.map((token) => `${token.key}:${token.value}`).join(' ')
              onQueryChange([prefix, e.target.value].filter(Boolean).join(' '))
            }}
            placeholder="Search guests by name or phone number"
            aria-label="Search guests by name or phone number"
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-[var(--muted-2)] focus:outline-none"
            style={{ color: 'var(--ink)', caretColor: 'var(--brand)' }}
          />
          {freeText && (
            <button onClick={() => onQueryChange(tokens.map((token) => `${token.key}:${token.value}`).join(' '))}
              aria-label="Clear search" className="flex-shrink-0 px-1 text-sm" style={{ color: 'var(--muted)' }}>✕</button>
          )}
        </div>

        <div className="flex-shrink-0 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
          {totalCount > 0 ? `${start}–${end} of ${totalCount}` : `${filteredCount} guests`}
          {selectedCount > 0 && ` · ${selectedCount} selected`}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <span className="self-center pr-1 text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Filter by</span>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Guest status</span>
          <select value={statusFilter} onChange={(e) => changeToken('status', e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            style={{ border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--ink)' }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="checked_in">Checked in</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Ticket</span>
          <select value={ticketFilter} onChange={(e) => changeToken('ticket', e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            style={{ border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--ink)' }}>
            <option value="">All tickets</option>
            {ticketTypes.map((ticket) => <option key={ticket.value} value={ticket.value}>{ticket.label}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>WhatsApp delivery</span>
          <select value={whatsappFilter} onChange={(e) => changeToken('wa', e.target.value)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            style={{ border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--ink)' }}>
            <option value="">All delivery states</option>
            <option value="sent">Sent</option>
            <option value="failed">Not sent</option>
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Registration date</span>
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              <span>From</span>
              <input type="date" value={registeredFrom} onChange={(e) => onRegisteredFromChange(e.target.value)}
                aria-label="Registered from date"
                className="rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                style={{ border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--ink)' }} />
            </label>
            <label className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              <span>To</span>
              <input type="date" value={registeredTo} onChange={(e) => onRegisteredToChange(e.target.value)}
                aria-label="Registered to date"
                className="rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                style={{ border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--ink)' }} />
            </label>
          </div>
        </div>

        <label className="ml-auto flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Sort by</span>
          <select value={sort} onChange={(e) => onSortChange(e.target.value as GuestSortKey)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
            style={{ border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--ink)' }}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button onClick={clearFilters}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold transition hover:bg-[var(--chip)]"
            style={{ color: 'var(--brand)' }}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
