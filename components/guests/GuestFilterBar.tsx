'use client'

import { RefObject } from 'react'

type FilterToken = { key: string; value: string }

interface Props {
  query: string
  tokens: FilterToken[]
  freeText: string
  filteredCount: number
  selectedCount: number
  inputRef: RefObject<HTMLInputElement | null>
  onQueryChange: (q: string) => void
}

export function GuestFilterBar({
  query, tokens, freeText, filteredCount, selectedCount, inputRef, onQueryChange,
}: Props) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2 px-4 py-2.5"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
      <div className="flex flex-1 items-center gap-2 px-3 py-1.5"
        style={{ border: '1px solid var(--line)', background: 'var(--panel-2)' }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
          style={{ color: 'var(--muted)', flexShrink: 0 }}>
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {tokens.map((t, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono"
              style={{ background: 'rgba(34,201,160,0.12)', color: 'var(--brand)', border: '1px solid rgba(34,201,160,0.2)' }}>
              <span style={{ color: 'var(--muted)' }}>{t.key}:</span>{t.value}
              <button onClick={() => onQueryChange(query.replace(`${t.key}:${t.value}`, '').trim())}
                className="ml-0.5 leading-none" style={{ color: 'var(--muted)' }}>✕</button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={freeText || tokens.length > 0 ? '' : query}
            onChange={(e) => {
              const val = e.target.value
              const prefix = tokens.map((t) => `${t.key}:${t.value}`).join(' ')
              onQueryChange(prefix ? prefix + ' ' + val : val)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !freeText && tokens.length > 0) {
                const last = tokens[tokens.length - 1]
                onQueryChange(query.replace(`${last.key}:${last.value}`, '').trim())
              }
            }}
            placeholder={tokens.length === 0 ? 'ticket:patron  status:pending  wa:failed  or search name…' : ''}
            className="flex-1 min-w-[200px] bg-transparent text-[12px] font-mono focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
        </div>
        {query && (
          <button onClick={() => onQueryChange('')} className="flex-shrink-0 text-[11px]" style={{ color: 'var(--muted)' }}>✕</button>
        )}
        <kbd className="hidden xl:block text-[10px] px-1.5 py-0.5 font-mono flex-shrink-0"
          style={{ border: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--panel)' }}>⌘K</kbd>
      </div>
      <div className="text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
        {filteredCount} matched · {selectedCount} selected
      </div>
    </div>
  )
}
