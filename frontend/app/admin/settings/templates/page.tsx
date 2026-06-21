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
          ⚠ Body text has {placeholderCount} placeholder{placeholderCount !== 1 ? 's' : ''} but {bodyParams.length} parameter{bodyParams.length !== 1 ? 's' : ''} are defined. These must match.
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
    <form onSubmit={onSubmit} className="p-5 space-y-4" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
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

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
          Category
        </label>
        <select
          value={form.category ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value ? Number(e.target.value) : null }))}
          className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', colorScheme: 'dark' }}>
          <option value="">— No category —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--muted)' }}>
          Template body text
        </label>
        <textarea
          value={form.body_text}
          onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
          rows={5}
          placeholder={"Hello {{1}}, you're invited to {{2}} on {{3}}.\n\nPlease find your guest pass attached."}
          className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)] resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${mismatch ? 'rgba(239,68,68,0.5)' : 'var(--line)'}`, color: 'var(--ink)' }}
        />
        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-2)' }}>
          Paste the body text exactly as approved in Meta. Use {'{{1}}'}, {'{{2}}'} for variables.
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
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Template has an image header — the guest pass image will be sent</p>
        </div>
      </div>

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

      <PreviewBubble bodyText={form.body_text} bodyParams={form.body_params} hasHeaderImage={form.has_header_image} />

      <div className="flex gap-3">
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
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  // Category management
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [catSubmitting, setCatSubmitting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

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

  function startEdit(t: WhatsAppTemplate) {
    setEditingId(t.id)
    setEditForm({
      name: t.name, display_name: t.display_name || '', description: t.description || '',
      category: t.category, body_text: t.body_text || '',
      body_params: t.body_params || [], has_header_image: t.has_header_image,
    })
    setEditError(''); setExpandedId(null); setAdding(false)
  }
  function cancelEdit() { setEditingId(null); setEditError('') }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddError(''); setAddSubmitting(true)
    try {
      const t = await api.createWhatsAppTemplate({ ...addForm, is_active: true })
      setTemplates((prev) => [t, ...prev])
      setCount((c) => c + 1)
      setAddForm(EMPTY_FORM); setAdding(false)
      showToast('Template added.')
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add template.')
    } finally { setAddSubmitting(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId === null) return
    setEditError(''); setEditSubmitting(true)
    try {
      const updated = await api.updateWhatsAppTemplate(editingId, editForm)
      setTemplates((prev) => prev.map((t) => t.id === editingId ? updated : t))
      setEditingId(null); showToast('Template saved.')
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to save template.')
    } finally { setEditSubmitting(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this template?')) return
    await api.deleteWhatsAppTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    setCount((c) => c - 1)
    if (expandedId === id) setExpandedId(null)
    if (editingId === id) setEditingId(null)
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

      {/* Categories manager */}
      <div className="mb-6 rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background: 'var(--panel)', borderBottom: categories.length || addingCat ? '1px solid var(--line)' : undefined }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Categories</p>
          <button onClick={() => setAddingCat((v) => !v)}
            className="px-3 py-1 text-xs font-semibold rounded-full transition"
            style={{ background: addingCat ? 'var(--danger-bg)' : 'var(--brand-soft)', color: addingCat ? 'var(--danger)' : 'var(--brand)' }}>
            {addingCat ? 'Cancel' : '+ New category'}
          </button>
        </div>
        {addingCat && (
          <form onSubmit={handleAddCategory} className="flex gap-2 px-5 py-3"
            style={{ borderBottom: categories.length ? '1px solid var(--line)' : undefined, background: 'var(--bg)' }}>
            <input required autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Birthday"
              className="flex-1 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            <button type="submit" disabled={catSubmitting}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--brand)' }}>
              {catSubmitting ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 py-3">
            {categories.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {cat.name}
                <button onClick={() => handleDeleteCategory(cat)}
                  className="flex items-center justify-center rounded-full h-4 w-4 text-[10px] transition hover:bg-[rgba(239,68,68,0.2)]"
                  style={{ color: 'var(--muted)' }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Templates list */}
      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Registered templates
              {count > 0 && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>({count})</span>}
            </p>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1 text-xs rounded-full focus:outline-none"
                style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink)', colorScheme: 'dark' }}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={() => { setAdding((v) => !v); setAddError(''); cancelEdit() }}
            className="px-3 py-1.5 text-xs font-semibold rounded-full transition flex-shrink-0"
            style={{ background: adding ? 'var(--danger-bg)' : 'var(--brand-soft)', color: adding ? 'var(--danger)' : 'var(--brand)' }}>
            {adding ? 'Cancel' : '+ Add template'}
          </button>
        </div>

        {adding && (
          <TemplateForm
            form={addForm} setForm={setAddForm} categories={categories}
            availableVars={availableVars} error={addError} submitting={addSubmitting}
            submitLabel="Add Template" onSubmit={handleAdd}
            onCancel={() => { setAdding(false); setAddError('') }}
          />
        )}

        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {loading && <p className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
          {!loading && templates.length === 0 && (
            <p className="px-5 py-5 text-sm" style={{ color: 'var(--muted)' }}>
              {categoryFilter ? 'No templates in this category.' : 'No templates registered yet.'}
            </p>
          )}
          {templates.map((t) => {
            const isExpanded = expandedId === t.id
            const isEditing = editingId === t.id

            if (isEditing) {
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between px-5 py-3"
                    style={{ background: 'var(--brand-soft)', borderBottom: '1px solid var(--line)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
                      Editing: {t.display_name || t.name}
                    </p>
                  </div>
                  <TemplateForm
                    form={editForm} setForm={setEditForm} categories={categories}
                    availableVars={availableVars} error={editError} submitting={editSubmitting}
                    submitLabel="Save Changes" onSubmit={handleEdit} onCancel={cancelEdit}
                  />
                </div>
              )
            }

            return (
              <div key={t.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t.display_name || t.name}</p>
                      {t.category_name && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                          {t.category_name}
                        </span>
                      )}
                      {t.has_header_image && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded"
                          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>Header image</span>
                      )}
                      {!t.is_active && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>Inactive</span>
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
                      <PreviewBubble bodyText={t.body_text} bodyParams={t.body_params || []} hasHeaderImage={t.has_header_image} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(t)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full transition"
                      style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full transition"
                      style={{ border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Page {page} of {totalPages} · {count} templates
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="rounded px-2 py-1 text-xs transition disabled:opacity-30"
                style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
                style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '…' ? (
                  <span key={`e-${i}`} className="px-1 text-xs" style={{ color: 'var(--muted-2)' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className="min-w-[28px] rounded px-2 py-1 text-xs font-semibold transition"
                    style={{
                      background: page === p ? 'var(--brand)' : 'transparent',
                      color: page === p ? '#fff' : 'var(--muted)',
                      border: `1px solid ${page === p ? 'var(--brand)' : 'var(--line)'}`,
                    }}>{p}</button>
                ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded px-2.5 py-1 text-xs transition disabled:opacity-30"
                style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="rounded px-2 py-1 text-xs transition disabled:opacity-30"
                style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
