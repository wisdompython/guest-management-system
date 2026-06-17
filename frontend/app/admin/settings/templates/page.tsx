'use client'

import { useState, useEffect } from 'react'
import { api, WhatsAppTemplate } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'

// Example values shown in the preview bubble
const VAR_EXAMPLES: Record<string, string> = {
  guest_name:   'John Doe',
  event_name:   'The Grand Birthday Bash',
  event_date:   'Friday, 20 June 2025 at 7:00 PM',
  venue:        'The Eko Hotel, Lagos',
  ticket_type:  'VIP',
  table_number: 'Table 12',
  seat_number:  'Seat 4A',
}

function resolvePreview(bodyText: string, bodyParams: string[]): string {
  let text = bodyText
  bodyParams.forEach((key, i) => {
    text = text.replaceAll(`{{${i + 1}}}`, VAR_EXAMPLES[key] ?? `[${key}]`)
  })
  return text
}

function PreviewBubble({ bodyText, bodyParams, hasHeaderImage }: { bodyText: string; bodyParams: string[]; hasHeaderImage: boolean }) {
  if (!bodyText.trim()) return null
  const preview = resolvePreview(bodyText, bodyParams)
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--muted)' }}>
        Preview
      </p>
      <div className="inline-block max-w-sm rounded-[16px] rounded-tl-[4px] px-4 py-3 text-sm leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {hasHeaderImage && (
          <div className="mb-2 flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Guest pass image
          </div>
        )}
        <p style={{ whiteSpace: 'pre-wrap' }}>{preview}</p>
      </div>
      {bodyParams.length > 0 && (
        <p className="mt-1.5 text-[11px]" style={{ color: 'var(--muted-2)' }}>
          Showing example values — actual messages use real guest data.
        </p>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  useRequireAuth('super_admin')
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [availableVars, setAvailableVars] = useState<{ key: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', display_name: '', description: '', body_text: '',
    body_params: [] as string[], has_header_image: false,
  })

  useEffect(() => {
    Promise.all([api.getWhatsAppTemplates(), api.getAvailableTemplateVars()])
      .then(([t, v]) => { setTemplates(t); setAvailableVars(v) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function addParam(key: string) {
    setForm((f) => ({ ...f, body_params: [...f.body_params, key] }))
  }
  function removeParam(i: number) {
    setForm((f) => ({ ...f, body_params: f.body_params.filter((_, idx) => idx !== i) }))
  }
  function moveParam(i: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...f.body_params]
      const j = i + dir
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...f, body_params: arr }
    })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const t = await api.createWhatsAppTemplate({ ...form, is_active: true })
      setTemplates((prev) => [...prev, t])
      setForm({ name: '', display_name: '', description: '', body_text: '', body_params: [], has_header_image: false })
      setAdding(false); showToast('Template added.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add template.')
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this template?')) return
    await api.deleteWhatsAppTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    if (expandedId === id) setExpandedId(null)
    showToast('Template removed.')
  }

  const varLabel = (key: string) => availableVars.find((v) => v.key === key)?.label ?? key
  const unusedVars = availableVars.filter((v) => !form.body_params.includes(v.key))

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-3xl">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          style={{ background: 'var(--brand)' }}>{toast}</div>
      )}

      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--line)' }}>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--brand)' }}>Admin</p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: 'var(--ink)' }}>WhatsApp Templates</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Register approved Meta templates and define which guest/event variables to pass as parameters.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-6 rounded-[12px] px-5 py-4 text-sm" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <p className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>How parameters work</p>
        <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>
          Meta templates have numbered placeholders like{' '}
          <code className="px-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.08)' }}>{'{{1}}'}</code>,{' '}
          <code className="px-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.08)' }}>{'{{2}}'}</code>, etc.
          Paste the body text exactly as approved in Meta, then add variables below <strong>in the same order</strong>.
          The preview shows how the message will look with real guest data.
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Registered templates</p>
          <button onClick={() => setAdding((v) => !v)}
            className="px-3 py-1.5 text-xs font-semibold rounded-full transition"
            style={{ background: adding ? 'var(--danger-bg)' : 'var(--brand-soft)', color: adding ? 'var(--danger)' : 'var(--brand)' }}>
            {adding ? 'Cancel' : '+ Add template'}
          </button>
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="p-5 space-y-4" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
            {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
                  Template name *
                </label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. birthday_invite_v1"
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>Exact name from Meta Business Manager</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
                  Display name
                </label>
                <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="e.g. Birthday Invite"
                  className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              </div>
            </div>

            {/* Body text */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
                Template body text
              </label>
              <textarea
                value={form.body_text}
                onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
                rows={4}
                placeholder={'Hello {{1}}, you\'re invited to {{2}} on {{3}}.\n\nPlease find your guest pass attached.'}
                className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)] resize-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>
                Paste the body text exactly as approved in Meta. Use {'{{1}}'}, {'{{2}}'} for variables.
              </p>
            </div>

            {/* Header image toggle */}
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, has_header_image: !f.has_header_image }))}
                className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                style={{ background: form.has_header_image ? 'var(--brand)' : 'rgba(255,255,255,0.15)' }}>
                <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                  style={{ left: form.has_header_image ? '18px' : '2px' }} />
              </button>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Header image</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Template has an image header — the guest pass image will be sent</p>
              </div>
            </div>

            {/* Body params builder */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--muted)' }}>
                Body parameters (in order)
              </p>
              {form.body_params.length === 0 && (
                <p className="text-xs mb-2" style={{ color: 'var(--muted-2)' }}>No parameters yet. Add variables below.</p>
              )}
              {form.body_params.map((key, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ background: 'var(--brand)' }}>{i + 1}</span>
                  <span className="flex-1 rounded px-3 py-1.5 text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
                    {varLabel(key)}
                    <span className="ml-1.5 font-normal font-mono" style={{ color: 'var(--muted)' }}>({key})</span>
                  </span>
                  <button type="button" onClick={() => moveParam(i, -1)} disabled={i === 0}
                    className="px-1.5 py-1 text-xs disabled:opacity-30" style={{ color: 'var(--muted)' }}>↑</button>
                  <button type="button" onClick={() => moveParam(i, 1)} disabled={i === form.body_params.length - 1}
                    className="px-1.5 py-1 text-xs disabled:opacity-30" style={{ color: 'var(--muted)' }}>↓</button>
                  <button type="button" onClick={() => removeParam(i)}
                    className="px-2 py-1 text-xs rounded-full" style={{ color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>✕</button>
                </div>
              ))}
              {unusedVars.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] mb-2" style={{ color: 'var(--muted-2)' }}>Add variable:</p>
                  <div className="flex flex-wrap gap-2">
                    {unusedVars.map((v) => (
                      <button key={v.key} type="button" onClick={() => addParam(v.key)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full transition"
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                        + {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live preview */}
            <PreviewBubble
              bodyText={form.body_text}
              bodyParams={form.body_params}
              hasHeaderImage={form.has_header_image}
            />

            <button type="submit" disabled={submitting}
              className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--brand)' }}>
              {submitting ? 'Adding…' : 'Add Template'}
            </button>
          </form>
        )}

        {/* Template list */}
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {loading && <p className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
          {!loading && templates.length === 0 && (
            <p className="px-5 py-5 text-sm" style={{ color: 'var(--muted)' }}>No templates registered yet.</p>
          )}
          {templates.map((t) => {
            const isExpanded = expandedId === t.id
            return (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t.display_name || t.name}</p>
                      {t.has_header_image && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded"
                          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                          Header image
                        </span>
                      )}
                      {!t.is_active && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    {t.display_name && (
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted)' }}>{t.name}</p>
                    )}
                    {t.body_params?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {t.body_params.map((key, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                            <span className="font-bold" style={{ color: 'var(--brand)' }}>{i + 1}</span>
                            {varLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expandable preview */}
                    {t.body_text && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold transition hover:opacity-70"
                        style={{ color: 'var(--brand)' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                        {isExpanded ? 'Hide preview' : 'Show preview'}
                      </button>
                    )}

                    {isExpanded && (
                      <PreviewBubble
                        bodyText={t.body_text}
                        bodyParams={t.body_params || []}
                        hasHeaderImage={t.has_header_image}
                      />
                    )}
                  </div>

                  <button onClick={() => handleDelete(t.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition"
                    style={{ border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
