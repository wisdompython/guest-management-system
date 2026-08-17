import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: '#f6f4ee' }}>

      {/* Radial glow — gold top center */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(184,150,62,0.16) 0%, transparent 70%)',
        }} />

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(23,26,33,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(23,26,33,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48"
        style={{ background: 'linear-gradient(to top, #f6f4ee, transparent)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #c9a84c, #8a6d2e)', boxShadow: '0 8px 28px rgba(184,150,62,0.35)' }}>
          T
        </div>

        <h1 className="mb-2 text-4xl font-bold tracking-tight" style={{ color: '#23262e' }}>
          TWS E-GuestPass
        </h1>
        <p className="mb-10 text-sm" style={{ color: '#6b7280' }}>
          Guest operations platform · The Wedding Store
        </p>

        <Link href="/admin/dashboard"
          className="rounded-full px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #8a6d2e)',
            boxShadow: '0 6px 20px rgba(184,150,62,0.3)',
          }}>
          Go to Dashboard →
        </Link>

        <p className="mt-8 text-xs" style={{ color: '#9aa1ad' }}>
          Authorised staff only
        </p>
      </div>
    </div>
  )
}
