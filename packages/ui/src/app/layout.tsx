import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DomHouse',
  description: 'Home Automation Dashboard',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-stone-50 text-stone-900 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
