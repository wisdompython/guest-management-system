'use client'

import { useState, useEffect } from 'react'
import { api, WhatsAppTemplate, TemplateCategory } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'

const PAGE_SIZE = 20

const VAR_EXAMPLES: Record<string, string> = {
  guest_name:   'John Doe',
  event_name:   'The Grand Birthday Bash',
  event_date:   'Friday, 20 June 2025 at 7:00 PM',
  venue:        'The Eko Hotel, Lagos',
  ticket_type:  'VIP',
  table_number: 'Table 12',
  seat_number:  'Seat 4A',
}

type FormState = {
  name: string
  display_name: string
  description: string
  category: number | null
  body_text: string
  body_params: string[]
  has_header_image: boolean
}

const EMPTY_FORM: FormState = {
  name: '', display_name: '', description: '', category: null,
  body_text: '', body_params: [], has_header_image: false,
}

function resolvePreview(bodyText: string, bodyParams: string[]): string {
  let text = bodyText
  bodyParams.forEach((key, i) => {
    text = text.replaceAll(`{{${i + 1}}}`, VAR_EXAMPLES[key] ?? `[${key}]`)
  })
  return text
}

function countPlaceholders(bodyText: string): number {
  const matches = bodyText.match(/\{\{\d+\}\}/g) ?? []
  const nums = matches.map((m) => parseInt(m.replace(/\D/g, ''), 10))
  return nums.length > 0 ? Math.max(...nums) : 0
}

function PreviewBubble({ bodyText, bodyParams, hasHeaderImage }: {
  bodyText: string; bodyParams: string[]; hasHeaderImage: boolean
}) {
  if (!bodyText.trim()) return null
  const preview = resolvePreview(bodyText, bodyParams)
  const placeholderCount = countPlaceholders(bodyText)
  const mismatch = placeholderCount !== bodyParams.length

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--muted)' }}>Preview</p>
      {mismatch && (
        <p className="mb-2 text-xs rounded-lg px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠ Body has {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''} but {bodyParams.length} parameter{bodyParams.length !== 1 ? 's' : ''} defined — these must match.
        </p>
      )}
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
      {bodyParams.length > 0 && !mismatch && (
        <p className="mt-1.5 text-[11px]" style={{ color: 'var(--muted-2)' }}>
          Showing example values — actual messages use real guest data.
        </p>
      )}
    </div>
  )
}

function TemplateForm({
  form, setForm, categories, availableVars, error, submitting, submitLabel, onSubmit, onCancel,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  categories: TemplateCategory[]
  availableVars: { key: string; label: string }[]
  error: string
  submitting: boolean
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  const varLabel = (key: string) => availableVars.find((v) => v.key === key)?.label ?? key
  const unusedVars = availableVars.filter((v) => !form.body_params.includes(v.key))

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

  const placeholderCount = countPlaceholders(form.body_text)
  const mismatch = form.body_text.trim() && placeholderCount !== form.body_params.length

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
            Template name *
          </label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. birthday_invite_v1"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>Exact name from Meta Business Manager</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
            Display name
          </label>
          <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder="e.g. Birthday Invite"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
          Category
        </label>
        <select
          value={form.category ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value ? Number(e.target.value) : null }))}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', colorScheme: 'dark' }}>
          <option value="">— No category —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
          Body text
        </label>
        <textarea
          value={form.body_text}
          onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
          rows={6}
          placeholder={"Hello {{1}}, you're invited to {{2}} on {{3}}.\n\nPlease find your guest pass attached."}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)] resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${mismatch ? 'rgba(239,68,68,0.5)' : 'var(--line)'}`, color: 'var(--ink)' }}
        />
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>
          Paste exactly as approved in Meta. Use {'{{1}}'}, {'{{2}}'} for variables.
        </p>
      </div>

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
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Template has an image header — guest pass will be sent</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--muted)' }}>
          Body parameters <span className="font-normal normal-case tracking-normal" style={{ color: 'var(--muted-2)' }}>(in order)</span>
        </p>
        {form.body_params.length === 0 && (
          <p className="text-xs mb-2" style={{ color: 'var(--muted-2)' }}>No parameters yet.</p>
        )}
        {form.body_params.map((key, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ background: 'var(--brand)' }}>{i + 1}</span>
            <span className="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
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

      <PreviewBubble bodyText={form.body_text} bodyParams={form.body_params} hasHeaderImage={form.has_header_image} />

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={submitting || !!mismatch}
          className="rounded-full px-5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ background: 'var(--brand)' }}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-full px-5 py-2 text-xs font-semibold transition"
          style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function TemplatesPage() {
  useRequireAuth('super_admin')
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [availableVars, setAvailableVars] = useState<{ key: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [catSubmitting, setCatSubmitting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const selectedTemplate = templates.find((t) => t.id === selectedId)

  useEffect(() => { setPage(1) }, [categoryFilter])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) }
    if (categoryFilter) params.category = categoryFilter
    api.getWhatsAppTemplatesPaged(params)
      .then((d) => { setTemplates(d.results); setCount(d.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, categoryFilter])

  useEffect(() => {
    Promise.all([api.getTemplateCategories(), api.getAvailableTemplateVars()])
      .then(([cats, vars]) => { setCategories(cats); setAvailableVars(vars) })
      .catch(console.error)
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function openNew() {
    setSelectedId('new')
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function openEdit(t: WhatsAppTemplate) {
    setSelectedId(t.id)
    setForm({
      name: t.name, display_name: t.display_name || '', description: t.description || '',
      category: t.category, body_text: t.body_text || '',
      body_params: t.body_params || [], has_header_image: t.has_header_image,
    })
    setFormError('')
  }

  function closePanel() { setSelectedId(null); setFormError('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(''); setSubmitting(true)
    try {
      if (selectedId === 'new') {
        const t = await api.createWhatsAppTemplate({ ...form, is_active: true })
        setTemplates((prev) => [t, ...prev])
        setCount((c) => c + 1)
        showToast('Template added.')
        closePanel()
      } else if (typeof selectedId === 'number') {
        const updated = await api.updateWhatsAppTemplate(selectedId, form)
        setTemplates((prev) => prev.map((t) => t.id === selectedId ? updated : t))
        showToast('Template saved.')
        closePanel()
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save template.')
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this template?')) return
    await api.deleteWhatsAppTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    setCount((c) => c - 1)
    if (selectedId === id) closePanel()
    showToast('Template removed.')
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    setCatSubmitting(true)
    try {
      const cat = await api.createTemplateCategory(newCatName.trim())
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName(''); setAddingCat(false)
      showToast(`Category "${cat.name}" added.`)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to add category.')
    } finally { setCatSubmitting(false) }
  }

  async function handleDeleteCategory(cat: TemplateCategory) {
    if (!confirm(`Remove category "${cat.name}"? Templates in this category will become uncategorised.`)) return
    await api.deleteTemplateCategory(cat.id)
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    if (categoryFilter === String(cat.id)) setCategoryFilter('')
    showToast(`Category "${cat.name}" removed.`)
  }

  const varLabel = (key: string) => availableVars.find((v) => v.key === key)?.label ?? key

  const panelOpen = selectedId !== null

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          style={{ background: 'var(--brand)' }}>{toast}</div>
      )}

      {/* Top bar */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--sidebar)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--brand)' }}>Admin</p>
          <h1 className="text-xl font-bold mt-0.5" style={{ color: 'var(--ink)' }}>WhatsApp Templates</h1>
        </div>
        <button onClick={openNew}
          className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ background: 'var(--brand)' }}>
          + Add template
        </button>
      </div>

      {/* Body: list + optional panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: categories + list */}
        <div className="flex flex-col overflow-hidden" style={{ width: panelOpen ? '380px' : '100%', flexShrink: 0, borderRight: panelOpen ? '1px solid var(--line)' : 'none', transition: 'width 0.2s' }}>

          {/* Categories */}
          <div className="flex-shrink-0 px-5 py-3" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-2)' }}>Categories</p>
              <button onClick={() => setAddingCat((v) => !v)}
                className="text-xs font-semibold transition hover:opacity-70"
                style={{ color: addingCat ? 'var(--danger)' : 'var(--brand)' }}>
                {addingCat ? 'Cancel' : '+ New'}
              </button>
            </div>
            {addingCat && (
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-2">
                <input required autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <button type="submit" disabled={catSubmitting}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--brand)' }}>
                  {catSubmitting ? '…' : 'Add'}
                </button>
              </form>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter('')}
                className="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                style={{
                  background: !categoryFilter ? 'var(--brand)' : 'rgba(255,255,255,0.06)',
                  color: !categoryFilter ? '#fff' : 'var(--muted)',
                  border: `1px solid ${!categoryFilter ? 'var(--brand)' : 'var(--line)'}`,
                }}>
                All
              </button>
              {categories.map((cat) => (
                <span key={cat.id} className="flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1"
                  style={{
                    background: categoryFilter === String(cat.id) ? 'var(--brand-soft)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${categoryFilter === String(cat.id) ? 'var(--brand)' : 'var(--line)'}`,
                  }}>
                  <button
                    onClick={() => setCategoryFilter(categoryFilter === String(cat.id) ? '' : String(cat.id))}
                    className="text-xs font-semibold"
                    style={{ color: categoryFilter === String(cat.id) ? 'var(--brand)' : 'var(--muted)' }}>
                    {cat.name}
                  </button>
                  <button onClick={() => handleDeleteCategory(cat)}
                    className="flex items-center justify-center rounded-full h-4 w-4 text-[10px] transition hover:bg-[rgba(239,68,68,0.2)]"
                    style={{ color: 'var(--muted-2)' }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
            ) : templates.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {categoryFilter ? 'No templates in this category.' : 'No templates yet.'}
                </p>
              </div>
            ) : (
              <div>
                {templates.map((t) => {
                  const isActive = selectedId === t.id
                  return (
                    <button key={t.id}
                      onClick={() => isActive ? closePanel() : openEdit(t)}
                      className="w-full text-left px-5 py-4 transition-colors"
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: isActive ? 'var(--brand-soft)' : 'transparent',
                      }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: isActive ? 'var(--brand)' : 'var(--ink)' }}>
                            {t.display_name || t.name}
                          </p>
                          {t.display_name && (
                            <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: 'var(--muted-2)' }}>{t.name}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {t.category_name && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                                {t.category_name}
                              </span>
                            )}
                            {t.has_header_image && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full"
                                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                                Image
                              </span>
                            )}
                            {t.body_params?.length > 0 && (
                              <span className="text-[10px]" style={{ color: 'var(--muted-2)' }}>
                                {t.body_params.length} param{t.body_params.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                          style={{ color: isActive ? 'var(--brand)' : 'var(--muted-2)', flexShrink: 0, marginTop: 2 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-shrink-0 items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {count} templates · Page {page}/{totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
                  style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>‹</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
                  style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>›</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: detail / edit panel */}
        {panelOpen && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex flex-shrink-0 items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted-2)' }}>
                  {selectedId === 'new' ? 'New template' : 'Edit template'}
                </p>
                {selectedTemplate && (
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                    {selectedTemplate.display_name || selectedTemplate.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {typeof selectedId === 'number' && (
                  <button onClick={() => handleDelete(selectedId)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                    style={{ border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                    Remove
                  </button>
                )}
                <button onClick={closePanel}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[rgba(255,255,255,0.06)]"
                  style={{ color: 'var(--muted)' }}>✕</button>
              </div>
            </div>

            {/* Info banner */}
            {selectedId === 'new' && (
              <div className="flex-shrink-0 px-6 py-3 text-xs" style={{ background: 'rgba(184,150,62,0.07)', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                Meta templates use numbered placeholders like{' '}
                <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>{'{{1}}'}</code>,{' '}
                <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>{'{{2}}'}</code>.
                Paste the body text exactly as approved, then map each placeholder to a guest variable below.
              </div>
            )}

            {/* Form */}
            <div className="flex-1 overflow-auto px-6 py-5">
              <TemplateForm
                form={form} setForm={setForm} categories={categories}
                availableVars={availableVars} error={formError} submitting={submitting}
                submitLabel={selectedId === 'new' ? 'Add Template' : 'Save Changes'}
                onSubmit={handleSubmit} onCancel={closePanel}
              />
            </div>
          </div>
        )}

        {/* Empty right panel prompt */}
        {!panelOpen && !loading && templates.length > 0 && (
          <div className="hidden lg:flex flex-1 items-center justify-center" style={{ borderLeft: '1px solid var(--line)' }}>
            <div className="text-center">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24"
                className="mx-auto mb-3" style={{ color: 'var(--muted-2)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a template to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
