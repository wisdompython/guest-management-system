'use client'

import { Guest } from '@/lib/api'

const TICKET_COLORS: Record<string, string> = {
  vvip:    'bg-purple-50 text-purple-700 border-purple-200',
  vip:     'bg-amber-50 text-amber-700 border-amber-200',
  general: 'bg-stone-100 text-stone-600 border-stone-200',
}

function GuestInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="border-t border-white/10" />
      <div className="flex justify-between items-center">
        <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-white font-semibold text-sm text-right max-w-[60%]">{value}</span>
      </div>
    </>
  )
}

export function CheckedInScreen({ guest, onNext }: { guest: Guest; onNext: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white" style={{ background: 'var(--sidebar)' }}>
      <div className="w-20 h-20 rounded-sm flex items-center justify-center mb-6" style={{ background: 'var(--brand)' }}>
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--brand)' }}>Access Granted</p>
      <h1 className="font-display text-4xl font-semibold mb-1 text-center text-white">Checked In</h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Welcome to the event</p>

      <div className="w-full max-w-sm rounded-sm px-6 py-5 space-y-3 mb-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">Name</span>
          <span className="text-white font-bold text-base">{guest.full_name}</span>
        </div>
        <GuestInfoRow label="Ticket" value={guest.ticket_type.toUpperCase()} />
        {guest.table_number && (
          <GuestInfoRow label="Table" value={`${guest.table_number}${guest.seat_number ? ` / Seat ${guest.seat_number}` : ''}`} />
        )}
        {guest.event_name && <GuestInfoRow label="Event" value={guest.event_name} />}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}
      >
        Scan Next Guest
      </button>
    </div>
  )
}

export function DuplicateScreen({ guest, onNext }: { guest: Guest; onNext: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white" style={{ background: '#4a3000' }}>
      <div className="w-20 h-20 rounded-sm flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3C6.477 3 2 7.477 2 12s4.477 9 10 9 10-4.477 10-9S17.523 3 12 3z" />
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--brand)' }}>Already Processed</p>
      <h1 className="font-display text-4xl font-semibold mb-1 text-center text-white">Already Checked In</h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {guest.checked_in_at
          ? `Checked in at ${new Date(guest.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'This guest has already been checked in.'}
      </p>

      <div className="w-full max-w-sm rounded-sm px-6 py-5 space-y-3 mb-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">Name</span>
          <span className="text-white font-bold text-base">{guest.full_name}</span>
        </div>
        <GuestInfoRow label="Ticket" value={guest.ticket_type.toUpperCase()} />
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}
      >
        Scan Next Guest
      </button>
    </div>
  )
}

export function InvalidScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white" style={{ background: '#3a0f0f' }}>
      <div className="w-20 h-20 rounded-sm flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Unrecognised</p>
      <h1 className="font-display text-4xl font-semibold mb-1 text-center text-white">Not Found</h1>
      <p className="text-sm mb-10 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>This QR code is not recognised.</p>

      <button
        onClick={onReset}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}
      >
        Try Again
      </button>
    </div>
  )
}

export function GuestFoundScreen({
  guest, checkingIn, onConfirm, onCancel,
}: {
  guest: Guest
  checkingIn: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-lg mx-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-sm border flex items-center justify-center transition hover:bg-[var(--bg)]"
          style={{ borderColor: 'var(--line)', color: 'var(--muted)', background: '#fff' }}
        >
          ←
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--brand)' }}>Guest Found</p>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Confirm to check in</p>
        </div>
      </div>

      <div className="bg-white overflow-hidden mb-6" style={{ border: '1px solid var(--line)', borderRadius: '2px' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--muted-2)' }}>Guest</p>
              <h2 className="font-display text-2xl font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{guest.full_name}</h2>
              {guest.event_name && (
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{guest.event_name}</p>
              )}
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-sm border flex-shrink-0 mt-1 ${TICKET_COLORS[guest.ticket_type] ?? TICKET_COLORS.general}`}>
              {guest.ticket_type.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: 'var(--line)' }}>
          {[
            { label: 'Phone', value: guest.phone_number || '—' },
            { label: 'Registered', value: new Date(guest.registered_at).toLocaleDateString() },
            { label: 'Table', value: guest.table_number || '—' },
            { label: 'Seat', value: guest.seat_number || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-4" style={{ borderColor: 'var(--line)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-0.5" style={{ color: 'var(--muted-2)' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={checkingIn}
        className="w-full font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase transition-all active:scale-95 disabled:opacity-60 mb-3"
        style={{ background: 'var(--brand)', color: '#fff' }}
      >
        {checkingIn ? 'Checking in…' : 'Confirm Check-In'}
      </button>
      <button
        onClick={onCancel}
        className="w-full font-semibold rounded-sm py-4 text-sm transition-colors"
        style={{ border: '1px solid var(--line)', color: 'var(--muted)', background: '#fff' }}
      >
        Cancel
      </button>
    </div>
  )
}
