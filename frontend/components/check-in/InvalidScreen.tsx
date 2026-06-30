'use client'

export function InvalidScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="h-full overflow-auto flex flex-col items-center justify-center px-6 py-12 text-white" style={{ background: '#3a0f0f' }}>
      <div className="w-20 h-20 rounded-sm flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Unrecognised</p>
      <h1 className="font-display text-4xl font-semibold mb-1 text-center text-white">Not Found</h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>This QR code is not recognised.</p>
      <button onClick={onReset}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Try Again
      </button>
    </div>
  )
}
