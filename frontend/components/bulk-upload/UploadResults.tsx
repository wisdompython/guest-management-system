'use client'

import { useState } from 'react'

interface UploadResult {
  upload_id: number
  status: 'pending' | 'processing' | 'done' | 'failed'
  total_rows: number
  successful: number
  failed: number
  skipped: number
  replaced: number
  recipients_created: number
  assets_total: number
  assets_processed: number
  assets_failed: number
  error_message: string
  uploaded_at: string
  errors: { row: number; error?: string; errors?: string[] }[]
  skipped_items: { row: number; full_name: string; phone_number: string; reason: string }[]
  asset_warnings: { guest_id: string; name: string; qr: boolean; pass: boolean }[]
}

export function UploadResults({ result }: { result: UploadResult }) {
  const [showErrors, setShowErrors] = useState(true)
  const [showSkipped, setShowSkipped] = useState(false)
  const running = result.status === 'pending' || result.status === 'processing'
  const pendingTooLong = result.status === 'pending'
    && Date.now() - new Date(result.uploaded_at).getTime() > 60_000
  const allOk = result.status === 'done' && result.failed === 0 && result.assets_failed === 0
  const assetPercent = result.assets_total
    ? Math.min(100, Math.round((result.assets_processed / result.assets_total) * 100))
    : 0
  const title = result.status === 'pending'
    ? pendingTooLong ? 'Waiting for an import worker' : 'Import queued'
    : result.status === 'failed'
      ? 'Import could not be completed'
      : running && !result.total_rows
        ? 'Validating and importing guest list…'
        : running
          ? `Generating guest passes — ${result.assets_processed} of ${result.assets_total}`
          : result.replaced
            ? `Guest list replaced — ${result.replaced} previous guest${result.replaced === 1 ? '' : 's'} removed`
            : `Import complete — ${result.total_rows} row${result.total_rows !== 1 ? 's' : ''} processed`

  return (
    <div className="mb-6 overflow-hidden rounded-[16px]" style={{
      background: 'var(--panel)',
      border: `1px solid ${allOk ? 'rgba(16,185,129,0.3)' : result.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
    }}>
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: allOk ? 'rgba(16,185,129,0.15)' : result.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.15)' }}>
            {allOk
              ? <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : result.status === 'failed'
                ? <svg width="14" height="14" fill="none" stroke="#ef4444" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
                : <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />}
          </div>
          <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {result.successful > 0 && <span className="font-semibold text-emerald-400">✓ {result.successful} imported</span>}
          {result.skipped > 0 && <span className="font-semibold text-amber-400">↷ {result.skipped} duplicate{result.skipped === 1 ? '' : 's'} skipped</span>}
          {result.failed > 0 && <span className="font-semibold text-[var(--danger)]">× {result.failed} failed</span>}
        </div>
      </div>

      {running && <div className="px-5 pb-4">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg)]">
          <div className={`h-full rounded-full bg-[var(--brand)] transition-all ${result.assets_total ? '' : 'animate-pulse'}`} style={{ width: result.assets_total ? `${assetPercent}%` : '35%' }}/>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {pendingTooLong
            ? 'The job has been queued for over a minute but has not started. Check that the Celery import worker is running.'
            : 'You can leave this page. The import continues safely in the background.'}
        </p>
      </div>}

      {result.status === 'failed' && result.error_message && <p className="border-t border-[var(--line)] px-5 py-3 text-xs leading-5 text-[var(--danger)]">{result.error_message}</p>}

      {result.status === 'done' && <div className="grid gap-2 border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)] sm:grid-cols-3">
        <span>{result.recipients_created} RSVP recipients created</span>
        <span>{result.assets_processed} assets processed</span>
        <span className={result.assets_failed ? 'text-[var(--danger)]' : ''}>{result.assets_failed} asset failures</span>
      </div>}

      {result.errors.length > 0 && <div className="border-t border-[var(--line)]">
        <button type="button" onClick={() => setShowErrors((value) => !value)} className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold text-[var(--danger)]">
          <span>Failed rows ({result.errors.length})</span><span>{showErrors ? '−' : '+'}</span>
        </button>
        {showErrors && <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-y border-[var(--line)] bg-red-500/5"><th className="w-16 px-5 py-2 text-left text-[var(--muted)]">Row</th><th className="px-5 py-2 text-left text-[var(--muted)]">Error</th></tr></thead>
            <tbody>{result.errors.map((error, index) => <tr key={index} className="border-b border-[var(--line)]"><td className="px-5 py-2 font-mono font-bold text-[var(--danger)]">{error.row}</td><td className="px-5 py-2 text-[var(--ink)]">{error.error ?? error.errors?.join(' ') ?? 'Invalid row'}</td></tr>)}</tbody>
          </table>
        </div>}
      </div>}

      {result.skipped_items.length > 0 && <div className="border-t border-[var(--line)]">
        <button type="button" onClick={() => setShowSkipped((value) => !value)} className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold text-amber-400">
          <span>Skipped duplicate phone numbers ({result.skipped_items.length})</span><span>{showSkipped ? '−' : '+'}</span>
        </button>
        {showSkipped && <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-y border-[var(--line)] bg-amber-500/5"><th className="w-16 px-5 py-2 text-left text-[var(--muted)]">Row</th><th className="px-5 py-2 text-left text-[var(--muted)]">Guest</th><th className="px-5 py-2 text-left text-[var(--muted)]">Phone</th><th className="px-5 py-2 text-left text-[var(--muted)]">Reason</th></tr></thead>
            <tbody>{result.skipped_items.map((item, index) => <tr key={index} className="border-b border-[var(--line)]"><td className="px-5 py-2 font-mono font-bold text-amber-400">{item.row}</td><td className="px-5 py-2 text-[var(--ink)]">{item.full_name}</td><td className="px-5 py-2 font-mono text-[var(--ink)]">{item.phone_number}</td><td className="px-5 py-2 text-[var(--muted)]">{item.reason}</td></tr>)}</tbody>
          </table>
        </div>}
      </div>}
    </div>
  )
}
