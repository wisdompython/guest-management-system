'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Guest } from '@/lib/api'

const TICKET_LABELS: Record<string, string> = { general: 'General', vip: 'VIP', vvip: 'VVIP' }

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ticketFilter, setTicketFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    if (ticketFilter) params.ticket_type = ticketFilter

    api.getGuests(params)
      .then((data) => { setGuests(data.results); setCount(data.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, statusFilter, ticketFilter])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the guest list?`)) return
    setDeleting(id)
    try {
      await api.deleteGuest(id)
      setGuests((prev) => prev.filter((g) => g.id !== id))
      setCount((c) => c - 1)
    } catch {}
    finally { setDeleting(null) }
  }

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 rounded-[28px] bg-[#fff6e8] px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--brand)]">Guest directory</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--ink)]">Guests</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{count} total guests across registration, pass delivery, and check-in.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/guests/add"
            className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-stone-50"
          >
            Add Guest
          </Link>
          <Link
            href="/admin/guests/bulk-upload"
            className="rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Bulk Upload
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-[24px] border border-stone-200 bg-white px-4 py-4">
        <input
          type="text"
          placeholder="Search name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 rounded-full border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="checked_in">Checked In</option>
        </select>
        <select
          value={ticketFilter}
          onChange={(e) => setTicketFilter(e.target.value)}
          className="rounded-full border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          <option value="">All Tickets</option>
          <option value="general">General</option>
          <option value="vip">VIP</option>
          <option value="vvip">VVIP</option>
        </select>
        {(search || statusFilter || ticketFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setTicketFilter('') }}
            className="rounded-full px-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">Loading...</div>
        ) : guests.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">No guests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-left font-semibold">Phone</th>
                <th className="px-5 py-3 text-left font-semibold">Event</th>
                <th className="px-5 py-3 text-left font-semibold">Ticket</th>
                <th className="px-5 py-3 text-left font-semibold">Table</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">WhatsApp</th>
                <th className="px-5 py-3 text-left font-semibold">Pass</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {guests.map((g) => (
                <tr key={g.id} className="transition-colors hover:bg-stone-50/70">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-[var(--ink)]">
                    <Link href={`/admin/guests/${g.id}`} className="transition-colors hover:text-[var(--brand)]">
                      {g.full_name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[var(--muted)]">{g.phone_number}</td>
                  <td className="max-w-[120px] truncate px-5 py-4 text-[var(--muted)]">{g.event_name || '--'}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      g.ticket_type === 'vvip' ? 'bg-fuchsia-100 text-fuchsia-700' :
                      g.ticket_type === 'vip' ? 'bg-amber-100 text-amber-700' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {TICKET_LABELS[g.ticket_type]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{g.table_number || '--'}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      g.status === 'checked_in'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}>
                      {g.status === 'checked_in' ? 'Checked In' : 'Registered'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {g.whatsapp_sent
                      ? <span className="text-xs font-medium text-emerald-600">Sent</span>
                      : <span className="text-xs text-stone-400">Pending</span>}
                  </td>
                  <td className="px-5 py-4">
                    {g.pass_image
                      ? <a href={g.pass_image} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)] hover:underline">View</a>
                      : <span className="text-xs text-stone-300">--</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(g.id, g.full_name)}
                      disabled={deleting === g.id}
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400 transition-colors hover:text-red-600 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
