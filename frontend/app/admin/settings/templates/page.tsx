'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, WhatsAppTemplate } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'

export default function TemplatesPage() {
  useRequireAuth('super_admin')
  const router = useRouter()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', display_name: '', description: '' })

  useEffect(() => {
    api.getWhatsAppTemplates().then(setTemplates).catch(console.error).finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const t = await api.createWhatsAppTemplate({ ...form, is_active: true })
      setTemplates((prev) => [...prev, t])
      setForm({ name: '', display_name: '', description: '' })
      setAdding(false)
      showToast('Template added.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add template.')
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this template?')) return
    await api.deleteWhatsAppTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    showToast('Template removed.')
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          style={{ background: 'var(--brand)' }}>{toast}</div>
      )}

      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--line)' }}>
        <button onClick={() => router.push('/admin/settings')}
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] transition hover:opacity-70"
          style={{ color: 'var(--brand)' }}>← Settings</button>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>Admin</p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>WhatsApp Templates</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Register approved Meta templates here so they appear in the reminders selector.
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Templates</p>
          <button onClick={() => setAdding((v) => !v)}
            className="px-3 py-1.5 text-xs font-semibold rounded-full transition"
            style={{ background: adding ? 'var(--danger-bg)' : 'var(--brand-soft)', color: adding ? 'var(--danger)' : 'var(--brand)' }}>
            {adding ? 'Cancel' : '+ Add template'}
          </button>
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="p-5 space-y-3" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
            {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
                  Template name *
                </label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. event_reminder_1day"
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>Exact name from Meta Business Manager</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
                  Display name
                </label>
                <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="e.g. 1 Day Reminder"
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
                Description
              </label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional note"
                className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <button type="submit" disabled={submitting}
              className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--brand)' }}>
              {submitting ? 'Adding…' : 'Add Template'}
            </button>
          </form>
        )}

        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {loading && <p className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
          {!loading && templates.length === 0 && (
            <p className="px-5 py-5 text-sm" style={{ color: 'var(--muted)' }}>No templates yet. Add one to enable the reminder template selector.</p>
          )}
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t.display_name || t.name}</p>
                {t.display_name && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted)' }}>{t.name}</p>}
                {t.description && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-2)' }}>{t.description}</p>}
              </div>
              <button onClick={() => handleDelete(t.id)}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
