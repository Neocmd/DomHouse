# DomHouse UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `packages/ui` into a dark-themed, App Router dashboard with sidebar navigation, real-time device cards, and a context-driven WebSocket state layer.

**Architecture:** Root `layout.tsx` wraps all pages in `RealtimeProvider` (single WebSocket) + `AppShell` (sidebar/bottom-nav). Four App Router routes share live state via React context. Components are small, typed, and independently testable.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v3, lucide-react, Vitest, @testing-library/react

---

## File Map

**Create:**
- `packages/ui/vitest.config.ts`
- `packages/ui/src/test/setup.ts`
- `packages/ui/src/lib/rooms.ts` — shared room emoji/name/groupBy utilities
- `packages/ui/src/context/RealtimeContext.tsx` — WebSocket state + context hooks
- `packages/ui/src/context/__tests__/RealtimeContext.test.tsx`
- `packages/ui/src/components/AppShell.tsx`
- `packages/ui/src/components/Sidebar.tsx`
- `packages/ui/src/components/BottomNav.tsx`
- `packages/ui/src/components/SystemStatePicker.tsx`
- `packages/ui/src/components/RoomCard.tsx`
- `packages/ui/src/components/DeviceCard.tsx` (rewrite)
- `packages/ui/src/components/ScenarioCard.tsx`
- `packages/ui/src/components/__tests__/Sidebar.test.tsx`
- `packages/ui/src/components/__tests__/BottomNav.test.tsx`
- `packages/ui/src/components/__tests__/SystemStatePicker.test.tsx`
- `packages/ui/src/components/__tests__/DeviceCard.test.tsx`
- `packages/ui/src/app/rooms/page.tsx`
- `packages/ui/src/app/rooms/[room]/page.tsx`
- `packages/ui/src/app/scenarios/page.tsx`
- `packages/ui/src/app/settings/page.tsx`

**Modify:**
- `packages/ui/tailwind.config.ts` — add dark theme tokens
- `packages/ui/package.json` — add test scripts + vitest deps
- `packages/ui/src/app/globals.css` — dark base body
- `packages/ui/src/app/layout.tsx` — add AppShell + RealtimeProvider
- `packages/ui/src/app/page.tsx` — rewrite as dashboard overview
- `packages/ui/src/lib/api.ts` — export SystemState type
- `.gitignore` — add .superpowers/

**Delete:**
- `packages/ui/src/components/SystemStateBadge.tsx`
- `packages/ui/src/components/ScenarioButton.tsx`

**Keep unchanged:**
- `packages/ui/src/hooks/useRealtime.ts`
- `packages/ui/src/lib/utils.ts`

---

### Task 1: Vitest + design tokens

**Files:**
- Create: `packages/ui/vitest.config.ts`
- Create: `packages/ui/src/test/setup.ts`
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/tailwind.config.ts`
- Modify: `packages/ui/src/app/globals.css`

- [ ] **Step 1: Install test dependencies**

```bash
cd packages/ui && npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

Expected: packages added to `node_modules`, no peer dep errors.

- [ ] **Step 2: Create `packages/ui/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Create `packages/ui/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test scripts to `packages/ui/package.json`**

Add inside `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write smoke test to verify setup**

Create `packages/ui/src/test/smoke.test.ts`:
```ts
test('vitest setup works', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 6: Run smoke test**

```bash
cd packages/ui && npm test
```

Expected output: `1 passed`

- [ ] **Step 7: Delete smoke test**

```bash
rm packages/ui/src/test/smoke.test.ts
```

- [ ] **Step 8: Update `packages/ui/tailwind.config.ts`**

Replace entire file content:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base:   '#111111',
          card:   '#1c1c1e',
          raised: '#2a2a2e',
          border: '#222222',
          dim:    '#161616',
        },
        accent: {
          DEFAULT: '#f97316',
        },
        muted: '#555555',
        sensor: {
          temp:   '#60a5fa',
          motion: '#4ade80',
          error:  '#f87171',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 9: Update `packages/ui/src/app/globals.css`**

Replace file content:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface-base text-white;
  }
}
```

- [ ] **Step 10: Commit**

```bash
cd packages/ui && npm test
```
Expected: all pass (no test files = 0 tests, exit 0).

```bash
git add packages/ui/vitest.config.ts packages/ui/src/test/setup.ts packages/ui/package.json packages/ui/tailwind.config.ts packages/ui/src/app/globals.css
git commit -m "chore(ui): add vitest and dark theme design tokens"
```

---

### Task 2: Export SystemState type

**Files:**
- Modify: `packages/ui/src/lib/api.ts`

- [ ] **Step 1: Add SystemState export**

At the top of `packages/ui/src/lib/api.ts`, add before any interface:
```ts
export type SystemState = 'home' | 'away' | 'night' | 'vacation'
```

Then update `SystemStateResponse.system` field type:
```ts
export interface SystemStateResponse {
  system: SystemState
  rooms: { room: string; state: string }[]
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/lib/api.ts
git commit -m "feat(ui): export SystemState type from api.ts"
```

---

### Task 3: Room utilities

**Files:**
- Create: `packages/ui/src/lib/rooms.ts`

- [ ] **Step 1: Create `packages/ui/src/lib/rooms.ts`**

```ts
import type { Device } from './api'

export const ROOM_EMOJI: Record<string, string> = {
  living_room: '🛋',
  kitchen:     '🍳',
  bedroom:     '🛏',
  bathroom:    '🚿',
  office:      '💻',
  garage:      '🚗',
  garden:      '🌿',
  entrance:    '🚪',
}

export function formatRoomName(roomId: string): string {
  return roomId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function groupByRoom(devices: Device[]): Map<string, Device[]> {
  const map = new Map<string, Device[]>()
  for (const device of devices) {
    const existing = map.get(device.room) ?? []
    existing.push(device)
    map.set(device.room, existing)
  }
  return map
}

export function roomActiveCount(devices: Device[]): number {
  return devices.filter((d) => d.snapshot?.state === 'on').length
}

export function roomTemperature(devices: Device[]): number | undefined {
  const sensor = devices.find(
    (d) =>
      d.capabilities.includes('temperature') &&
      typeof d.snapshot?.payload['temperature'] === 'number',
  )
  if (!sensor?.snapshot) return undefined
  const val = sensor.snapshot.payload['temperature']
  return typeof val === 'number' ? val : undefined
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/lib/rooms.ts
git commit -m "feat(ui): add room utility functions"
```

---

### Task 4: RealtimeContext

**Files:**
- Create: `packages/ui/src/context/RealtimeContext.tsx`
- Create: `packages/ui/src/context/__tests__/RealtimeContext.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `packages/ui/src/context/__tests__/RealtimeContext.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { RealtimeProvider, useDevices, useSystemState } from '../RealtimeContext'
import type { Device } from '@/lib/api'

const mockHandler = vi.fn()

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: (handler: unknown) => {
    mockHandler.mockImplementation(handler as () => void)
  },
}))

vi.mock('@/lib/api', () => ({
  fetchDevices: vi.fn().mockResolvedValue([]),
  fetchState: vi.fn().mockResolvedValue({ system: 'home', rooms: [] }),
}))

function Consumer() {
  const devices = useDevices()
  const { systemState, connected } = useSystemState()
  return (
    <div>
      <span data-testid="state">{systemState}</span>
      <span data-testid="count">{devices.length}</span>
      <span data-testid="connected">{String(connected)}</span>
    </div>
  )
}

describe('RealtimeContext', () => {
  beforeEach(() => { mockHandler.mockReset() })

  test('renders with default home state', async () => {
    render(<RealtimeProvider><Consumer /></RealtimeProvider>)
    await screen.findByTestId('state')
    expect(screen.getByTestId('state')).toHaveTextContent('home')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('connected')).toHaveTextContent('false')
  })

  test('snapshot message replaces devices and state', async () => {
    render(<RealtimeProvider><Consumer /></RealtimeProvider>)
    await screen.findByTestId('state')

    const device: Device = {
      id: 'd1', name: 'Light', type: 'light', room: 'living_room',
      capabilities: ['toggle'], snapshot: null,
    }

    act(() => {
      mockHandler({ type: 'snapshot', data: { systemState: 'away', devices: [device] } })
    })

    expect(screen.getByTestId('state')).toHaveTextContent('away')
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('connected')).toHaveTextContent('true')
  })

  test('state_change message patches matching device', async () => {
    const device: Device = {
      id: 'd1', name: 'Light', type: 'light', room: 'living_room',
      capabilities: ['toggle'],
      snapshot: { id: 'd1', state: 'off', payload: {}, lastSeen: 0 },
    }

    render(<RealtimeProvider><Consumer /></RealtimeProvider>)
    await screen.findByTestId('state')

    act(() => {
      mockHandler({ type: 'snapshot', data: { systemState: 'home', devices: [device] } })
    })
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    act(() => {
      mockHandler({
        type: 'state_change',
        data: { type: 'light', id: 'd1', previousState: 'off', currentState: 'on', payload: { brightness: 80 } },
      })
    })
    // device count stays 1, patch is in-place
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd packages/ui && npm test
```

Expected: FAIL with `Cannot find module '../RealtimeContext'`

- [ ] **Step 3: Create `packages/ui/src/context/RealtimeContext.tsx`**

```tsx
'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Device, SystemState } from '@/lib/api'
import { fetchDevices, fetchState } from '@/lib/api'
import { useRealtime } from '@/hooks/useRealtime'
import type { WsMessage } from '@/hooks/useRealtime'

interface ContextValue {
  devices: Device[]
  systemState: SystemState
  connected: boolean
}

const RealtimeContext = createContext<ContextValue>({
  devices: [],
  systemState: 'home',
  connected: false,
})

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [systemState, setSystemState] = useState<SystemState>('home')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetchDevices().then(setDevices).catch(() => {})
    fetchState().then((s) => setSystemState(s.system)).catch(() => {})
  }, [])

  const handleMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'snapshot') {
      setDevices(msg.data.devices as Device[])
      setSystemState(msg.data.systemState as SystemState)
      setConnected(true)
    } else if (msg.type === 'state_change') {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === msg.data.id
            ? {
                ...d,
                snapshot: {
                  id: d.id,
                  state: msg.data.currentState as NonNullable<Device['snapshot']>['state'],
                  payload: msg.data.payload ?? d.snapshot?.payload ?? {},
                  lastSeen: Date.now(),
                },
              }
            : d,
        ),
      )
    }
  }, [])

  useRealtime(handleMessage)

  return (
    <RealtimeContext.Provider value={{ devices, systemState, connected }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useDevices(): Device[] {
  return useContext(RealtimeContext).devices
}

export function useSystemState(): Pick<ContextValue, 'systemState' | 'connected'> {
  const { systemState, connected } = useContext(RealtimeContext)
  return { systemState, connected }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd packages/ui && npm test
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/context/
git commit -m "feat(ui): add RealtimeContext with WebSocket state management"
```

---

### Task 5: Sidebar

**Files:**
- Create: `packages/ui/src/components/Sidebar.tsx`
- Create: `packages/ui/src/components/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write failing test**

Create `packages/ui/src/components/__tests__/Sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { Sidebar } from '../Sidebar'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('Sidebar', () => {
  test('renders all nav items with aria-labels', () => {
    render(<Sidebar />)
    expect(screen.getByLabelText('Dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Stanze')).toBeInTheDocument()
    expect(screen.getByLabelText('Scenari')).toBeInTheDocument()
    expect(screen.getByLabelText('Impostazioni')).toBeInTheDocument()
  })

  test('active nav item has accent border class', () => {
    render(<Sidebar />)
    const dashLink = screen.getByLabelText('Dashboard')
    expect(dashLink.className).toContain('border-accent')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd packages/ui && npm test
```

Expected: FAIL `Cannot find module '../Sidebar'`

- [ ] **Step 3: Create `packages/ui/src/components/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LayoutGrid, Zap, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/rooms',     label: 'Stanze',       Icon: LayoutGrid },
  { href: '/scenarios', label: 'Scenari',      Icon: Zap },
] as const

const SETTINGS_ITEM = { href: '/settings', label: 'Impostazioni', Icon: Settings } as const

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string
  label: string
  Icon: React.ComponentType<{ size?: number }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        'flex w-full items-center justify-center py-3 border-l-2 transition-colors',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-transparent text-muted hover:text-white',
      )}
    >
      <Icon size={20} />
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="hidden md:flex h-full w-14 flex-shrink-0 flex-col bg-[#0d0d0f] border-r border-surface-border">
      <div className="flex items-center justify-center py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-white text-sm">
          D
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-2">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
      <div className="pb-4">
        <NavItem {...SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} />
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd packages/ui && npm test
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/Sidebar.tsx packages/ui/src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(ui): add Sidebar desktop navigation"
```

---

### Task 6: BottomNav

**Files:**
- Create: `packages/ui/src/components/BottomNav.tsx`
- Create: `packages/ui/src/components/__tests__/BottomNav.test.tsx`

- [ ] **Step 1: Write failing test**

Create `packages/ui/src/components/__tests__/BottomNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { BottomNav } from '../BottomNav'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/rooms',
}))

describe('BottomNav', () => {
  test('renders 4 tab labels', () => {
    render(<BottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Stanze')).toBeInTheDocument()
    expect(screen.getByText('Scenari')).toBeInTheDocument()
    expect(screen.getByText('Config')).toBeInTheDocument()
  })

  test('active tab label has accent class', () => {
    render(<BottomNav />)
    expect(screen.getByText('Stanze').className).toContain('text-accent')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd packages/ui && npm test
```

Expected: FAIL `Cannot find module '../BottomNav'`

- [ ] **Step 3: Create `packages/ui/src/components/BottomNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LayoutGrid, Zap, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',          label: 'Home',    Icon: LayoutDashboard },
  { href: '/rooms',     label: 'Stanze',  Icon: LayoutGrid },
  { href: '/scenarios', label: 'Scenari', Icon: Zap },
  { href: '/settings',  label: 'Config',  Icon: Settings },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-surface-border bg-[#0d0d0f]">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(href)
        return (
          <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-1 py-2">
            <Icon size={20} className={active ? 'text-accent' : 'text-muted'} />
            <span className={cn('text-[10px]', active ? 'text-accent' : 'text-muted')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd packages/ui && npm test
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/BottomNav.tsx packages/ui/src/components/__tests__/BottomNav.test.tsx
git commit -m "feat(ui): add BottomNav mobile navigation"
```

---

### Task 7: AppShell + root layout

**Files:**
- Create: `packages/ui/src/components/AppShell.tsx`
- Modify: `packages/ui/src/app/layout.tsx`

- [ ] **Step 1: Create `packages/ui/src/components/AppShell.tsx`**

```tsx
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Update `packages/ui/src/app/layout.tsx`**

Replace the entire file:
```tsx
import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/AppShell'
import { RealtimeProvider } from '@/context/RealtimeContext'

export const metadata: Metadata = {
  title: 'DomHouse',
  description: 'Home automation dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <RealtimeProvider>
          <AppShell>{children}</AppShell>
        </RealtimeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd packages/ui && npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/AppShell.tsx packages/ui/src/app/layout.tsx
git commit -m "feat(ui): add AppShell and wire RealtimeProvider into root layout"
```

---

### Task 8: SystemStatePicker

**Files:**
- Create: `packages/ui/src/components/SystemStatePicker.tsx`
- Create: `packages/ui/src/components/__tests__/SystemStatePicker.test.tsx`
- Delete: `packages/ui/src/components/SystemStateBadge.tsx`

- [ ] **Step 1: Write failing test**

Create `packages/ui/src/components/__tests__/SystemStatePicker.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { SystemStatePicker } from '../SystemStatePicker'

const mockSetSystemState = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/api', () => ({
  setSystemState: (...args: unknown[]) => mockSetSystemState(...args),
}))

describe('SystemStatePicker', () => {
  test('renders all 4 state pills', () => {
    render(<SystemStatePicker current="home" onChanged={vi.fn()} />)
    expect(screen.getByText('Casa')).toBeInTheDocument()
    expect(screen.getByText('Fuori')).toBeInTheDocument()
    expect(screen.getByText('Notte')).toBeInTheDocument()
    expect(screen.getByText('Vacanza')).toBeInTheDocument()
  })

  test('active state button has bg-accent class', () => {
    render(<SystemStatePicker current="away" onChanged={vi.fn()} />)
    const btn = screen.getByText('Fuori').closest('button')!
    expect(btn.className).toContain('bg-accent')
  })

  test('clicking a pill calls setSystemState with correct key', async () => {
    render(<SystemStatePicker current="home" onChanged={vi.fn()} />)
    fireEvent.click(screen.getByText('Notte'))
    expect(mockSetSystemState).toHaveBeenCalledWith('night')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd packages/ui && npm test
```

Expected: FAIL `Cannot find module '../SystemStatePicker'`

- [ ] **Step 3: Create `packages/ui/src/components/SystemStatePicker.tsx`**

```tsx
'use client'

import { Home, Plane, Moon, Umbrella } from 'lucide-react'
import { setSystemState } from '@/lib/api'
import type { SystemState } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATES: { key: SystemState; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'home',     label: 'Casa',    Icon: Home },
  { key: 'away',     label: 'Fuori',   Icon: Plane },
  { key: 'night',    label: 'Notte',   Icon: Moon },
  { key: 'vacation', label: 'Vacanza', Icon: Umbrella },
]

interface Props {
  current: SystemState
  onChanged: () => void
}

export function SystemStatePicker({ current, onChanged }: Props) {
  const set = async (state: SystemState) => {
    await setSystemState(state)
    onChanged()
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATES.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => set(key)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
            current === key
              ? 'bg-accent border-accent text-white'
              : 'border-surface-border bg-surface-raised text-muted hover:text-white',
          )}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd packages/ui && npm test
```

Expected: `10 passed`

- [ ] **Step 5: Delete old component**

```bash
git rm packages/ui/src/components/SystemStateBadge.tsx
```

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/SystemStatePicker.tsx packages/ui/src/components/__tests__/SystemStatePicker.test.tsx
git commit -m "feat(ui): replace SystemStateBadge with dark SystemStatePicker"
```

---

### Task 9: RoomCard

**Files:**
- Create: `packages/ui/src/components/RoomCard.tsx`

- [ ] **Step 1: Create `packages/ui/src/components/RoomCard.tsx`**

```tsx
import Link from 'next/link'
import { ROOM_EMOJI, formatRoomName } from '@/lib/rooms'

interface Props {
  roomId: string
  activeCount: number
  temperature?: number
}

export function RoomCard({ roomId, activeCount, temperature }: Props) {
  const emoji = ROOM_EMOJI[roomId] ?? '🏠'
  const name = formatRoomName(roomId)

  return (
    <Link
      href={`/rooms/${roomId}`}
      className="flex items-center justify-between rounded-lg bg-surface-card px-4 py-3 transition-colors hover:bg-surface-raised"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-medium text-white">{name}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {temperature !== undefined && (
          <span className="text-sensor-temp">{temperature.toFixed(1)}°C</span>
        )}
        {activeCount > 0 ? (
          <span className="font-medium text-accent">{activeCount} ON</span>
        ) : (
          <span className="text-muted">off</span>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/RoomCard.tsx
git commit -m "feat(ui): add RoomCard dashboard list row"
```

---

### Task 10: DeviceCard (rewrite)

**Files:**
- Create: `packages/ui/src/components/DeviceCard.tsx` (replaces existing)
- Create: `packages/ui/src/components/__tests__/DeviceCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `packages/ui/src/components/__tests__/DeviceCard.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { DeviceCard } from '../DeviceCard'
import type { Device } from '@/lib/api'

const lightOn: Device = {
  id: 'l1', name: 'Soffitto', type: 'light', room: 'living_room',
  capabilities: ['toggle'],
  snapshot: { id: 'l1', state: 'on', payload: { brightness: 80 }, lastSeen: 0 },
}
const lightOff: Device = {
  id: 'l2', name: 'Lampada', type: 'light', room: 'living_room',
  capabilities: ['toggle'],
  snapshot: { id: 'l2', state: 'off', payload: {}, lastSeen: 0 },
}
const tempSensor: Device = {
  id: 't1', name: 'Temperatura', type: 'sensor', room: 'living_room',
  capabilities: ['temperature', 'humidity'],
  snapshot: { id: 't1', state: 'on', payload: { temperature: 22.4, humidity: 58 }, lastSeen: 0 },
}

describe('DeviceCard', () => {
  test('renders device name', () => {
    render(<DeviceCard device={lightOn} onCommand={vi.fn()} />)
    expect(screen.getByText('Soffitto')).toBeInTheDocument()
  })

  test('shows ON label for active controllable device', () => {
    render(<DeviceCard device={lightOn} onCommand={vi.fn()} />)
    expect(screen.getByText('ON')).toBeInTheDocument()
  })

  test('toggle ON device calls onCommand with { on: false }', () => {
    const onCommand = vi.fn()
    render(<DeviceCard device={lightOn} onCommand={onCommand} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onCommand).toHaveBeenCalledWith({ on: false })
  })

  test('toggle OFF device calls onCommand with { on: true }', () => {
    const onCommand = vi.fn()
    render(<DeviceCard device={lightOff} onCommand={onCommand} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onCommand).toHaveBeenCalledWith({ on: true })
  })

  test('sensor shows temperature and humidity', () => {
    render(<DeviceCard device={tempSensor} onCommand={vi.fn()} />)
    expect(screen.getByText(/22\.4°C/)).toBeInTheDocument()
    expect(screen.getByText(/58%/)).toBeInTheDocument()
  })

  test('sensor has no toggle switch', () => {
    render(<DeviceCard device={tempSensor} onCommand={vi.fn()} />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd packages/ui && npm test
```

Expected: FAIL on DeviceCard tests (module exists but likely wrong shape from old code)

- [ ] **Step 3: Rewrite `packages/ui/src/components/DeviceCard.tsx`**

```tsx
'use client'

import { Lightbulb, Thermometer, Eye, Tv, Lock, Cpu, ChevronUp } from 'lucide-react'
import type { Device } from '@/lib/api'
import { cn } from '@/lib/utils'

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  light:  Lightbulb,
  sensor: Thermometer,
  motion: Eye,
  media:  Tv,
  tv:     Tv,
  lock:   Lock,
  blind:  ChevronUp,
  cover:  ChevronUp,
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'relative h-4 w-7 flex-shrink-0 rounded-full transition-colors',
        on ? 'bg-accent' : 'bg-surface-raised',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

interface Props {
  device: Device
  onCommand: (payload: Record<string, unknown>) => void
}

export function DeviceCard({ device, onCommand }: Props) {
  const snap = device.snapshot
  const isOn = snap?.state === 'on'
  const isUnreachable = snap?.state === 'unreachable' || snap?.state === 'error'
  const controllable = device.capabilities.includes('toggle')
  const isBlind = device.type === 'blind' || device.type === 'cover'
  const Icon = ICONS[device.type] ?? Cpu

  const payload = snap?.payload ?? {}
  const temperature = typeof payload['temperature'] === 'number' ? payload['temperature'] : undefined
  const humidity    = typeof payload['humidity']    === 'number' ? payload['humidity']    : undefined
  const brightness  = typeof payload['brightness']  === 'number' ? payload['brightness']  : undefined
  const position    = typeof payload['position']    === 'number' ? payload['position']    : undefined

  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-colors',
        isOn && !isUnreachable  ? 'bg-surface-card border-accent/20'       : '',
        !isOn && !isUnreachable ? 'bg-surface-dim border-surface-border opacity-60' : '',
        isUnreachable           ? 'bg-surface-dim border-sensor-error/30'  : '',
      )}
    >
      {/* Top row: icon + control */}
      <div className="mb-2 flex items-start justify-between gap-1">
        <Icon
          size={20}
          className={cn(
            isUnreachable ? 'text-sensor-error' : isOn ? 'text-accent' : 'text-muted',
          )}
        />
        {controllable && <Toggle on={isOn} onClick={() => onCommand({ on: !isOn })} />}
        {isBlind && position !== undefined && (
          <span className="text-[10px] text-muted">{position}%</span>
        )}
        {!controllable && !isBlind && snap && (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium',
              device.type === 'motion'
                ? 'bg-sensor-motion/20 text-sensor-motion'
                : 'bg-sensor-temp/20 text-sensor-temp',
            )}
          >
            LIVE
          </span>
        )}
      </div>

      {/* Name */}
      <div className="truncate text-xs font-semibold text-white">{device.name}</div>

      {/* State / reading */}
      <div className="mt-1 text-[10px] text-muted">
        {isUnreachable && <span className="text-sensor-error">Irraggiungibile</span>}

        {!isUnreachable && controllable && (
          <span className={isOn ? 'text-accent' : ''}>
            {isOn ? 'ON' : 'OFF'}
            {brightness !== undefined && isOn && ` · ${brightness}%`}
          </span>
        )}

        {!isUnreachable && !controllable && !isBlind && temperature !== undefined && (
          <span className="text-sensor-temp">
            {temperature.toFixed(1)}°C{humidity !== undefined && ` · ${humidity}%`}
          </span>
        )}

        {!isUnreachable && isBlind && position !== undefined && (
          <div className="mt-1 h-1 rounded-full bg-surface-raised">
            <div className="h-1 rounded-full bg-accent" style={{ width: `${position}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd packages/ui && npm test
```

Expected: `16 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/DeviceCard.tsx packages/ui/src/components/__tests__/DeviceCard.test.tsx
git commit -m "feat(ui): rewrite DeviceCard with dark theme and toggle"
```

---

### Task 11: ScenarioCard

**Files:**
- Create: `packages/ui/src/components/ScenarioCard.tsx`
- Delete: `packages/ui/src/components/ScenarioButton.tsx`

- [ ] **Step 1: Create `packages/ui/src/components/ScenarioCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { triggerScenario } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { cn } from '@/lib/utils'

const SCENARIO_EMOJI: Record<string, string> = {
  movie_night:     '🎬',
  good_morning:    '🌅',
  goodnight:       '🌙',
  all_lights_off:  '💡',
}

interface Props {
  scenario: Scenario
  compact?: boolean
}

export function ScenarioCard({ scenario, compact = false }: Props) {
  const [running, setRunning] = useState(false)
  const emoji = SCENARIO_EMOJI[scenario.name] ?? '⚡'

  const trigger = async () => {
    if (running) return
    setRunning(true)
    try {
      await triggerScenario(scenario.name)
    } finally {
      setTimeout(() => setRunning(false), 2000)
    }
  }

  if (compact) {
    return (
      <button
        onClick={trigger}
        disabled={running}
        className={cn(
          'flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-all',
          running
            ? 'border-accent/50 bg-accent/10 text-accent'
            : 'border-surface-border bg-surface-raised text-white hover:border-accent/50',
        )}
      >
        {running ? <Loader2 size={12} className="animate-spin" /> : <span>{emoji}</span>}
        {scenario.description ?? scenario.name}
      </button>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-surface-border bg-surface-card p-4">
      <span className="mb-3 text-2xl">{emoji}</span>
      <p className="mb-1 text-sm font-semibold text-white">
        {scenario.description ?? scenario.name}
      </p>
      <p className="mb-4 flex-1 text-xs text-muted">{scenario.name}</p>
      <button
        onClick={trigger}
        disabled={running}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all',
          running ? 'bg-accent/20 text-accent' : 'bg-accent text-white hover:bg-orange-600',
        )}
      >
        {running ? (
          <><Loader2 size={12} className="animate-spin" /> In corso...</>
        ) : (
          <><Play size={12} /> Avvia</>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Delete old component**

```bash
git rm packages/ui/src/components/ScenarioButton.tsx
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/ScenarioCard.tsx
git commit -m "feat(ui): replace ScenarioButton with ScenarioCard"
```

---

### Task 12: Dashboard page rewrite

**Files:**
- Modify: `packages/ui/src/app/page.tsx`

- [ ] **Step 1: Rewrite `packages/ui/src/app/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { fetchScenarios } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { useDevices, useSystemState } from '@/context/RealtimeContext'
import { groupByRoom, roomActiveCount, roomTemperature } from '@/lib/rooms'
import { SystemStatePicker } from '@/components/SystemStatePicker'
import { RoomCard } from '@/components/RoomCard'
import { ScenarioCard } from '@/components/ScenarioCard'

export default function DashboardPage() {
  const devices = useDevices()
  const { systemState, connected } = useSystemState()
  const [scenarios, setScenarios] = useState<Scenario[]>([])

  useEffect(() => {
    fetchScenarios().then(setScenarios).catch(() => {})
  }, [])

  const byRoom = groupByRoom(devices)
  const totalActive = devices.filter((d) => d.snapshot?.state === 'on').length

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-medium uppercase tracking-widest text-muted">Dashboard</h1>
        {connected
          ? <Wifi size={14} className="text-sensor-motion" />
          : <WifiOff size={14} className="text-muted" />}
      </div>

      {/* Status card */}
      <div className="rounded-xl bg-surface-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs text-muted">Sistema</p>
            <SystemStatePicker current={systemState} onChanged={() => {}} />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Attivi</p>
            <p className="text-2xl font-bold text-accent">{totalActive}</p>
          </div>
        </div>
      </div>

      {/* Quick scenarios */}
      {scenarios.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Scenari rapidi</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenarios.map((s) => (
              <ScenarioCard key={s.name} scenario={s} compact />
            ))}
          </div>
        </div>
      )}

      {/* Room summary */}
      {byRoom.size > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Stanze</p>
          <div className="space-y-2">
            {Array.from(byRoom.entries()).map(([roomId, roomDevices]) => (
              <RoomCard
                key={roomId}
                roomId={roomId}
                activeCount={roomActiveCount(roomDevices)}
                temperature={roomTemperature(roomDevices)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/app/page.tsx
git commit -m "feat(ui): rewrite dashboard page as dark overview hub"
```

---

### Task 13: Rooms list page

**Files:**
- Create: `packages/ui/src/app/rooms/page.tsx`

- [ ] **Step 1: Create `packages/ui/src/app/rooms/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useDevices } from '@/context/RealtimeContext'
import { ROOM_EMOJI, formatRoomName, groupByRoom, roomActiveCount } from '@/lib/rooms'

export default function RoomsPage() {
  const devices = useDevices()
  const byRoom = groupByRoom(devices)

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xs font-medium uppercase tracking-widest text-muted">Stanze</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from(byRoom.entries()).map(([roomId, roomDevices]) => {
          const active = roomActiveCount(roomDevices)
          const emoji = ROOM_EMOJI[roomId] ?? '🏠'
          const name = formatRoomName(roomId)
          return (
            <Link
              key={roomId}
              href={`/rooms/${roomId}`}
              className="flex flex-col rounded-xl border border-surface-border bg-surface-card p-4 transition-colors hover:bg-surface-raised"
            >
              <span className="mb-3 text-3xl">{emoji}</span>
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="mt-1 text-xs">
                {active > 0
                  ? <span className="text-accent">{active} accesi</span>
                  : <span className="text-muted">tutto off</span>}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/app/rooms/page.tsx
git commit -m "feat(ui): add rooms list page with grid"
```

---

### Task 14: Room detail page

**Files:**
- Create: `packages/ui/src/app/rooms/[room]/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "packages/ui/src/app/rooms/[room]"
```

- [ ] **Step 2: Create `packages/ui/src/app/rooms/[room]/page.tsx`**

```tsx
'use client'

import { use } from 'react'
import Link from 'next/link'
import { sendCommand } from '@/lib/api'
import { useDevices, useSystemState } from '@/context/RealtimeContext'
import { DeviceCard } from '@/components/DeviceCard'
import { ROOM_EMOJI, formatRoomName, groupByRoom } from '@/lib/rooms'

export default function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const { room } = use(params)
  const devices = useDevices()
  const { connected } = useSystemState()

  const roomDevices = devices.filter((d) => d.room === room)
  const allRooms = Array.from(groupByRoom(devices).keys())
  const emoji = ROOM_EMOJI[room] ?? '🏠'
  const name = formatRoomName(room)

  return (
    <div className="p-4 md:p-6">
      {/* Room header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div>
          <h1 className="text-lg font-bold text-white">{name}</h1>
          <p className="text-xs">
            {connected
              ? <span className="text-sensor-motion">● Connesso</span>
              : <span className="text-muted">● Disconnesso</span>}
          </p>
        </div>
      </div>

      {/* Room switcher */}
      {allRooms.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {allRooms.map((r) => (
            <Link
              key={r}
              href={`/rooms/${r}`}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
                r === room
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-surface-border text-muted hover:text-white'
              }`}
            >
              {ROOM_EMOJI[r] ?? '🏠'} {formatRoomName(r)}
            </Link>
          ))}
        </div>
      )}

      {/* Device grid */}
      {roomDevices.length === 0 ? (
        <p className="text-sm text-muted">Nessun dispositivo in questa stanza.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {roomDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onCommand={(payload) => sendCommand(device.id, payload)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "packages/ui/src/app/rooms/[room]/page.tsx"
git commit -m "feat(ui): add room detail page with device grid and room switcher"
```

---

### Task 15: Scenarios page

**Files:**
- Create: `packages/ui/src/app/scenarios/page.tsx`

- [ ] **Step 1: Create `packages/ui/src/app/scenarios/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { fetchScenarios } from '@/lib/api'
import type { Scenario } from '@/lib/api'
import { ScenarioCard } from '@/components/ScenarioCard'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])

  useEffect(() => {
    fetchScenarios().then(setScenarios).catch(() => {})
  }, [])

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xs font-medium uppercase tracking-widest text-muted">Scenari</h1>
      {scenarios.length === 0 ? (
        <p className="text-sm text-muted">Nessuno scenario configurato.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {scenarios.map((s) => (
            <ScenarioCard key={s.name} scenario={s} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/app/scenarios/page.tsx
git commit -m "feat(ui): add scenarios page"
```

---

### Task 16: Settings page

**Files:**
- Create: `packages/ui/src/app/settings/page.tsx`

- [ ] **Step 1: Create `packages/ui/src/app/settings/page.tsx`**

```tsx
'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { useSystemState } from '@/context/RealtimeContext'
import { SystemStatePicker } from '@/components/SystemStatePicker'

export default function SettingsPage() {
  const { systemState, connected } = useSystemState()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-xs font-medium uppercase tracking-widest text-muted">Impostazioni</h1>

      <div className="space-y-6 rounded-xl border border-surface-border bg-surface-card p-4">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Stato sistema</p>
          <SystemStatePicker current={systemState} onChanged={() => {}} />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Connessione</p>
          <div className="flex items-center gap-2 text-sm">
            {connected ? (
              <><Wifi size={14} className="text-sensor-motion" /><span className="text-sensor-motion">Connesso</span></>
            ) : (
              <><WifiOff size={14} className="text-muted" /><span className="text-muted">Disconnesso</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/ui && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/app/settings/page.tsx
git commit -m "feat(ui): add settings page"
```

---

### Task 17: Cleanup + .gitignore

- [ ] **Step 1: Check for stale imports**

```bash
grep -r "SystemStateBadge\|ScenarioButton" packages/ui/src
```

If any files found: remove those import lines.

- [ ] **Step 2: Add `.superpowers/` to `.gitignore`**

Append to `.gitignore`:
```
# Brainstorming mockups
.superpowers/
```

- [ ] **Step 3: Run full test suite**

```bash
cd packages/ui && npm test
```

Expected: all pass, no errors.

- [ ] **Step 4: Run TypeScript check**

```bash
cd packages/ui && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to .gitignore"
```

---

### Task 18: Build + Docker verification

- [ ] **Step 1: Build UI package**

```bash
cd packages/ui && npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 2: Rebuild Docker image**

```bash
docker compose build ui
```

Expected: build completes, image tagged `domhouse-ui`.

- [ ] **Step 3: Start full stack**

```bash
docker compose up
```

- [ ] **Step 4: Open `http://localhost:4000` and verify**

Check each item manually:
- Dark background loads (not white/gray)
- Sidebar visible at ≥768px browser width, hidden below
- Bottom nav visible at <768px browser width, hidden above
- Dashboard: status card shows system state pills + active count
- Dashboard: quick scenarios row (horizontal scroll)
- Dashboard: room summary rows with links
- Navigate to `/rooms` → room grid appears
- Click a room → `/rooms/[roomid]` → device grid with toggle switches
- Navigate to `/scenarios` → scenario cards with Avvia buttons
- Navigate to `/settings` → state picker + connection status
- WebSocket connected indicator turns green when agent-core is up

- [ ] **Step 5: Commit if all good**

```bash
git add -A
git commit -m "feat(ui): complete dark theme refactor with sidebar navigation"
```
