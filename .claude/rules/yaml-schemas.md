# DomHouse YAML Schemas

Fonte di verità per `@domhouse-yaml-linter`, `@domhouse-rule-author`, gli skill di authoring. Schemi dei file in `config/`.

Schemi TypeScript canonici:
- `config/devices/*.yml` → `DeviceConfig[]` in `packages/agent-core/src/types.ts`.
- `config/rules/*.yml` → `RuleDefinition[]` in `packages/agent-core/src/rules/types.ts`.
- `config/scenarios/*.yml` → `ScenarioDefinition[]` in `packages/agent-core/src/scenarios/types.ts`.

Array top-level per ogni file. Niente wrapper object.

---

## Y1 — `config/devices/*.yml`

```yaml
- id: living.light.ceiling           # {room}.{type}.{id} — univoco
  name: Luce Soffitto Salotto        # UI-friendly
  type: light                        # DeviceType union
  room: living                       # lowercase slug
  topic:
    state: home/living/light/ceiling/state
    set:   home/living/light/ceiling/set
    config: home/living/light/ceiling/config   # opzionale
  capabilities: [on_off, brightness, color_temp]
  meta:                              # opzionale — passthrough a UI
    vendor: esphome
```

**Regole.**
- `id` = `{room}.{type}.{id}`. DEVE matchare `topic.state/set` (ultimi 4 segmenti dopo `home/`).
- `type` ∈ `light|switch|sensor|lock|climate|media|blind|camera|alarm|presence`.
- `capabilities` = slug snake_case. Usate dalla UI per rendering; non validate a runtime.
- Duplicati `id` → BLOCKER (ultimo vince silenziosamente).

## Y2 — `config/rules/*.yml`

```yaml
- id: auto_lights_motion             # slug univoco
  name: Luci automatiche con movimento
  enabled: true                      # default true; false salta il load
  trigger:
    type: mqtt                       # mqtt | cron | state_change | threshold
    topic: home/living/sensor/motion/state
    payloadMatch:                    # opzionale, subset match
      motion: true
  conditions:                        # AND tra condizioni
    - type: system_state             # system_state | time_range | device_state
      operator: "!="
      value: away
    - type: time_range
      from: "20:00"
      to: "23:59"
  actions:                           # eseguite in ordine
    - type: mqtt_publish
      topic: home/living/light/ceiling/set
      payload: { on: true, brightness: 80 }
```

### Trigger types

| type | campi | note |
|---|---|---|
| `mqtt` | `topic`, `payloadMatch?` | `+`/`#` ammessi in topic |
| `cron` | `expression` (cron 5 campi) | risoluzione min |
| `state_change` | `entity` (system/room/device), `id`, `to?`, `from?` | match transizione |
| `threshold` | `deviceId`, `field`, `operator` (>/</>=/<=/==/!=), `value`, `forSeconds?` | isteresi via `forSeconds` |

### Condition types

| type | campi |
|---|---|
| `system_state` | `operator`, `value` |
| `time_range` | `from`, `to` (HH:MM, 24h) |
| `device_state` | `deviceId`, `operator`, `value` |

### Action types

| type | campi |
|---|---|
| `mqtt_publish` | `topic`, `payload` |
| `trigger_scenario` | `name` |
| `set_system_state` | `state` (home/away/night/vacation) |
| `log` | `message`, `level?` (info/warn/error) |

**Red flag.**
- `trigger.type: mqtt` senza `topic`.
- `trigger.type: threshold` senza `deviceId` registrato in `config/devices/`.
- `conditions.time_range` con `from > to` (cross-midnight) → valida ma da flaggare MINOR.
- `actions.trigger_scenario.name` non esistente → BLOCKER.

## Y3 — `config/scenarios/*.yml`

```yaml
- name: movie_night                  # slug univoco, chiamato da actions
  description: Modalità cinema salotto
  mode: sequential                   # sequential | parallel
  timeoutMs: 10000                   # opzionale, scenario intero
  steps:
    - type: mqtt_publish
      topic: home/living/light/ceiling/set
      payload: { on: false }
    - type: wait
      ms: 500
  rollback:                          # opzionale — eseguito su failure
    - type: mqtt_publish
      topic: home/living/light/ceiling/set
      payload: { on: true, brightness: 100 }
```

### Step types

| type | campi |
|---|---|
| `mqtt_publish` | `topic`, `payload` |
| `wait` | `ms` |
| `set_system_state` | `state` |
| `trigger_scenario` | `name` — attenzione ricorsione |

**Regole.**
- `mode: sequential` → step eseguiti in ordine, failure aborta + rollback.
- `mode: parallel` → step eseguiti concorrenti, `Promise.all`, failure aborta quelli pendenti.
- `timeoutMs` applicato al tempo totale scenario (non per step).
- `rollback` può riferire solo step `mqtt_publish` / `set_system_state` — niente `wait` / `trigger_scenario`.

**Red flag.**
- Ricorsione: scenario A → scenario B → scenario A → BLOCKER (loop detector da aggiungere).
- `wait` > 60000ms → MINOR (probabile errore di design).

## Y4 — Placeholder e templating

**NON supportati.** A differenza di ELIS non c'è `${envItem}` o `${input[n]}`. Il payload è letterale. Per dinamicità usa rules + condizioni, non template.

## Y5 — Naming

- File: `kebab-case.yml`. Es: `comfort.yml`, `bedroom-night.yml`.
- `id` / `name` rule/scenario: `snake_case`. Es: `auto_lights_motion`.
- `device.id`: `dot.case` = `{room}.{type}.{id}`.
- `name` user-facing: italiano, leggibile.

## Y6 — Validazione a load time

`RuleEngine.load()` e `ScenarioEngine.load()` loggano warn se la dir non esiste ma **non validano lo schema**. Errori di schema → runtime crash on first trigger.

**Rule operativa.** Prima di commit di YAML nuovo → `/dh-yaml-validate` per check schema.

---

## Audit output (`@domhouse-yaml-linter`)

```
[severity] <file>:<line> — Y<n>
Issue: <cosa>
Fix: <come>
```

Severità:
- **BLOCKER** — Y1 id duplicato, Y2 trigger malformato, Y3 scenario.name referenziato non esistente, Y1 mismatch id↔topic.
- **MAJOR** — Y2 threshold su device non registrato, Y3 rollback con step non supportato, Y4 placeholder syntax usata.
- **MINOR** — Y5 naming non conforme, Y3 wait eccessivo.
