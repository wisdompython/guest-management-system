const features = [
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h7v7h-7z" strokeDasharray="2 2"/>
      </svg>
    ),
    title: 'Smart QR Check-In',
    body: 'Fast, secure entry with real-time verification. Duplicate scan detection keeps the door clean and queue-free.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    title: 'Branded Pass Designer',
    body: 'Upload event artwork, position the QR zone to the pixel, and generate fully personalised passes per guest.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Automated Delivery',
    body: 'Track which passes have been sent via WhatsApp and what still needs attention before doors open.',
  },
]

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Engineered for Excellence</h2>
        <p className="mx-auto mt-3 max-w-md text-base" style={{ color: 'var(--muted)' }}>
          Powerful tools designed to simplify the complex logistics of guest management.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {features.map(({ icon, title, body }) => (
          <div key={title} className="rounded-[16px] p-7" style={{ background: 'var(--panel)', border: '1px solid var(--line)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              {icon}
            </div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{title}</h3>
            <p className="mt-2.5 text-sm leading-6" style={{ color: 'var(--muted)' }}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
