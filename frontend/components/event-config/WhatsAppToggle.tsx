'use client'

interface Props {
  whatsappEnabled: boolean
  onChange: (enabled: boolean) => void
}

export function WhatsAppToggle({ whatsappEnabled, onChange }: Props) {
  return (
    <div
      data-tour="event-whatsapp-toggle"
      className="flex items-start justify-between gap-4 rounded-[14px] p-4"
      style={{ border: '1px solid var(--line)', background: whatsappEnabled ? 'var(--brand-soft)' : 'var(--bg)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>WhatsApp Delivery</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
          {whatsappEnabled
            ? 'Passes will be sent via WhatsApp. Phone number is required for all guests.'
            : 'WhatsApp delivery is off for this event. Phone number is optional.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={whatsappEnabled}
        onClick={() => onChange(!whatsappEnabled)}
        className="relative mt-0.5 h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors"
        style={{ background: whatsappEnabled ? 'var(--brand)' : '#d1d5db' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ left: '2px', transform: whatsappEnabled ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
