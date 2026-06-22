'use client'

import { useState, useEffect } from 'react'
import { api, EventReminder, WhatsAppTemplate } from '@/lib/api'

const PRESET_HOURS = [
  { label: '7 days before',  hours: 168 },
  { label: '3 days before',  hours: 72 },
  { label: '1 day before',   hours: 24 },
  { label: '3 hours before', hours: 3 },
  { label: '1 hour before',  hours: 1 },
]

function hoursLabel(h: number) {
  if (h >= 24 && h % 24 === 0) return `${h / 24} day${h / 24 > 1 ? 's' : ''} before`
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h before`
  return `${h} hour${h > 1 ? 's' : ''} before`
}

interface Props { eventId: number }

export function RemindersSection({ eventId }: Props) {
  const [reminders, setReminders] = useState<EventReminder[]>([])
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [sending, setSending] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // Form state
  const [hoursMode, setHoursMode] = useState<'preset' | 'custom'>('preset')
  const [presetHours, setPresetHours] = useState(24)
  const [customHours, setCustomHours] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateMode, setTemplateMode] = useState<'pick' | 'custom'>('pick')

  useEffect(() => {
    Promise.all([
      api.getReminders(eventId),
      api.getWhatsAppTemplates(),
    ]).then(([r, t]) => {
      setReminders(r)
      setTemplates(t)
    }).catch(() => setError('Could not load reminders.'))
      .finally(() => setLoading(false))
  }, [eventId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const hours = hoursMode === 'preset' ? presetHours : parseInt(customHours)
    if (!hours || hours < 1) { setError('Enter a valid number of hours.'); return }
    if (!templateName.trim()) { setError('Template name is required.'); return }
    setError('')
    try {
      const created = await api.createReminder({ event: eventId, hours_before: hours, template_name: templateName.trim() })
      setReminders((prev) => [...prev, created].sort((a, b) => a.hours_before - b.hours_before))
      setTemplateName(''); setCustomHours(''); setAdding(false)
      showToast('Reminder added.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add reminder.')
    }
  }

  async function handleToggle(r: EventReminder) {
    const updated = await api.updateReminder(r.id, { is_active: !r.is_active })
    setReminders((prev) => prev.map((x) => x.id === r.id ? updated : x))
  }

  async function handleDelete(id: number) {
    await api.deleteReminder(id)
    setReminders((prev) => prev.filter((r) => r.id !== id))
    showToast('Reminder deleted.')
  }

  async function handleSendNow(r: EventReminder) {
    setSending(r.id)
    try {
      const res = await api.sendReminderNow(r.id)
      showToast(`Queued ${res.queued} reminder message${res.queued !== 1 ? 's' : ''}.`)
    } catch { showToast('Send failed.') }
    finally { setSending(null) }
  }

  return (
    <div className="overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--panel)' }}>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          style={{ background: 'var(--brand)' }}>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Reminders</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            WhatsApp reminders sent automatically before the event.
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition"
          style={{ background: adding ? 'var(--danger-bg)' : 'var(--brand-soft)', color: adding ? 'var(--danger)' : 'var(--brand)' }}>
          {adding ? 'Cancel' : '+ Add reminder'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="p-6 space-y-4" style={{ borderBottom: '1px solid var(--line)' }}>
          {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--muted)' }}>When to send</p>
            <div className="flex gap-2 mb-3">
              {(['preset', 'custom'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setHoursMode(m)}
                  className="px-3 py-1 text-xs font-semibold rounded-full transition"
                  style={{ background: hoursMode === m ? 'var(--brand-soft)' : 'transparent', color: hoursMode === m ? 'var(--brand)' : 'var(--muted)', border: '1px solid var(--line)' }}>
                  {m === 'preset' ? 'Preset' : 'Custom'}
                </button>
              ))}
            </div>
            {hoursMode === 'preset' ? (
              <div className="flex flex-wrap gap-2">
                {PRESET_HOURS.map(({ label, hours }) => (
                  <button key={hours} type="button" onClick={() => setPresetHours(hours)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full transition"
                    style={{ background: presetHours === hours ? 'var(--brand)' : 'var(--panel-2)', color: presetHours === hours ? '#fff' : 'var(--ink)', border: '1px solid var(--line)' }}>
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="number" min="1" value={customHours} onChange={(e) => setCustomHours(e.target.value)}
                  placeholder="e.g. 48"
                  className="w-24 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>hours before</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--muted)' }}>
              WhatsApp Template
            </p>
            {templates.length > 0 && (
              <div className="flex gap-2 mb-3">
                {(['pick', 'custom'] as const).map((m) => (
                  <button key={m} type="button"
                    onClick={() => {
                      setTemplateMode(m)
                      setTemplateName('')
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-full transition"
                    style={{ background: templateMode === m ? 'var(--brand-soft)' : 'transparent', color: templateMode === m ? 'var(--brand)' : 'var(--muted)', border: '1px solid var(--line)' }}>
                    {m === 'pick' ? 'Select template' : 'Type name'}
                  </button>
                ))}
              </div>
            )}
            {(templateMode === 'pick' && templates.length > 0) ? (
              <select value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', colorScheme: 'dark' }}>
                <option value="">— Select a template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.name}>{t.display_name || t.name}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. event_reminder_1day"
                className="w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            )}
            <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>
              Must match an approved template in your Meta WhatsApp Business account.
            </p>
          </div>

          <button type="submit"
            className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--brand)' }}>
            Add Reminder
          </button>
        </form>
      )}

      {/* Reminder list */}
      <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
        {loading && (
          <p className="px-6 py-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        )}
        {!loading && reminders.length === 0 && (
          <p className="px-6 py-5 text-sm" style={{ color: 'var(--muted)' }}>
            No reminders set. Add one to automatically notify guests before the event.
          </p>
        )}
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-6 py-4 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {hoursLabel(r.hours_before)}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded"
                  style={{ background: r.is_active ? 'var(--brand-soft)' : 'rgba(255,255,255,0.06)', color: r.is_active ? 'var(--brand)' : 'var(--muted)' }}>
                  {r.is_active ? 'Active' : 'Paused'}
                </span>
                {r.logs_sent > 0 && (
                  <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {r.logs_sent} sent
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-2)' }}>{r.template_name}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleSendNow(r)} disabled={sending === r.id}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-full transition disabled:opacity-50"
                style={{ border: '1px solid var(--brand)', color: 'var(--brand)' }}>
                {sending === r.id ? 'Sending…' : 'Send now'}
              </button>
              <button onClick={() => handleToggle(r)}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-full transition"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
                {r.is_active ? 'Pause' : 'Resume'}
              </button>
              <button onClick={() => handleDelete(r.id)}
                className="px-2 py-1.5 text-[11px] font-semibold rounded-full transition"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
