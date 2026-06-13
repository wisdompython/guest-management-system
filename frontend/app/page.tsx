import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: '#0a0c10' }}>

      {/* Radial glow — gold top center */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(184,150,62,0.18) 0%, transparent 70%)',
        }} />

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48"
        style={{ background: 'linear-gradient(to top, #0a0c10, transparent)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #8a6d2e)', boxShadow: '0 0 40px rgba(184,150,62,0.3)' }}>
          T
        </div>

        <h1 className="mb-2 text-4xl font-bold tracking-tight" style={{ color: '#e4e8f0' }}>
          TWS E-GuestPass
        </h1>
        <p className="mb-10 text-sm" style={{ color: '#6b7585' }}>
          Guest operations platform · The Wedding Store
        </p>

        <Link href="/admin/dashboard"
          className="rounded-full px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #8a6d2e)',
            boxShadow: '0 0 24px rgba(184,150,62,0.25)',
          }}>
          Go to Dashboard →
        </Link>

        <p className="mt-8 text-xs" style={{ color: '#4a5160' }}>
          Authorised staff only
        </p>
      </div>
    </div>
  )
}
