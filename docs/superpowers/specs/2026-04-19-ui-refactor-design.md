# DomHouse UI Refactor — Design Spec

**Date:** 2026-04-19  
**Scope:** Full refactor of `packages/ui` — navigation, layout, visual design, component structure  
**Approach:** Next.js 15 App Router + nested layout, dark theme, sidebar nav

---

## Context

Current UI is a single `page.tsx` with a flat scrollable layout, stone/orange palette, and ad-hoc component styling. Goal: modern, simple, intuitive dashboard usable on both desktop and mobile.

Design decisions confirmed:
- **Layout:** Sidebar + Sections (App Router nested layout)
- **Theme:** Full dark (`#111` bg, `#1c1c1e` cards, `#f97316` orange accent)
- **Device cards:** Medium 2-column cards with toggle switch
- **Dashboard home:** Overview Hub (system state + scenarios + room summary)

---

## Architecture

### Route Structure

```
packages/ui/src/app/
├── layout.tsx              ← root layout: RealtimeProvider + AppShell
├── page.tsx                ← / → Dashboard (overview hub)
├── rooms/
│   ├── page.tsx            ← /rooms → room list grid (all rooms)
│   └── [room]/
│       └── page.tsx        ← /rooms/soggiorno → room device grid
├── scenarios/
│   └── page.tsx            ← /scenarios → scenario cards
└── settings/
    └── page.tsx            ← /settings → system config
```

### AppShell

Root `layout.tsx` renders `<AppShell>` which contains:
- `<Sidebar>` — desktop (≥768px), 56px wide icon-only vertical nav
- `<BottomNav>` — mobile (<768px), fixed bottom 4-tab bar
- `<main>` — scrollable content area

Sidebar/BottomNav hidden/shown via Tailwind `md:flex hidden` / `md:hidden flex`.

---

## Design Tokens

```ts
// tailwind.config.ts additions
colors: {
  surface: {
    base:  '#111111',   // page background
    card:  '#1c1c1e',   // card background
    raised:'#2a2a2e',   // raised element (input, badge)
    border:'#222222',   // border
  },
  accent: {
    DEFAULT: '#f97316', // orange-500
    dim:    '#f9731620',// orange glow border
  },
  text: {
    primary:   '#ffffff',
    secondary: '#aaaaaa',
    muted:     '#555555',
  },
  sensor: {
    temp:    '#60a5fa', // blue
    motion:  '#4ade80', // green
    error:   '#f87171', // red
  }
}
```

---

## Components

### `AppShell`
Wrapper rendered in root layout. Children = page content. Handles sidebar + bottom nav responsiveness.

Props: `{ children: ReactNode }`

### `Sidebar` (desktop)
56px dark (`#0d0d0f`) vertical rail. Logo at top (orange 30×30 icon). Nav items: icon only, active = orange icon + 2px left orange border + dim bg. Tooltip on hover (item label). Settings pinned to bottom.

Nav items:
| Icon | Label | Route |
|------|-------|-------|
| `LayoutDashboard` | Dashboard | `/` |
| `Sofa` (or `Home`) | Stanze | `/rooms` |
| `Play` | Scenari | `/scenarios` |
| `Settings` | Impostazioni | `/settings` |

### `BottomNav` (mobile)
Fixed bottom bar, `#0d0d0f` bg, `border-t border-surface-border`. 4 equal slots: icon + label. Active = orange icon + orange label.

### `RealtimeProvider`
Client component wrapping entire app at root layout level. Internally uses `useRealtime` hook. Exposes two context hooks:

```ts
useSystemState(): { system: SystemState; rooms: RoomSummary[] }
useDevices(): Device[]
```

Single WebSocket connection shared across all routes. On `snapshot` message: replace full state. On `state_change` message: patch device by id.

### `DeviceCard`
2-column grid card. Two variants based on device capability:

**Controllable** (light, media, lock):
- Top row: device emoji/icon (left) + toggle switch (right)
- Toggle: ON = orange track, OFF = `#2a2a2e` track
- Name + state label below icon
- Active card border: `border-accent-dim`
- Inactive card: dimmed opacity, `#161616` bg

**Sensor** (temp, motion, blind):
- Top row: device icon (left) + `LIVE` badge (right, colored by type)
- Name + sensor reading below
- Blind: shows percentage + progress bar
- No toggle (read-only)

Props: `{ device: Device; onCommand: (payload: unknown) => void }`

### `RoomCard` (dashboard list row)
Full-width row on dashboard. Room emoji + name (left) + active device count badge (right, orange if >0). Clicking navigates to `/rooms/[room]`.

### `ScenarioCard`
Card in `/scenarios` grid. Emoji + name + description + "Avvia" button. Button: orange bg while idle, spinner + "In corso..." while running (2s). 3-column grid on desktop, 2-column on mobile, 1-column on small mobile.

### `SystemStatePicker`
4 pill buttons: Casa / Fuori / Notte / Vacanza. Active = orange bg + white text. Inactive = `#2a2a2e` bg + muted text. Calls `POST /api/state` on click.

---

## Pages

### `/` — Dashboard

Layout:
1. **Header row:** "Dashboard" label (muted uppercase) + connection dot (green=connected, red=disconnected)
2. **Status card:** System state picker + active device count
3. **Quick scenarios:** horizontal scroll row of `ScenarioCard` (compact variant, no description)
4. **Room summary:** "STANZE" label + list of `RoomCard` rows

Data: `useSystemState()` + `useDevices()` (aggregate counts per room) + `fetchScenarios()` on mount.

### `/rooms/[room]` — Room Detail

Layout:
1. **Room header:** emoji + name + occupancy indicator (green dot "Occupata" / gray "Vuota")
2. **Room selector:** horizontal scroll pills for switching rooms without going back
3. **Device grid:** 2-column `DeviceCard` grid (3-column on wide desktop)

Room list fetched from `useDevices()` grouped by `device.room`. Route param `[room]` matches `device.room`.

### `/scenarios` — Scenarios

3-column card grid (2 on tablet, 1 on phone). Each `ScenarioCard` full variant (emoji + name + description + button). Data from `fetchScenarios()` on mount.

### `/settings` — Settings

Minimal for now:
- System state override (same as dashboard picker)
- Connection status (API URL, WS URL, connected indicator)
- No persistence beyond existing API

---

## Real-time Data Flow

```
RealtimeProvider (root layout)
  │
  ├─ WebSocket /ws
  │    snapshot  → setState({ devices, systemState })
  │    state_change → patchDevice(id, currentState, payload)
  │
  ├─ useSystemState() → { system, rooms }   consumed by Dashboard, Sidebar
  └─ useDevices()     → Device[]            consumed by Rooms, Dashboard counts
```

`fetchDevices()` and `fetchState()` called once on mount for initial hydration. WebSocket patches from there.

---

## Responsive Breakpoints

| Breakpoint | Layout | Device grid | Scenario grid |
|-----------|--------|------------|--------------|
| <640px (sm) | Bottom nav | 2-col | 1-col |
| 640–768px | Bottom nav | 2-col | 2-col |
| ≥768px (md) | Sidebar | 2-col | 3-col |
| ≥1280px (xl) | Sidebar | 3-col | 3-col |

---

## File Deletions / Renames

Current files to delete/replace:
- `src/app/page.tsx` → rewrite as dashboard overview
- `src/components/DeviceCard.tsx` → rewrite
- `src/components/SystemStateBadge.tsx` → replace with `SystemStatePicker`
- `src/components/ScenarioButton.tsx` → replace with `ScenarioCard`

New files to create:
- `src/app/layout.tsx` → add `AppShell` + `RealtimeProvider`
- `src/app/rooms/[room]/page.tsx`
- `src/app/scenarios/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/Sidebar.tsx`
- `src/components/BottomNav.tsx`
- `src/components/DeviceCard.tsx`
- `src/components/ScenarioCard.tsx`
- `src/components/SystemStatePicker.tsx`
- `src/components/RoomCard.tsx`
- `src/context/RealtimeContext.tsx`

Keep unchanged:
- `src/hooks/useRealtime.ts`
- `src/lib/api.ts`
- `src/lib/utils.ts`

---

## Out of Scope

- Device detail/settings page (tap card = toggle only, no modal)
- Push notifications
- User authentication
- Custom theme switching (light mode)
- History/charts (InfluxDB data visualization)
