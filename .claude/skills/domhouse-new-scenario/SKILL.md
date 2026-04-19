---
name: domhouse-new-scenario
description: Authoring kit for a new DomHouse scenario in config/scenarios/*.yml. Use when the user asks "nuovo scenario", "crea scenario", "modalità <X>" (cinema, notte, sveglia, festa), "goodnight scenario", or similar. Produces YAML + rollback design + loop check + post-paste checklist. Does NOT write files.
---

# DomHouse: Nuovo Scenario

## Quando scatta
Trigger phrases:
- "nuovo scenario", "crea scenario", "add scenario"
- "modalità <cinema|notte|sveglia|cena|party|lavoro>"
- "scenario <name>"
- "sequenza di comandi"
- "macro" (in senso domotica, non ELIS-SECS/GEM)

## Cosa produce
1. Entry YAML per `config/scenarios/<file>.yml` — schema Y3.
2. Check loop detection (no scenario ricorsivi).
3. Design rollback (opzionale).
4. Checklist post-paste.

## Workflow

### Step 1 — Raccogli requisiti
- **Name** (snake_case, univoco).
- **Description** user-facing.
- **Mode:** sequential (step in ordine, failure aborta) o parallel (tutti concorrenti)?
- **Steps:** lista di azioni.
- **TimeoutMs** (opzionale, per l'intero scenario).
- **Rollback:** serve? Che azioni su failure?

Se l'utente è vago, chiedi una domanda alla volta (mode prima, poi steps).

### Step 2 — Contesto
- Read `config/devices/*.yml` → topic validi.
- Read `config/scenarios/*.yml` → nomi esistenti (no duplicati) + grafo `trigger_scenario` per loop check.
- Read `config/rules/*.yml` → chi potrebbe chiamare questo scenario (da `actions[trigger_scenario].name`).

### Step 3 — Valida
- `name` snake_case univoco.
- Ogni `mqtt_publish.topic` → matcha device registrato (`home/{room}/{type}/{id}/set`).
- `wait.ms` plausibile (< 60000, MINOR se superiore).
- `trigger_scenario.name` in step → esiste + non chiude un ciclo (DFS).
- `rollback` contiene solo `mqtt_publish` / `set_system_state` (Y3.e).
- Niente placeholder `${...}` (Y4).

### Step 4 — Genera YAML
```yaml
- name: <snake_case>
  description: <descrizione italiana>
  mode: sequential          # or parallel
  timeoutMs: 10000          # opzionale
  steps:
    - type: mqtt_publish
      topic: home/<room>/<type>/<id>/set
      payload: { on: false }
    - type: wait
      ms: 500
    - type: mqtt_publish
      topic: home/<room>/<type>/<id>/set
      payload: { on: true, brightness: 30 }
    - type: set_system_state
      state: night
  rollback:                 # opzionale
    - type: mqtt_publish
      topic: home/<room>/<type>/<id>/set
      payload: { on: true, brightness: 100 }
```

### Step 5 — Output
Stampa:
1. YAML fenced.
2. Path target (suggerisci `config/scenarios/<file>.yml` — es. `common.yml` se cross-room, altrimenti `<room>.yml`).
3. Loop check result (OK / detected cycle: `A → B → A`).
4. Checklist:
   - [ ] Incolla in `config/scenarios/<file>.yml`.
   - [ ] `/dh-yaml-validate scenarios`.
   - [ ] Restart agent-core.
   - [ ] Trigger manuale:
     ```bash
     curl -X POST http://localhost:3000/api/scenarios/<name>/trigger -d '{}'
     ```
   - [ ] Osserva:
     - `/dh-mqtt-sniff home/#` per topic.
     - `/dh-logs agent-core` per errori.
   - [ ] Se testato in produzione: verifica rollback simulando failure (publish a topic device non raggiungibile, verifica rollback trigger).

## Pattern comuni

### Modalità (scene) — sequential + rollback
```yaml
- name: movie_night
  mode: sequential
  timeoutMs: 10000
  steps: [...]
  rollback: [...]
```

### Spegnimento multi-device — parallel
```yaml
- name: all_lights_off
  mode: parallel
  steps:
    - type: mqtt_publish
      topic: home/living/light/ceiling/set
      payload: { on: false }
    - type: mqtt_publish
      topic: home/bedroom/light/ceiling/set
      payload: { on: false }
```

### Chain
```yaml
- name: goodnight
  mode: sequential
  steps:
    - type: trigger_scenario
      name: all_lights_off
    - type: set_system_state
      state: night
```

## Anti-pattern
- `trigger_scenario` ricorsivo (A → B → A): loop.
- `rollback` che contiene `trigger_scenario` — non supportato (Y3.e).
- Scenari > 10 step: difficili da ragionare, spezzare in sotto-scenari chiamati via `trigger_scenario`.
- `wait` > 10s in `mode: sequential` con molti step: considera parallelismo.
- Payload `"true"` (stringa) invece di `true` (boolean).

## Limiti
- Non scrive file. Output fenced.
- Non triggera lo scenario (`curl` manuale in checklist).
- Non valida runtime: il broker reale non risponde a questo skill.
