'use client'

import { Event } from '@/lib/api'

const field = 'w-full rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#1a2030] px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]'
const label = 'block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] mb-1.5'

interface Props {
  events: Event[]
  selectedEvent: Event | null
  submitting: boolean
  requiredCols: string[]
  optionalCols: string[]
  ticketTypes: { value: string; label: string }[] | undefined
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onEventChange: (id: string) => void
}

export function UploadForm({
  events, selectedEvent, submitting, requiredCols, optionalCols, ticketTypes, onSubmit, onEventChange,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]">
      <div className="border-b border-[var(--line)] px-6 py-4">
        <h2 data-tour="bulk-upload-header" className="text-sm font-semibold text-[var(--ink)]">Upload details</h2>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <label className={label}>Event *</label>
          <select data-tour="bulk-event-select" name="event" required className={field} onChange={(e) => onEventChange(e.target.value)}>
            <option value="">Select an event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div className="rounded-[12px] space-y-3 border border-[var(--line)] bg-[var(--bg)] px-4 py-3.5 text-xs">
            <div>
              <p className="mb-1.5 font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>Required columns</p>
              <div className="flex flex-wrap gap-1.5">
                {requiredCols.map((c) => (
                  <code key={c} className="rounded-md px-2 py-0.5 font-mono font-semibold"
                    style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{c}</code>
                ))}
              </div>
            </div>
            {optionalCols.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>Optional columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {optionalCols.map((c) => (
                    <code key={c} className="rounded-md px-2 py-0.5 font-mono"
                      style={{ background: '#f1f5f9', color: 'var(--muted)' }}>{c}</code>
                  ))}
                </div>
              </div>
            )}
            {ticketTypes && ticketTypes.length > 0 && (
              <div>
                <p className="mb-1.5 font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>ticket_type values</p>
                <div className="flex flex-wrap gap-1.5">
                  {ticketTypes.map((t) => (
                    <span key={t.value} className="rounded-md px-2 py-0.5"
                      style={{ background: '#f1f5f9', color: 'var(--muted)' }}>
                      <code className="font-mono">{t.value}</code>
                      <span className="ml-1" style={{ color: 'var(--muted-2)' }}>({t.label})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p style={{ color: 'var(--muted-2)' }}>
              WhatsApp delivery: <b style={{ color: 'var(--ink)' }}>{selectedEvent.whatsapp_enabled ? 'Enabled' : 'Disabled'}</b>
            </p>
          </div>
        )}

        <div>
          <label className={label}>CSV File *</label>
          <input data-tour="bulk-csv-input" name="csv_file" type="file" accept=".csv"
            className="w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--brand-strong)]" />
          {!selectedEvent && (
            <p className="mt-1.5 text-xs text-[var(--muted)]">Select an event above to see which columns are required.</p>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--line)] px-6 py-4">
        <button data-tour="bulk-submit-button" type="submit" disabled={submitting}
          className="w-full rounded-full bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60">
          {submitting ? 'Uploading…' : 'Upload Guests'}
        </button>
      </div>
    </form>
  )
}
