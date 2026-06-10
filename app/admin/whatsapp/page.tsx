'use client'

import { useState, useEffect } from 'react'
import { api, Guest, Event } from '@/lib/api'
import { GuestList } from '@/components/whatsapp/GuestList'
import { GuestDetail } from '@/components/whatsapp/GuestDetail'
import { DeliveryStats } from '@/components/whatsapp/DeliveryStats'

export default function WhatsAppPage() {
  const [guests, setGuests]   = useState<Guest[]>([])
  const [events, setEvents]   = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sending, setSending]       = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<number | ''>('')

  useEffect(() => {
    Promise.all([api.getGuests(), api.getEvents()])
      .then(([gData, eData]) => {
        const withWa = gData.results.filter((g) => g.phone_number)
        setGuests(withWa)
        setEvents(eData)
        if (withWa.length > 0) setActiveId(withWa[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSend(guest: Guest) {
    setSending(true)
    try {
      const res = await api.sendWhatsApp(guest.id)
      setGuests((prev) => prev.map((g) => g.id === guest.id ? res.guest : g))
      showToast(res.sent ? `Pass sent to ${guest.full_name}` : 'Send failed — check pass image exists', res.sent)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Send failed', false)
    } finally {
      setSending(false)
    }
  }

  async function handleBulkSend(resend = false) {
    if (!selectedEvent) { showToast('Select an event first', false); return }
    setBulkSending(true)
    try {
      const res = await api.bulkSendWhatsApp(Number(selectedEvent), resend)
      const gData = await api.getGuests()
      setGuests(gData.results.filter((g) => g.phone_number))
      showToast(`Sent: ${res.sent} · Failed: ${res.failed}`, res.failed === 0)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Bulk send failed', false)
    } finally {
      setBulkSending(false)
    }
  }

  const total   = guests.length
  const sent    = guests.filter((g) => g.whatsapp_sent).length
  const notSent = total - sent
  const active  = guests.find((g) => g.id === activeId) ?? null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all"
          style={{ background: toast.ok ? 'var(--brand)' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}
      <GuestList guests={guests} loading={loading} activeId={activeId}
        sent={sent} notSent={notSent} total={total} onSelect={setActiveId} />
      <GuestDetail active={active} loading={loading} sending={sending} onSend={handleSend} onToast={showToast} />
      <DeliveryStats total={total} sent={sent} notSent={notSent} loading={loading}
        events={events} selectedEvent={selectedEvent} bulkSending={bulkSending}
        onEventChange={setSelectedEvent} onBulkSend={handleBulkSend} />
    </div>
  )
}
