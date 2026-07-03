'use client'

export type InvalidReason = 'not_found' | 'offline' | 'server_error'

const MESSAGES: Record<InvalidReason, { label: string; title: string; body: string; icon: React.ReactNode }> = {
  not_found: {
    label: 'Unrecognised',
    title: 'Not Found',
    body: 'This QR code is not recognised. Make sure it belongs to this event.',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  offline: {
    label: 'No Connection',
    title: 'You\'re Offline',
    body: 'Check your internet connection and try again.',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 0 1 0 12.728M15.536 8.464a5 5 0 0 1 0 7.072M12 12h.01M3.636 5.636a9 9 0 0 0 0 12.728M6.464 8.464a5 5 0 0 0 0 7.072" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      </svg>
    ),
  },
  server_error: {
    label: 'Server Error',
    title: 'Something Went Wrong',
    body: 'The server returned an error. Try again in a moment.',
    icon: (
      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
  },
}

export function InvalidScreen({ onReset, reason = 'not_found' }: { onReset: () => void; reason?: InvalidReason }) {
  const { label, title, body, icon } = MESSAGES[reason]
  return (
    <div className="h-full overflow-auto flex flex-col items-center justify-center px-6 py-12 text-white" style={{ background: '#3a0f0f' }}>
      <div className="w-20 h-20 rounded-sm flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.10)' }}>
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <h1 className="font-display text-4xl font-semibold mb-1 text-center text-white">{title}</h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>{body}</p>
      <button onClick={onReset}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Try Again
      </button>
    </div>
  )
}
