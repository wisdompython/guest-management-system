'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api, Guest, Event } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const TICKET_LABELS: Record<string, string> = { general: 'General', vip: 'VIP', vvip: 'VVIP' }

export default function GuestsPage() {
  const [guests, setGuests]             = useState<Guest[]>([])
  const [count, setCount]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ticketFilter, setTicketFilter] = useState('')
  const [deleting, setDeleting]         = useState<string | null>(null)

  // Export panel state
  const [exportOpen, setExportOpen]     = useState(false)
  const [events, setEvents]             = useState<Event[]>([])
  const [exportEvent, setExportEvent]   = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (search)       params.search      = search
    if (statusFilter) params.status      = statusFilter
    if (ticketFilter) params.ticket_type = ticketFilter
    api.getGuests(params)
      .then((data) => { setGuests(data.results); setCount(data.count) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, statusFilter, ticketFilter])

  // Load events once for the export dropdown
  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error)
  }, [])

  // Close export panel on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    if (exportOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [exportOpen])

  function buildExportUrl() {
    const params = new URLSearchParams()
    if (exportEvent)  params.set('event',  exportEvent)
    if (exportStatus) params.set('status', exportStatus)
    const qs = params.toString()
    return `${BASE_URL}/guests/export/${qs ? '?' + qs : ''}`
  }

  function handleExportDownload() {
    window.location.href = buildExportUrl()
    setExportOpen(false)
  }

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
    <div className="px-6 py-6 lg:px-8 lg:py-7">

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Guest Directory</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>{count} total guests</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/guests/add"
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
            + Add Guest
          </Link>

          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--brand)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ opacity: 0.7, transform: exportOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {exportOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-[14px] shadow-xl"
                style={{ border: '1px solid var(--line)', background: '#fff' }}
              >
                <div className="border-b px-4 py-3.5" style={{ borderColor: 'var(--line)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Export Guest List</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>Download as CSV. Leave filters blank to export everyone.</p>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                      Event
                    </label>
                    <select
                      value={exportEvent}
                      onChange={(e) => setExportEvent(e.target.value)}
                      className="w-full rounded-[10px] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                    >
                      <option value="">All events</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                      Status
                    </label>
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full rounded-[10px] border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                    >
                      <option value="">All statuses</option>
                      <option value="registered">Pending</option>
                      <option value="checked_in">Checked-in</option>
                    </select>
                  </div>

                  {/* Preview of what will be exported */}
                  <div className="rounded-[10px] px-3 py-2.5 text-xs" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                    Columns: Name · Email · Phone · Ticket · Table · Seat · Status · Registered · Checked-in · WhatsApp · Event
                  </div>
                </div>

                <div className="border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
                  <button
                    onClick={handleExportDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ background: 'var(--brand)' }}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[['', 'All Guests'], ['registered', 'Pending'], ['checked_in', 'Checked-in']].map(([val, lab]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className="rounded-lg border px-4 py-1.5 text-sm font-medium transition"
            style={{
              background: statusFilter === val ? 'var(--brand)' : '#fff',
              borderColor: statusFilter === val ? 'var(--brand)' : 'var(--line)',
              color: statusFilter === val ? '#fff' : 'var(--ink)',
            }}
          >
            {lab}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <select value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
            <option value="">All Tickets</option>
            <option value="general">General</option>
            <option value="vip">VIP</option>
            <option value="vvip">VVIP</option>
          </select>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--line)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search guests, email or table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 outline-none text-sm"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[12px]" style={{ border: '1px solid var(--line)' }}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : guests.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>No guests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest"
                style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted-2)', background: 'var(--bg)' }}>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email Address</th>
                <th className="px-5 py-3 text-left">Ticket Type</th>
                <th className="px-5 py-3 text-left">Table</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => {
                const initials = g.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <tr key={g.id} className="transition-colors hover:bg-[var(--bg)]"
                    style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: 'var(--brand)' }}>{initials}</div>
                        <div>
                          <Link href={`/admin/guests/${g.id}`} className="font-semibold transition hover:underline"
                            style={{ color: 'var(--ink)' }}>{g.full_name}</Link>
                          <p className="text-xs" style={{ color: 'var(--muted-2)' }}>ID: #{g.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--muted)' }}>{g.email || '--'}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{
                        background: g.ticket_type === 'vvip' ? '#f3e8ff' : g.ticket_type === 'vip' ? '#e8f4ff' : 'var(--brand-soft)',
                        color: g.ticket_type === 'vvip' ? '#7c3aed' : g.ticket_type === 'vip' ? '#1d4ed8' : 'var(--brand)',
                      }}>
                        {g.ticket_type === 'vip' ? 'VIP Platinum' : TICKET_LABELS[g.ticket_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--ink)' }}>{g.table_number || '--'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: g.status === 'checked_in' ? '#dcfce7' : '#fef9c3', color: g.status === 'checked_in' ? '#16a34a' : '#b45309' }}>
                        <span className="h-1.5 w-1.5 rounded-full"
                          style={{ background: g.status === 'checked_in' ? '#16a34a' : '#b45309' }} />
                        {g.status === 'checked_in' ? 'Checked-in' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/guests/${g.id}`}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
                            style={{ color: 'var(--brand)' }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </Link>
                        <button onClick={() => handleDelete(g.id, g.full_name)} disabled={deleting === g.id}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"
                            style={{ color: 'var(--muted-2)' }}>
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Showing 1 to {guests.length} of {count} guests</p>
        </div>
      </div>
    </div>
  )
}
