# DomHouse Testing

Scope attuale: solo `packages/ui` ha Vitest wired. `packages/agent-core` non ha test runner.

---

## T1 — Setup

- **Runner:** Vitest 4.x.
- **Env:** `jsdom` per UI.
- **Setup file:** `packages/ui/src/test/setup.ts` — registra `@testing-library/jest-dom` matchers.
- **Alias:** `@/*` → `packages/ui/src/*` (match di `tsconfig.json` + `vitest.config.ts`).
- **React plugin:** `@vitejs/plugin-react` per JSX.

## T2 — Comandi

```bash
# Dalla root:
cd packages/ui && npm run test            # run once
cd packages/ui && npm run test:watch      # watch mode

# Single file:
cd packages/ui && npx vitest run src/context/__tests__/RealtimeContext.test.tsx

# Con pattern:
cd packages/ui && npx vitest run -t "reconcile state_change"
```

O via slash command: `/dh-test <pattern>`.

## T3 — FIRST principles

- **Fast** — target < 200ms per test. Niente timer reali (`vi.useFakeTimers`).
- **Independent** — nessun ordine implicito. `beforeEach` per reset mock.
- **Repeatable** — niente rete, niente filesystem non-temp, niente `Date.now()` diretto (usa `vi.setSystemTime`).
- **Self-validating** — assert espliciti. Niente ispezione console.
- **Timely** — test accanto al codice nello stesso PR.

## T4 — Naming

- File: `ComponentName.test.tsx` o `__tests__/ComponentName.test.tsx`.
- Test: `describe('Component')` + `it('does X when Y')`.
- Un concetto per test.

## T5 — Pattern tipici

### Test contesto realtime
```ts
import { render, screen } from '@testing-library/react'
import { RealtimeProvider } from '@/context/RealtimeContext'

it('updates device on state_change patch', () => {
  // mock WebSocket, feed message, assert UI reflects
})
```

### Mock `fetch`
```ts
vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
  new Response(JSON.stringify([]), { status: 200 })
))
```

### Mock WebSocket
```ts
class MockWS {
  onmessage?: (ev: MessageEvent) => void
  send = vi.fn()
  close = vi.fn()
  // ...
}
vi.stubGlobal('WebSocket', MockWS)
```

## T6 — Cosa testare

**Sì:**
- Logica di riconciliazione in `RealtimeContext` (snapshot → state, patch → update).
- Hook `useRealtime` reconnection behavior.
- Helper in `lib/` (rooms, utils).
- Componenti con logica non-banale (DeviceCard rendering per type, SystemStateBadge transizioni).

**No:**
- Shallow render senza assert reale.
- Snapshot test su UI volatile (meglio interaction-based).
- Integration end-to-end via HTTP — fuori scope Vitest (usa un'altra pipeline se serve).

## T7 — Agent-core (TODO)

Agent-core non ha test runner. Quando aggiunto (Vitest node env), regole applicabili:
- Mock `MqttClient` via `MessageBrokerInterface` (interfaccia fa il 90% del lavoro).
- Mock `RedisStateStore` con in-memory map.
- Mock `InfluxWriter` con spy.
- Testare `RuleEngine` con trigger synthetic + assert su `actionExecutor` spy.

---

## Severità

- **BLOCKER** — test che dipende da rete reale, da broker reale, da clock reale.
- **MAJOR** — test non-deterministico, ordine-dipendente.
- **MINOR** — assert deboli, naming non conforme.
