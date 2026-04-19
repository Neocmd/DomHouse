# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Repo is an npm workspace (`packages/*`), Node ≥ 22.

Root:
- `npm run dev` — `docker compose up --build` (redis + influxdb + agent-core + ui). Mosquitto is assumed to run as a Windows service on host `:1883`; to use the containerized broker uncomment the `mosquitto` block in `docker-compose.yml` and set `MQTT_URL=mqtt://mosquitto:1883`.
- `npm run down` / `npm run logs` — compose down / follow logs.
- `npm run agent` / `npm run ui` — run a single package in dev mode without Docker (agent on `:3000`, UI on `:4000`).

`packages/agent-core` (Node/TS, Fastify, xstate):
- `npm run dev` — `tsx watch src/index.ts`
- `npm run build` — `tsc` → `dist/`
- `npm run start` — `node dist/index.js`
- `npm run typecheck` — `tsc --noEmit`
- No unit test runner wired here. Tests live in the UI package.

`packages/ui` (Next.js 15, React 19, Tailwind v4, Vitest):
- `npm run dev` — `next dev -p 4000`
- `npm run build` / `npm run start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — `vitest run --passWithNoTests`
- `npm run test:watch` — watch mode
- Run one test file: `npx vitest run src/context/__tests__/RealtimeContext.test.tsx` (alias `@/*` → `src/*` defined in `vitest.config.ts`)

Env config in `.env.example` (MQTT_URL, REDIS_URL, INFLUXDB_URL/TOKEN/ORG/BUCKET, API_PORT).

## Architecture

Two-process system: **agent-core** (backend, MQTT hub + state + rules/scenarios + HTTP/WS API) and **ui** (Next.js app consuming REST + WebSocket). YAML config is mounted read-only from `./config` into agent-core at `/app/config`.

### agent-core boot wiring (`src/index.ts`)

Construction order is load-bearing — it establishes the dependency graph:

1. Storage: `RedisStateStore` (ioredis, current snapshot store) + `InfluxWriter` (time-series).
2. `StateManager` owns three xstate actors: one `systemMachine` (home/away/night/vacation), one `roomMachine` per room, one `deviceMachine` per device. Every state transition is mirrored to Redis and to InfluxDB; `StateManager.onStateChange` fans out to listeners (rules + WebSocket).
3. `MqttClient` implements `MessageBrokerInterface` (`publish`/`subscribe`/`unsubscribe`/`isConnected`). Everything that talks MQTT takes the interface, not the concrete client — do not import `mqtt` elsewhere.
4. `DeviceRegistry.load(CONFIG_DIR)` reads `config/devices/*.yml`.
5. `RuleEngine` + `ScenarioEngine` load YAML from `config/rules/` and `config/scenarios/`.
6. `ActionExecutor` is injected into `RuleEngine` via `setActionExecutor` — breaks the rules ↔ scenarios cycle (rules fire actions; one action kind is `trigger_scenario`).
7. `MqttRouter` subscribes to `home/+/+/+/state` (and `.../config` for auto-discovery) and feeds both `StateManager.sendDeviceEvent` and `RuleEngine.checkThreshold` for numeric fields.
8. `startServer` (Fastify + `@fastify/websocket`) exposes REST + `/ws`. Graceful shutdown flushes Influx, disconnects MQTT+Redis.

### MQTT topic conventions

- Device state/command: `home/{room}/{type}/{id}/state` and `.../set`. `MqttRouter` derives `deviceId = "${room}.${type}.${id}"`.
- Device auto-discovery: retained publish to `home/{room}/{type}/{id}/config` — registers the device if unknown.
- Scenario trigger via MQTT: `domhouse/scenarios/{name}/trigger` (listener exists; execution path is pending).

### HTTP/WS API surface (`src/api/server.ts`)

- `GET/POST /api/state` — system state (POST body `{ state: home|away|night|vacation }` maps to `SET_*` events on `systemMachine`).
- `GET /api/devices`, `GET /api/devices/:id`, `POST /api/devices/:id/command` — command goes through `MqttRouter.command` → `broker.publish(device.topic.set)`.
- `GET /api/scenarios`, `POST /api/scenarios/:name/trigger`.
- `GET /health`.
- `GET /ws` — on connect pushes `{ type: 'snapshot', data: { systemState, devices } }`, then streams `{ type: 'state_change', data: StateChangeEvent }` for every `StateManager` emission (system | room | device). The UI keys its whole realtime model off these two message shapes — see `packages/ui/src/context/RealtimeContext.tsx` and `packages/ui/src/hooks/useRealtime.ts`.

### Rules & scenarios (YAML)

Schemas: `packages/agent-core/src/rules/types.ts`, `.../scenarios/types.ts`. See `config/rules/comfort.yml` and `config/scenarios/common.yml` for canonical examples.

- Triggers: `mqtt` (topic + optional `payloadMatch`), `cron`, `state_change` (system/room/device), `threshold` (numeric field with hysteresis timer `forSeconds`, tracked in `RuleEngine.thresholdState`).
- Conditions evaluated by `ConditionEvaluator` (system_state / time_range / device_state …).
- Action kinds: `mqtt_publish` | `trigger_scenario` | `set_system_state` | `log`. Dispatched by `ActionExecutor`.
- Scenarios run `mode: sequential | parallel`, support `wait` steps, optional `timeoutMs`, and optional `rollback` steps on failure.

### UI (`packages/ui`)

Next.js App Router. `RealtimeProvider` (in `src/context/RealtimeContext.tsx`) initializes by REST (`fetchDevices` + `fetchState`) then reconciles from the `/ws` snapshot + `state_change` patches. Components under `src/components` consume devices by id. Pages: `/` (dashboard), `/rooms`, `/rooms/[room]`, `/scenarios`, `/settings`.

## Conventions worth remembering

- Everything that speaks MQTT goes through `MessageBrokerInterface` — do not instantiate `mqtt` clients in rule/scenario/router code.
- New action kinds: extend `Action` union in `rules/types.ts`, handle in `ActionExecutor`. New trigger kinds: extend `Trigger` union + wire in `RuleEngine.start`.
- Device IDs follow `{room}.{type}.{id}`; topics follow `home/{room}/{type}/{id}/{state|set|config}`. Keep both sides in sync when adding devices.
- Config YAML is read-only at runtime; there is no reload endpoint — restart the agent after editing `config/*`.
- Target = `.env.example` defaults; compose uses `host.docker.internal` to reach the host Mosquitto service.

---

## Project-local Claude setup

`.claude/` contains project-specific rules, agents, commands, and skills. Load them in order of relevance:

### Rules (`.claude/rules/`)

| File | Scope |
|---|---|
| [architecture.md](.claude/rules/architecture.md) | Layer boundaries (A1..A7), composition root, DIP via `MessageBrokerInterface`. |
| [mqtt-conventions.md](.claude/rules/mqtt-conventions.md) | Topic schema, deviceId format, QoS/retain, auto-discovery (M1..M8). |
| [yaml-schemas.md](.claude/rules/yaml-schemas.md) | `config/devices|rules|scenarios` schemas (Y1..Y6). |
| [typescript-style.md](.claude/rules/typescript-style.md) | TS conventions (TS1..TS10) — imports, `any`, async, React. |
| [testing.md](.claude/rules/testing.md) | Vitest setup, FIRST, patterns. |

### Agents (`.claude/agents/`)

| Agent | Use when |
|---|---|
| `@domhouse-architect` | BEFORE moving code across layers, editing `index.ts` wiring, introducing new imports in `state/`/`mqtt/`/`rules/`. |
| `@domhouse-yaml-linter` | Auto-invoked via `/dh-yaml-validate`. Validates `config/**/*.yml`. |
| `@domhouse-mqtt-auditor` | Diff touches `mqtt/**`, `router/**`, or adds `subscribe`/`publish` anywhere. |
| `@domhouse-rule-author` | Authoring new rules (auto-invoked by `/dh-new-rule` + skill). |
| `@domhouse-state-fsm-reviewer` | Adding states/events/guards in `state/machines.ts`. |

### Commands (`.claude/commands/`)

| Command | Purpose |
|---|---|
| `/dh-test [pattern]` | Run Vitest in `packages/ui` (file path or `-t` name filter). |
| `/dh-typecheck` | Run `tsc --noEmit` on both packages in parallel. |
| `/dh-yaml-validate [devices\|rules\|scenarios\|all]` | Lint `config/` via `@domhouse-yaml-linter`. |
| `/dh-logs [service]` | Tail `docker compose logs -f`. |
| `/dh-mqtt-sniff [topic]` | `mosquitto_sub` against host broker (default `home/#`). |
| `/dh-new-device <room> <type> <id> [caps]` | Scaffold device YAML. |
| `/dh-new-rule <description>` | Delegate to `@domhouse-rule-author`. |
| `/dh-new-scenario <name> <description>` | Scaffold scenario YAML. |

### Skills (`.claude/skills/`)

Auto-trigger on phrases:
- `domhouse-new-device` — "nuovo device", "aggiungi sensore", "new smart plug".
- `domhouse-new-rule` — "nuova rule", "automazione", "quando X → Y".
- `domhouse-new-scenario` — "nuovo scenario", "modalità <cinema/notte>", "macro".

All skills output fenced fragments + post-paste checklist — they never write files directly.

### Operational notes

1. **No auto-commit / push.** Never `git commit` or `git push` without explicit user request.
2. **Config is read-only at runtime.** After editing `config/**` the agent-core must be restarted.
3. **Branch workflow:** PR target is the active feature branch; do not push to `main` without approval.
4. **The host broker** (Mosquitto on `:1883` as Windows service) is the default. The Docker broker in compose is commented out.
