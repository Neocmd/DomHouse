'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Sofa, Clapperboard, Settings, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemState } from '@/context/RealtimeContext'

const NAV = [
  { href: '/',          label: 'Home',         Icon: LayoutDashboard },
  { href: '/rooms',     label: 'Stanze',       Icon: Sofa },
  { href: '/scenarios', label: 'Scenari',      Icon: Clapperboard },
  { href: '/settings',  label: 'Impostazioni', Icon: Settings },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { connected } = useSystemState()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex min-h-screen bg-[#111]">
      <aside className="hidden md:flex w-[72px] flex-col items-center gap-1 border-r border-[#222] bg-[#0d0d0f] py-4">
        <Link
          href="/"
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white"
          aria-label="DomHouse"
        >
          <Home size={18} />
        </Link>
        <nav className="flex w-full flex-1 flex-col items-center gap-1">
          {NAV.slice(0, 3).map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex w-full items-center justify-center py-2.5 transition-colors',
                  active
                    ? 'border-l-2 border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-l-2 border-transparent text-stone-500 hover:text-stone-200',
                )}
                title={label}
              >
                <Icon size={20} />
              </Link>
            )
          })}
        </nav>
        <Link
          href="/settings"
          className={cn(
            'mb-2 flex w-full items-center justify-center py-2.5 transition-colors',
            isActive('/settings')
              ? 'text-orange-400'
              : 'text-stone-600 hover:text-stone-300',
          )}
          title="Impostazioni"
        >
          <Settings size={20} />
        </Link>
        <div
          className={cn('h-2 w-2 rounded-full', connected ? 'bg-green-500' : 'bg-stone-600')}
          title={connected ? 'Connesso' : 'Disconnesso'}
        />
      </aside>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[#222] bg-[#0d0d0f] py-2 md:hidden">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1',
                active ? 'text-orange-400' : 'text-stone-500',
              )}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
