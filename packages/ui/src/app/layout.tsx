import type { Metadata } from 'next'
import './globals.css'
import { RealtimeProvider } from '@/context/RealtimeContext'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'DomHouse',
  description: 'Home Automation Dashboard',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-[#111] text-white font-sans antialiased">
        <RealtimeProvider>
          <AppShell>{children}</AppShell>
        </RealtimeProvider>
      </body>
    </html>
  )
}
