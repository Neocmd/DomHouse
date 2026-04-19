---
name: domhouse-new-rule
description: Authoring kit for a new DomHouse automation rule in config/rules/*.yml. Use when the user asks "nuova rule", "add rule", "automazione", "trigger su motion/temp/cron", "quando X → Y", or invokes /dh-new-rule. Produces YAML entry + cross-checks device/scenario references + post-paste checklist. Does NOT write files.
---

# DomHouse: Nuova Rule

## Quando scatta
Trigger phrases:
- "nuova rule", "crea rule", "add rule"
- "automazione <trigger>"
- "quando <event> → <action>"
- "trigger su <topic/sensor/cron>"
- "reagisci a <state change>"

## Cosa produce
1. Entry YAML per `config/rules/<file>.yml` — schema Y2 di `.claude/rules/yaml-schemas.md`.
2. Cross-reference check con devices + scenarios.
3. Checklist post-paste.

## Workflow

### Step 1 — Decompose richiesta
Estrai dalla richiesta dell'utente:
- **Trigger type:** `mqtt` (topic event) | `cron` (schedule) | `state_change` (system/room/device transition) | `threshold` (numeric field with hysteresis).
- **Conditions** (AND): system state, time range, device state.
- **Actions** (in ordine): mqtt_publish | trigger_scenario | set_system_state | log.

Se ambiguo, chiedi una singola domanda mirata, non check-list.

### Step 2 — Leggi contesto
- Read `config/devices/*.yml` → set di `deviceIds`, topic validi.
- Read `config/scenarios/*.yml` → set di `scenarioNames`.
- Read `config/rules/*.yml` → per evitare `id` duplicato.

### Step 3 — Valida riferimenti
- Ogni `deviceId` (in threshold trigger, device_state condition, mqtt_publish topic) → esiste.
- Ogni `trigger_scenario.name` → esiste.
- `set_system_state.state` ∈ `home|away|night|vacation`.
- Topic in `mqtt_publish`: `home/{room}/{type}/{id}/set` coerente con device registrato.
- `time_range.from < time_range.to` o documentare cross-midnight.

### Step 4 — Genera YAML
```yaml
- id: <snake_case>
  name: <Descrizione italiana>
  enabled: true
  trigger:
    type: <mqtt|cron|state_change|threshold>
    # campi per tipo — vedi yaml-schemas.md Y2
  conditions:
    - type: <system_state|time_range|device_state>
      # campi per tipo
  actions:
    - type: <mqtt_publish|trigger_scenario|set_system_state|log>
      # campi per tipo
```

### Step 5 — Scegli il file target
- Raggruppa per dominio: `comfort.yml` (luci/clima), `security.yml` (allarme/presenza), `daily.yml` (cron quotidiani), ecc.
- Se un file appropriato esiste → suggerisci quello. Se no → nuovo file.

### Step 6 — Output
Stampa:
1. YAML fenced.
2. File target (`config/rules/<file>.yml`).
3. Note su cross-reference (deviceId/scenarioName verificati o mancanti).
4. Checklist:
   - [ ] Incolla in `config/rules/<file>.yml`.
   - [ ] `/dh-yaml-validate rules`.
   - [ ] Restart agent-core.
   - [ ] Test manuale:
     - trigger mqtt → `mosquitto_pub -h localhost -t <topic> -m '<payload>'`
     - trigger cron → aspetta o modifica expression temporaneamente
     - trigger state_change → `curl -X POST http://localhost:3000/api/state -d '{"state":"away"}'`
     - trigger threshold → pubblica valori che superano soglia per `forSeconds`
   - [ ] Osserva logs: `/dh-logs agent-core`.

## Esempi trigger

### MQTT trigger
```yaml
trigger:
  type: mqtt
  topic: home/living/sensor/motion/state
  payloadMatch:
    motion: true
```

### Cron
```yaml
trigger:
  type: cron
  expression: "30 23 * * *"   # 23:30 ogni giorno
```

### State change
```yaml
trigger:
  type: state_change
  entity: system
  id: system
  to: away
```

### Threshold con isteresi
```yaml
trigger:
  type: threshold
  deviceId: living.sensor.temp
  field: temperature
  operator: ">"
  value: 28
  forSeconds: 300
```

## Anti-pattern da evitare
- `#` wildcard in trigger mqtt (troppo rumore — M5).
- Placeholder `${...}` (Y4: non supportati).
- `trigger_scenario` verso scenario non esistente (dangling).
- `threshold.deviceId` non registrato.
- `forSeconds` omesso su threshold in contesto rumoroso → rule flappy.

## Limiti
- Non scrive file. Output fenced.
- Non testa il broker reale (usa `/dh-mqtt-sniff` post-deploy).
- Non estende i type di trigger/action — quello richiede modifica a `rules/types.ts` + `RuleEngine` + `ActionExecutor` (propose separatamente).
