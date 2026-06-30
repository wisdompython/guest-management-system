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

export function DuplicateScreen({ guest, onNext }: { guest: Guest; onNext: () => void }) {
  return (
    <div className="h-full overflow-auto flex flex-col items-center justify-center px-6 py-12 text-white" style={{ background: '#4a3000' }}>
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
      <button onClick={onNext}
        className="w-full max-w-sm font-semibold rounded-sm py-4 text-sm tracking-[0.06em] uppercase active:scale-95 transition-transform"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        Scan Next Guest
      </button>
    </div>
  )
}
