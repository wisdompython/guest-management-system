'use client'

import { Guest } from '@/lib/api'

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
      <button onClick={onNext}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Scan Next Guest
      </button>
    </div>
  )
}
