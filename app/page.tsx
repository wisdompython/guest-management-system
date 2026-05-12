import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <span className="text-sm font-bold text-gray-900">GuestOps</span>
          <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Internal Tool</span>
        </div>
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition-colors"
        >
          Admin Dashboard
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-4">Internal Event Operations</p>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Guest management,<br />done properly.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-10">
            Register guests, generate personalised QR passes, deliver them via WhatsApp,
            and check attendees in at the door — all from one place.
          </p>
          <div className="flex gap-3">
            <Link
              href="/admin/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors"
            >
              Open Dashboard
            </Link>
            <Link
              href="/admin/guests/bulk-upload"
              className="border border-gray-200 hover:border-gray-400 text-gray-700 font-semibold rounded-lg px-6 py-3 text-sm transition-colors"
            >
              Bulk Upload Guests
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-indigo-600">
        <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-3 gap-8 text-white">
          {[
            { value: 'QR Passes',    desc: 'Auto-generated per guest with event branding' },
            { value: 'WhatsApp',     desc: 'Passes delivered directly to guests\' phones' },
            { value: 'Live check-in',desc: 'Mobile-friendly door scanning, duplicate-proof' },
          ].map(({ value, desc }) => (
            <div key={value}>
              <p className="text-lg font-bold mb-1">{value}</p>
              <p className="text-sm text-indigo-200">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-10">What's included</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              title: 'Event management',
              body: 'Create events with branded design templates. Draw the exact QR placement zone directly on the template.',
            },
            {
              title: 'Bulk guest import',
              body: 'Upload a CSV with guest names and phone numbers. QR codes and personalised passes are generated automatically.',
            },
            {
              title: 'Personalised passes',
              body: 'Each guest gets their own pass image with the QR code composited precisely into the designated zone.',
            },
            {
              title: 'WhatsApp delivery',
              body: 'Send passes directly to guests via WhatsApp using Twilio. Delivery status is tracked per guest.',
            },
            {
              title: 'QR check-in',
              body: 'Staff scan QR codes at the door. Duplicates are blocked. Check-in time is recorded automatically.',
            },
            {
              title: 'Admin dashboard',
              body: 'Full guest list with search and filters. View pass images, QR codes, and delivery status at a glance.',
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="border border-gray-100 hover:border-indigo-200 rounded-2xl p-6 transition-colors group"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
