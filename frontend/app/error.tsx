'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d1016', padding: '2rem', fontFamily: 'sans-serif' }}>
          <div style={{ width: 56, height: 56, borderRadius: 8, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 8 }}>Something went wrong</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 8, textAlign: 'center' }}>Unexpected Error</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28, textAlign: 'center', maxWidth: 360 }}>
            The application encountered an unexpected error. Try refreshing — if it keeps happening, contact support.
          </p>
          <button onClick={reset}
            style={{ background: '#22c9a0', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
