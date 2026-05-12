import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GuestOps',
  description: 'Event guest operations, pass delivery, and door check-in in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
