# DomHouse TypeScript Style

Convenzioni TS per `packages/agent-core` e `packages/ui`. Italiano.

---

## TS1 — Import hygiene

- **Import relativi con `.js` suffix** in `agent-core` (ESM compiled). Es: `import { foo } from './bar.js'` anche se il file è `bar.ts`. Senza suffix → runtime error.
- **Path alias `@/*`** disponibile solo in UI (Next.js + Vitest). Non esiste in agent-core.
- **Mai cross-package imports.** UI non importa da `packages/agent-core`. Il contratto è REST/WS (vedi `ui/src/lib/api.ts`).
- `import 'mqtt'` vietato fuori da `agent-core/src/mqtt/MqttClient.ts` (vedi `mqtt-conventions.md` M6).

## TS2 — Types

- **No `any`.** Usa `unknown` ai confini, narrow con typeguard.
- **Discriminated union** per entità polimorfe (`Action`, `Trigger`, `ScenarioStep`). Mai stringhe magiche.
- **Type-only import** dove possibile: `import type { Foo } from '...'` — evita bundle bloat + circular dep runtime.
- **Zod** disponibile in agent-core (`zod` in deps). Usare per validazione ai confini (payload MQTT, body API). Non per tipi interni.

## TS3 — Error handling

- **Niente `catch (e) {}`** silenziosi. Log + rethrow o log + fallback esplicito.
- **Error con contesto.** `throw new Error(\`Device \${deviceId} not found in registry\`)` non `throw new Error('not found')`.
- **No `return null` come canale errore** in API pubbliche — usa throw o `Result`-style. `getDeviceSnapshot` può tornare `null` perché è un getter lookup.
- **`.catch(() => {})` fire-and-forget** tollerato solo per trigger scenario async (vedi `server.ts`) — documentare intenzionalità.

## TS4 — Async

- **Ogni async long-running** (loop timer, heartbeat, cron) accetta cancellation → usa `AbortController` o flag esplicito, non `clearInterval` orfani.
- **No `.then` chain** — usa `await`. Eccezione: fire-and-forget top-level in `server.ts`.
- **No `Promise.race` con timeout naked** → usa helper timeout che rigetta con Error tipizzato.

## TS5 — Side effects al module-load

**Vietati.** Moduli TS devono essere import-safe. Niente `new MqttClient()` a livello modulo, niente `redis.connect()` in import. Wiring vive in `index.ts` (composition root).

**Red flag.** `const client = new X()` a top-level in qualunque file sotto `src/` diverso da `index.ts`.

## TS6 — Logger

- `logger.info/warn/error/debug/fatal` da `packages/agent-core/src/logger.ts` (pino).
- **Structured logging:** `logger.info({ deviceId, room }, 'Device state changed')` — prima object, poi message.
- **No string interpolation nel message** se i campi sono strutturati.
- `logger.debug` OK senza gate (pino filtra internamente in modo efficiente — differente da ELIS log4net).

## TS7 — React / UI

- **Server components by default** in Next.js App Router. `'use client'` solo dove necessario (stato, effetti, event handler).
- **`RealtimeProvider`** è l'unica source of truth per devices/systemState nella UI. Niente fetch duplicato in componenti figli — usa `useContext(RealtimeContext)` via hook.
- **No polling.** Reconcile via WS snapshot + `state_change` patches.
- **Tailwind v4** — classi utility. Niente CSS modules a meno di necessità specifica.
- **Radix UI** per primitive accessibili (dialog, slider, switch, tooltip). Non reinventare.
- **`clsx` + `tailwind-merge`** via `cn()` helper in `lib/utils.ts` per conditional classes.

## TS8 — File layout

- Un export principale per file quando ragionevole. Helper privati coabitano.
- `types.ts` locale al modulo (es. `rules/types.ts`) per tipi del dominio. Top-level `types.ts` per tipi cross-package.
- Test accanto al codice: `foo.ts` → `__tests__/foo.test.ts` o `foo.test.ts`.

## TS9 — Naming

- **Classi** = sostantivi PascalCase: `StateManager`, `RuleEngine`.
- **Funzioni / metodi** = verbi camelCase: `sendDeviceEvent`, `triggerScenario`.
- **Boolean** = predicato: `isConnected`, `hasHeartbeat`, `shouldRollback`.
- **Interfacce** = senza prefix `I` (C# style). Es: `MessageBrokerInterface`, non `IMessageBroker`.
- **Types** = PascalCase: `DeviceState`, `RuleDefinition`.

## TS10 — No comments unless necessary

Default: nessun commento. Commento solo per *perché* non deducibile dal codice (vincolo esterno, workaround bug noto). Niente `// loop sui devices` sopra un `for`. Niente TODO orfani.

---

## Severità review

- **BLOCKER** — TS1 (`mqtt` import), TS5 (side-effect module-load), TS2 (`any` in API pubblica).
- **MAJOR** — TS3 (catch vuoti), TS4 (promise senza cancellation), TS7 (polling).
- **MINOR** — TS6 (string interpolation in log message), TS9 (naming), TS10 (commenti ridondanti).
