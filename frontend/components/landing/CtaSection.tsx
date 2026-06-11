import Link from 'next/link'

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
      <div className="rounded-[20px] px-10 py-16 text-center" style={{ background: 'linear-gradient(135deg, #0f1b2d 0%, #1a2e4a 60%, #1a3ed4 100%)' }}>
        <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
          Ready to elevate your event?
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Join event teams worldwide and streamline your guest management process today.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/admin/dashboard" className="rounded-lg px-7 py-3 text-sm font-semibold transition hover:opacity-90" style={{ background: '#fff', color: 'var(--brand)' }}>
            Open Dashboard
          </Link>
          <Link href="/admin/guests/bulk-upload" className="rounded-lg border px-7 py-3 text-sm font-semibold transition hover:bg-white/10" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
            Import Guest List
          </Link>
        </div>
      </div>
    </section>
  )
}
