'use client'

interface Props {
  loading: boolean
  checkedIn: number
  total: number
  waSent: number
  eventsCount: number
  attendancePct: number
  activeEventLabel: string
}

export function StatCards({ loading, checkedIn, total, waSent, eventsCount, attendancePct, activeEventLabel }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>Attendance</p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--brand)' }}>
          {loading ? '--' : checkedIn}
          <span className="text-lg font-normal ml-1" style={{ color: 'var(--muted)' }}>/ {total}</span>
        </p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          {loading ? '--' : `${attendancePct}% checked in`}
        </p>
        <div className="mt-3 h-1" style={{ background: 'var(--line)' }}>
          <div className="h-1 transition-all" style={{ width: `${attendancePct}%`, background: 'var(--brand)' }} />
        </div>
      </div>

      <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>Pending</p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {loading ? '--' : total - checkedIn}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          {loading ? '--' : `${total} total guests`}
        </p>
      </div>

      <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>WA Delivered</p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {loading ? '--' : waSent}
          <span className="text-lg font-normal ml-1" style={{ color: 'var(--muted)' }}>/ {total}</span>
        </p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
          {loading ? '--' : `${total - waSent} not yet sent`}
        </p>
      </div>

      <div className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>Events</p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {loading ? '--' : eventsCount}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>{activeEventLabel}</p>
      </div>
    </div>
  )
}
