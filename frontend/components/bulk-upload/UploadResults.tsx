'use client'

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
  return (
    <div className={`mb-5 rounded-[18px] border px-5 py-4 ${result.failed > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <p className="font-semibold text-[var(--ink)] mb-2">Upload complete</p>
      <div className="flex flex-wrap gap-5 text-sm mb-2">
        <span className="text-emerald-700 font-semibold">✓ {result.successful} imported</span>
        {result.failed > 0 && <span className="text-red-600 font-semibold">✗ {result.failed} failed</span>}
        {result.asset_warnings.length > 0 && <span className="text-amber-600 font-semibold">⚠ {result.asset_warnings.length} asset warnings</span>}
      </div>
      {result.errors.map((e, i) => (
        <p key={i} className="text-xs text-red-600 mt-1">Row {e.row}: {e.error}</p>
      ))}
      {result.asset_warnings.map((w) => (
        <p key={w.guest_id} className="text-xs text-amber-700 mt-1">
          {w.name} — QR: {w.qr ? '✓' : '✗'}, Pass: {w.pass ? '✓' : '✗'}
        </p>
      ))}
    </div>
  )
}
