import Link from 'next/link'

export function SplitSection() {
  return (
    <section style={{ background: '#fff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <h2 className="text-3xl font-bold leading-snug" style={{ color: 'var(--ink)' }}>
            Total Visibility into<br />Your Guest Ecosystem
          </h2>
          <div className="mt-8 space-y-6">
            {[
              { title: 'Admin Dashboard', body: 'Monitor arrival rates, VIP alerts, and capacity status in real time from a single command center.' },
              { title: 'Guest List Management', body: 'Intelligent search, categorisation, and mass-action tools to handle lists of thousands in seconds.' },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: 'var(--brand-soft)' }}>
                  <div className="h-2 w-2 rounded-sm" style={{ background: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/dashboard" className="mt-8 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'var(--brand)' }}>
            Open Dashboard
          </Link>
        </div>

        <div className="mt-12 overflow-hidden rounded-[16px] shadow-xl lg:mt-0" style={{ border: '1px solid var(--line)' }}>
          <div className="px-5 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}>
            Guest List
            <span className="ml-2 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--brand)', color: '#fff' }}>+ Add Guest</span>
            <span className="ml-2 text-xs font-medium" style={{ color: 'var(--brand)' }}>Export</span>
          </div>
          {[
            { n: 'Jonathan Doe', e: 'j.doe@enterprise.com', s: 'CHECKED IN', sc: '#16a34a', sb: '#dcfce7' },
            { n: 'Alice Smith',  e: 'a.smith@globaltech.co', s: 'PENDING',    sc: '#b45309', sb: '#fef3c7' },
            { n: 'Marcus Reed', e: 'm.reed@venture.co',     s: 'CHECKED IN', sc: '#16a34a', sb: '#dcfce7' },
          ].map(({ n, e, s, sc, sb }) => (
            <div key={n} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{n}</p>
                <p className="text-xs" style={{ color: 'var(--muted-2)' }}>{e}</p>
              </div>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: sb, color: sc }}>{s}</span>
            </div>
          ))}
          <div className="px-5 py-3.5" style={{ background: 'var(--bg)' }}>
            <div className="mb-1.5 flex justify-between text-xs font-semibold" style={{ color: 'var(--ink)' }}>
              <span style={{ color: 'var(--muted)' }}>CHECK-IN PROGRESS</span>
              <span>72.4%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
              <div className="h-full rounded-full" style={{ width: '72.4%', background: 'var(--brand)' }} />
            </div>
            <p className="mt-1.5 text-xs font-medium" style={{ color: '#16a34a' }}>+5.2% from last hour</p>
          </div>
        </div>
      </div>
    </section>
  )
}
