import Link from 'next/link'

const features = [
  {
    title: 'Branded event setup',
    body: 'Create events, upload pass artwork, and mark the exact QR placement zone before guests ever arrive.',
  },
  {
    title: 'Fast guest intake',
    body: 'Handle one-off registrations or import entire guest lists without leaving the same workflow.',
  },
  {
    title: 'Pass delivery tracking',
    body: 'Generate personalized assets and follow WhatsApp delivery status so the operations team sees what still needs attention.',
  },
  {
    title: 'Door-ready check-in',
    body: 'Scan arrivals quickly, block duplicates, and keep a live picture of who is already inside.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-bold text-white">
            G
          </div>
          <span className="text-sm font-semibold text-[var(--ink)]">GuestOps</span>
        </div>
        <Link
          href="/admin/dashboard"
          className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
        >
          Open Admin
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 sm:px-10">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand)]">
          Guest experience ops
        </p>
        <h1 className="font-display text-5xl leading-[1.08] text-[var(--ink)] sm:text-6xl lg:text-[76px]">
          Event arrivals<br />
          should feel calm.
        </h1>
        <p className="mt-8 max-w-lg text-lg leading-8 text-[var(--muted)]">
          GuestOps brings registration, personalized pass generation, delivery tracking, and live check-in into one clean workflow for busy event teams.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/admin/dashboard"
            className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-80"
          >
            Open Dashboard
          </Link>
          <Link
            href="/admin/guests/bulk-upload"
            className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
          >
            Bulk Upload Guests
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <div className="border-t border-[var(--line)]" />
      </div>

      {/* Feature strip */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, body }) => (
            <div key={title}>
              <div className="mb-4 h-0.5 w-8 rounded bg-[var(--brand)]" />
              <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
              <p className="mt-2.5 text-sm leading-7 text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <div className="border-t border-[var(--line)]" />
      </div>

      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24 sm:px-10">
        <h2 className="font-display text-4xl text-[var(--ink)] sm:text-5xl">
          A calmer front desk starts<br />
          with a cleaner backstage.
        </h2>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            href="/admin/dashboard"
            className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Get started
          </Link>
          <span className="text-sm text-[var(--muted)]">QR passes · WhatsApp delivery · Live check-in</span>
        </div>
      </section>

    </div>
  )
}
