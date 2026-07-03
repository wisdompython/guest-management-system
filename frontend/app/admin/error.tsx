'use client'

import { useEffect } from 'react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16" style={{ background: 'var(--bg)' }}>
      <div className="flex h-14 w-14 items-center justify-center rounded-[10px] mb-5"
        style={{ background: 'rgba(239,68,68,0.10)' }}>
        <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#ef4444' }}>Error</p>
      <h1 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--ink)' }}>Something went wrong</h1>
      <p className="text-sm text-center mb-6 max-w-sm" style={{ color: 'var(--muted)' }}>
        This page crashed unexpectedly. Your data is safe — try again or refresh the page.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mb-6 max-w-lg overflow-auto rounded-[8px] px-4 py-3 text-[11px] text-left"
          style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error.message}
        </pre>
      )}
      <div className="flex items-center gap-3">
        <button onClick={reset}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: 'var(--brand)' }}>
          Try Again
        </button>
        <a href="/admin/dashboard"
          className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-70"
          style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
