# DomHouse Architecture — Regole operative

Fonte di verità per `@domhouse-architect`. Italiano. Scope: `C:\sviluppo\DomHouse`.

Due-process system: **agent-core** (Node/TS, Fastify, xstate, MQTT hub) + **ui** (Next.js 15). Config YAML esterno in `config/` montato read-only nel container.

---

## A1 — Layer boundaries

Nessuna dipendenza inversa. Direzione consentita:

```
index.ts (composition root)
  ↓
router / api        ← entry points
  ↓
rules / scenarios   ← business logic
  ↓
state / mqtt        ← infrastructure adapters
  ↓
logger / config / types  ← foundation
```

- **Rules** possono dipendere da `StateManager`, `MessageBrokerInterface`, `ActionExecutor` (via injection).
- **Scenarios** possono dipendere da `StateManager`, `MessageBrokerInterface`.
- **Router** dipende da tutto lo stack sotto; nessuno dipende dal router.
- **State / mqtt** non conoscono rules/scenarios.
- **UI** dipende solo dal contratto REST/WS pubblico in `packages/ui/src/lib/api.ts`. Mai import diretto da `packages/agent-core`.

**Red flag.** Un file in `state/` che importa da `rules/` o `scenarios/`.

## A2 — Composition root

Tutto il wiring vive in `packages/agent-core/src/index.ts`. Ordine non-negoziabile:

1. `RedisStateStore` + `InfluxWriter` → connessione.
2. `StateManager(redis, influx)` — inizializza `systemMachine`.
3. `MqttClient.connect()` — implementa `MessageBrokerInterface`.
4. `DeviceRegistry.load(CONFIG_DIR)`.
5. `RuleEngine` + `ScenarioEngine` → `load(CONFIG_DIR)`.
6. `ActionExecutor` — iniettato in `RuleEngine` via `setActionExecutor` (rompe ciclo rules ↔ scenarios).
7. `MqttRouter.start()`.
8. `ruleEngine.start()` → subscribe MQTT + cron.
9. `startServer()` (Fastify + WS).
10. `SIGTERM`/`SIGINT` → flush Influx, disconnect MQTT/Redis.

**Regola.** Non inizializzare componenti fuori da `index.ts`. Niente singleton auto-registranti.

## A3 — Dependency Inversion via `MessageBrokerInterface`

Chiunque parli MQTT prende `MessageBrokerInterface`, non `MqttClient` concreto. Mai `import 'mqtt'` fuori da `packages/agent-core/src/mqtt/MqttClient.ts`.

**Red flag.** `new MqttClient(...)` in `rules/`, `scenarios/`, `router/`, `api/`.

## A4 — State management

`StateManager` è l'unico owner degli xstate actor. Tre macchine:
- **systemMachine** — singleton (home/away/night/vacation).
- **roomMachine** — una per stanza, creata lazy in `ensureRoom`.
- **deviceMachine** — una per device, creata lazy in `ensureDevice`.

Ogni transizione scrive Redis (snapshot) + Influx (time-series) + emette `StateChangeEvent` ai listener (rules, WebSocket).

**Regola.** Niente stato duplicato fuori da `StateManager`. Niente cache locale di `systemState` in altri moduli.

## A5 — Extension points

- **Nuovo action kind:** estendi union `Action` in `rules/types.ts` + handler in `api/ActionExecutor.ts`.
- **Nuovo trigger kind:** estendi union `Trigger` in `rules/types.ts` + wiring in `RuleEngine.start()`.
- **Nuovo step scenario:** estendi `ScenarioStep` in `scenarios/types.ts` + handler in `ScenarioEngine`.
- **Nuovo device type:** estendi `DeviceType` in `types.ts` + capability mapping in UI `DeviceCard`.
- **Nuovo endpoint API:** aggiungi in `api/server.ts`, tieni REST + WS snapshot coerenti.

## A6 — UI ↔ agent-core contract

Il contratto è in `packages/ui/src/lib/api.ts` + shape del messaggio WS in `RealtimeContext.tsx` (`snapshot`, `state_change`). Ogni modifica al contratto tocca **entrambi** i lati nello stesso commit.

**Regola.** Il server manda `snapshot` su connect, poi solo `state_change` patch. La UI non fa polling.

## A7 — Config reload

Config YAML è read-only a runtime. **Nessun hot reload.** Dopo modifica a `config/` → restart container/process.

**Regola.** Non aggiungere file watcher su `config/` senza discussione esplicita (implica cache invalidation + re-subscribe MQTT + re-schedule cron).

---

## Severità in review

- **BLOCKER** — violazione A1 (layer inversion), A3 (`mqtt` importato fuori da `MqttClient`), A4 (stato duplicato).
- **MAJOR** — A2 (wiring fuori da index.ts), A5 (extension senza toccare union types), A6 (contratto UI/API disallineato).
- **MINOR** — A7 (file watcher non richiesto).
