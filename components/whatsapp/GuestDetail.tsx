'use client'

import { useState } from 'react'
import { api, Guest } from '@/lib/api'

interface Props {
  active: Guest | null
  loading: boolean
  sending: boolean
  onSend: (guest: Guest) => void
  onToast: (msg: string, ok: boolean) => void
}

export function GuestDetail({ active, loading, sending, onSend, onToast }: Props) {
  const [compose, setCompose] = useState('')
  const [msgSending, setMsgSending] = useState(false)

  async function handleSendMessage() {
    if (!active || !compose.trim()) return
    setMsgSending(true)
    try {
      const res = await api.sendMessage(active.id, compose.trim())
      onToast(res.sent ? 'Message sent' : 'Send failed — guest must have messaged you first', res.sent)
      if (res.sent) setCompose('')
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Send failed', false)
    } finally {
      setMsgSending(false)
    }
  }

  if (!active) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : 'Select a guest to view.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-3 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: 'rgba(34,201,160,0.2)', color: 'var(--brand)' }}>
          {active.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{active.full_name}</p>
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {active.phone_number}
            {active.email ? ' · ' + active.email : ''}
            {' · '}{active.ticket_type.toUpperCase()}
            {active.table_number ? ' · T-' + active.table_number : ''}
          </p>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{
            background: active.whatsapp_sent ? 'rgba(34,201,160,0.12)' : 'rgba(245,158,11,0.12)',
            color: active.whatsapp_sent ? 'var(--brand)' : 'var(--warn)',
          }}>
          {active.whatsapp_sent ? 'Sent' : 'Not sent'}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {active.pass_image ? (
          <div className="mb-6 flex justify-center">
            <img src={active.pass_image} alt="Pass" className="max-h-64 rounded-xl shadow-lg" />
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-dashed px-4 py-6 text-center text-xs"
            style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
            No pass image — regenerate assets first
          </div>
        )}
        {active.whatsapp_sent && (
          <div className="flex justify-end">
            <div className="max-w-[65%] rounded-xl px-4 py-3"
              style={{ background: 'var(--panel-2)', border: '1px solid rgba(34,201,160,0.15)' }}>
              <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--brand)' }}>Pass delivered</p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink)' }}>
                Pass sent to {active.phone_number}
              </p>
              {active.whatsapp_sent_at && (
                <p className="mt-1 text-right text-[11px]" style={{ color: 'var(--muted-2)' }}>
                  {new Date(active.whatsapp_sent_at).toLocaleString('en-GB')}
                </p>
              )}
            </div>
          </div>
        )}
        {!active.whatsapp_sent && !active.pass_image && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No messages sent yet.</p>
          </div>
        )}
      </div>

      {/* Send pass bar */}
      <div className="flex-shrink-0 px-4 pt-3 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
        <button onClick={() => onSend(active)} disabled={sending || !active.pass_image}
          className="flex-1 rounded-full py-2 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--brand)' }}>
          {sending ? 'Sending…' : active.whatsapp_sent ? 'Resend Pass' : 'Send Pass'}
        </button>
        {!active.pass_image && (
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>No pass image</span>
        )}
      </div>

      {/* Free-form compose box */}
      <div className="flex-shrink-0 px-4 pb-3 pt-2" style={{ background: 'var(--panel)' }}>
        <div className="flex items-end gap-2">
          <textarea
            value={compose}
            onChange={(e) => setCompose(e.target.value)}
            placeholder="Reply to guest (only works within 24h of their last message)…"
            rows={2}
            className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={msgSending || !compose.trim()}
            className="flex-shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--brand)' }}>
            {msgSending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
