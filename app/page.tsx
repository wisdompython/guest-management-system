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
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
        <header className="app-panel flex items-center justify-between rounded-full px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
              GO
            </div>
            <div>
              <p className="font-display text-xl leading-none text-[var(--ink)]">GuestOps</p>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">event operations</p>
            </div>
          </div>
          <Link
            href="/admin/dashboard"
            className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Open Admin
          </Link>
        </header>
      </div>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-20">
        <div className="relative">
          <div className="absolute -left-2 top-0 h-24 w-24 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="absolute left-28 top-40 h-24 w-24 rounded-full bg-teal-400/20 blur-3xl" />
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand)]">Guest experience control room</p>
          <h1 className="font-display text-5xl leading-[0.95] text-[var(--ink)] sm:text-6xl lg:text-7xl">
            Event arrivals should feel calm before the doors even open.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            GuestOps brings registration, personalized pass generation, delivery tracking, and live check-in into one polished workflow for busy event teams.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/dashboard"
              className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#29221d]"
            >
              Open Dashboard
            </Link>
            <Link
              href="/admin/guests/bulk-upload"
              className="rounded-full border border-[var(--line)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            >
              Bulk Upload Guests
            </Link>
          </div>

          <div className="mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              { value: '1 place', label: 'for events, guests, and check-in' },
              { value: 'Live', label: 'visibility into arrivals at the door' },
              { value: 'Branded', label: 'passes with precise QR placement' },
            ].map((item) => (
              <div key={item.value} className="app-panel rounded-[28px] px-5 py-5">
                <p className="font-display text-3xl text-[var(--ink)]">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="app-panel subtle-grid overflow-hidden rounded-[36px] p-4 sm:p-6">
            <div className="rounded-[28px] bg-[#1c2430] p-5 text-white shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Tonight</p>
                  <h2 className="mt-2 font-display text-3xl">Harbor House Gala</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-300">
                  doors open in 42 min
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Guest progress</p>
                  <p className="mt-4 text-4xl font-semibold">248</p>
                  <p className="mt-2 text-sm text-slate-300">passes delivered and ready to scan</p>
                </div>
                <div className="rounded-[24px] bg-gradient-to-br from-teal-400 to-emerald-500 p-4 text-slate-950">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-900/70">Check-in pace</p>
                  <p className="mt-4 text-4xl font-semibold">73%</p>
                  <p className="mt-2 text-sm text-slate-900/80">already admitted without duplicate scans</p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                  <span>arrival board</span>
                  <span>live</span>
                </div>
                <div className="space-y-3 pt-4">
                  {[
                    ['Adaeze K.', 'VVIP', 'Checked in 7:18 PM'],
                    ['Tomi A.', 'VIP', 'Pass delivered'],
                    ['Kunle F.', 'General', 'Awaiting arrival'],
                  ].map(([name, ticket, status]) => (
                    <div key={name} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{name}</p>
                        <p className="text-sm text-slate-400">{status}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">{ticket}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-4 rounded-[36px] bg-[#182028] px-6 py-8 text-white shadow-[var(--shadow-float)] sm:grid-cols-3 sm:px-8">
          {[
            { value: 'QR passes', desc: 'Auto-generated for each guest from your event design.' },
            { value: 'WhatsApp delivery', desc: 'Track which passes have been sent and what still needs attention.' },
            { value: 'Live check-in', desc: 'Keep the door team fast, mobile-friendly, and duplicate-aware.' },
          ].map(({ value, desc }) => (
            <div key={value} className="border-b border-white/10 pb-4 last:border-b-0 sm:border-b-0 sm:border-r sm:pr-5 sm:last:border-r-0">
              <p className="font-display text-3xl">{value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand)]">What the team gets</p>
          <h2 className="mt-4 font-display text-4xl text-[var(--ink)]">A calmer front desk starts with a cleaner backstage.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ title, body }) => (
            <div key={title} className="app-panel rounded-[28px] p-6 transition-transform duration-200 hover:-translate-y-1">
              <div className="mb-5 h-12 w-12 rounded-2xl bg-[var(--brand)]/10" />
              <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
