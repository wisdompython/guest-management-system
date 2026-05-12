'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const load = useCallback(() => {
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

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the guest list?`)) return
    setDeleting(id)
    try {
      await api.deleteGuest(id)
      setGuests((prev) => prev.filter((g) => g.id !== id))
      setCount((c) => c - 1)
    } catch { /* leave row in place */ }
    finally { setDeleting(null) }
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count} total guests</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/guests/add"
            className="text-sm font-semibold border border-gray-200 hover:border-gray-400 text-gray-700 rounded-lg px-4 py-2 transition-colors"
          >
            + Add Guest
          </Link>
          <Link
            href="/admin/guests/bulk-upload"
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition-colors"
          >
            Bulk Upload
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="checked_in">Checked In</option>
        </select>
        <select
          value={ticketFilter}
          onChange={(e) => setTicketFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Tickets</option>
          <option value="general">General</option>
          <option value="vip">VIP</option>
          <option value="vvip">VVIP</option>
        </select>
        {(search || statusFilter || ticketFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setTicketFilter('') }}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : guests.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No guests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-gray-50">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                    <Link href={`/admin/guests/${g.id}`} className="hover:text-indigo-600 transition-colors">
                      {g.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{g.phone_number}</td>
                  <td className="px-5 py-3 text-gray-500 truncate max-w-[120px]">{g.event_name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      g.ticket_type === 'vvip' ? 'bg-purple-100 text-purple-700' :
                      g.ticket_type === 'vip'  ? 'bg-amber-100 text-amber-700' :
                                                  'bg-gray-100 text-gray-600'
                    }`}>
                      {TICKET_LABELS[g.ticket_type]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{g.table_number || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      g.status === 'checked_in'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {g.status === 'checked_in' ? 'Checked In' : 'Registered'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {g.whatsapp_sent
                      ? <span className="text-green-600 font-medium text-xs">✓ Sent</span>
                      : <span className="text-gray-400 text-xs">Pending</span>}
                  </td>
                  <td className="px-5 py-3">
                    {g.pass_image
                      ? <a href={g.pass_image} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline font-medium">View</a>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(g.id, g.full_name)}
                      disabled={deleting === g.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
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
