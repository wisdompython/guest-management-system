'use client'

import { useState } from 'react'

interface UploadResult {
  upload_id: number
  total_rows: number
  successful: number
  failed: number
  errors: { row: number; error: string }[]
  asset_warnings: { guest_id: string; name: string; qr: boolean; pass: boolean }[]
}

interface Props {
  result: UploadResult
}

export function UploadResults({ result }: Props) {
  const [showErrors, setShowErrors] = useState(true)
  const [showWarnings, setShowWarnings] = useState(false)
  const allOk = result.failed === 0 && result.asset_warnings.length === 0

  return (
    <div className="mb-6 overflow-hidden rounded-[16px]"
      style={{ border: `1px solid ${allOk ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, background: 'var(--panel)' }}>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-4"
        style={{ borderBottom: result.errors.length || result.asset_warnings.length ? '1px solid var(--line)' : undefined }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: allOk ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
            {allOk
              ? <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="14" height="14" fill="none" stroke="#f59e0b" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            }
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Upload complete — {result.total_rows} row{result.total_rows !== 1 ? 's' : ''} processed
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm ml-auto">
          <span className="font-semibold" style={{ color: '#10b981' }}>✓ {result.successful} imported</span>
          {result.failed > 0 && (
            <span className="font-semibold" style={{ color: '#ef4444' }}>✗ {result.failed} failed</span>
          )}
          {result.asset_warnings.length > 0 && (
            <span className="font-semibold" style={{ color: '#f59e0b' }}>⚠ {result.asset_warnings.length} warnings</span>
          )}
        </div>
      </div>

      {/* Row errors */}
      {result.errors.length > 0 && (
        <div style={{ borderBottom: result.asset_warnings.length ? '1px solid var(--line)' : undefined }}>
          <button
            onClick={() => setShowErrors((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold transition hover:opacity-70"
            style={{ color: 'var(--danger)' }}>
            <span>Failed rows ({result.errors.length})</span>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              style={{ transform: showErrors ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showErrors && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'rgba(239,68,68,0.05)' }}>
                    <th className="px-5 py-2 text-left font-semibold w-16" style={{ color: 'var(--muted)' }}>Row</th>
                    <th className="px-5 py-2 text-left font-semibold" style={{ color: 'var(--muted)' }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-5 py-2 font-mono font-bold" style={{ color: 'var(--danger)' }}>{e.row}</td>
                      <td className="px-5 py-2" style={{ color: 'var(--ink)' }}>{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Asset warnings */}
      {result.asset_warnings.length > 0 && (
        <div>
          <button
            onClick={() => setShowWarnings((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold transition hover:opacity-70"
            style={{ color: '#f59e0b' }}>
            <span>Asset warnings ({result.asset_warnings.length})</span>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              style={{ transform: showWarnings ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showWarnings && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'rgba(245,158,11,0.05)' }}>
                    <th className="px-5 py-2 text-left font-semibold" style={{ color: 'var(--muted)' }}>Guest</th>
                    <th className="px-5 py-2 text-center font-semibold w-16" style={{ color: 'var(--muted)' }}>QR</th>
                    <th className="px-5 py-2 text-center font-semibold w-16" style={{ color: 'var(--muted)' }}>Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {result.asset_warnings.map((w) => (
                    <tr key={w.guest_id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-5 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{w.name}</td>
                      <td className="px-5 py-2 text-center" style={{ color: w.qr ? '#10b981' : 'var(--danger)' }}>{w.qr ? '✓' : '✗'}</td>
                      <td className="px-5 py-2 text-center" style={{ color: w.pass ? '#10b981' : 'var(--danger)' }}>{w.pass ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
