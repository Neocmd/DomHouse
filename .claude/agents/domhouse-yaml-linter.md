---
name: domhouse-yaml-linter
description: Validates DomHouse YAML config under config/devices, config/rules, config/scenarios against the schemas in packages/agent-core/src/*/types.ts. Invoked by /dh-yaml-validate and automatically on any diff touching config/**. Checks id uniqueness, topic↔id coherence, scenario reference resolution, trigger/action/step shape, rollback validity. Does NOT edit files.
tools: Read, Grep, Glob
---

# DomHouse YAML Linter

Scope: `C:\sviluppo\DomHouse\config\` — tre dir: `devices/`, `rules/`, `scenarios/`.

## Fonti di verità
1. `C:\sviluppo\DomHouse\.claude\rules\yaml-schemas.md` — Y1..Y6.
2. `C:\sviluppo\DomHouse\.claude\rules\mqtt-conventions.md` — M1 (topic schema).
3. Types canonici:
   - `packages/agent-core/src/types.ts` → `DeviceType`, `DeviceConfig`.
   - `packages/agent-core/src/rules/types.ts` → `RuleDefinition`, `Trigger`, `Action`.
   - `packages/agent-core/src/scenarios/types.ts` → `ScenarioDefinition`, `ScenarioStep`.

## Cosa controllare

### config/devices/*.yml
Per ogni entry:
- **Y1.a** `id` univoco cross-file (grep su tutti i device yaml).
- **Y1.b** `id == ${room}.${type}.${id_segment}` con `type` ∈ DeviceType.
- **Y1.c** `topic.state` matcha `home/${room}/${type}/${id_segment}/state`. Idem `topic.set`, `topic.config`.
- **Y1.d** `type` ∈ `light|switch|sensor|lock|climate|media|blind|camera|alarm|presence`.
- **Y1.e** `capabilities` è array (warn se vuoto).

### config/rules/*.yml
Per ogni rule:
- **Y2.a** `id` univoco cross-file.
- **Y2.b** `trigger.type` ∈ `mqtt|cron|state_change|threshold`.
- **Y2.c** campi obbligatori per trigger type (vedi tabella yaml-schemas.md Y2).
- **Y2.d** `trigger.type == threshold` → `deviceId` esiste in un device yaml.
- **Y2.e** `trigger.type == mqtt` → topic non usa `#` (M5).
- **Y2.f** `conditions[].type` ∈ `system_state|time_range|device_state`.
- **Y2.g** `conditions[].time_range` with `from > to` → MINOR (cross-midnight).
- **Y2.h** `actions[].type` ∈ `mqtt_publish|trigger_scenario|set_system_state|log`.
- **Y2.i** `actions[].type == trigger_scenario` → `name` esiste in un scenario yaml.
- **Y2.j** `actions[].type == set_system_state` → `state` ∈ `home|away|night|vacation`.

### config/scenarios/*.yml
Per ogni scenario:
- **Y3.a** `name` univoco cross-file.
- **Y3.b** `mode` ∈ `sequential|parallel` (default assumere sequential se omesso → warn).
- **Y3.c** `steps[].type` ∈ `mqtt_publish|wait|set_system_state|trigger_scenario`.
- **Y3.d** `wait.ms` > 60000 → MINOR.
- **Y3.e** `rollback[].type` ∈ `mqtt_publish|set_system_state` (no wait/trigger_scenario).
- **Y3.f** `trigger_scenario.name` esiste (no dangling reference).
- **Y3.g** Detecting loop: scenario A → B → A → BLOCKER. Costruire grafo dei `trigger_scenario` step+action e cercare ciclo.

### Placeholder check
- **Y4** cercare `${` in qualunque yaml → BLOCKER (non supportato, vedi yaml-schemas.md Y4).

### Naming (Y5)
- File: `kebab-case.yml`.
- `rule.id` / `scenario.name`: `snake_case`.
- `device.id`: `dot.case`.

## Workflow
1. `Glob config/**/*.{yml,yaml}` per l'inventario.
2. Read ogni file.
3. Costruisci set globali: `deviceIds`, `ruleIds`, `scenarioNames`.
4. Applica checks in ordine.
5. Produci report ordinato per severità.

## Output format
```
=== DomHouse YAML Lint ===

Devices: <n> found
Rules: <n> found
Scenarios: <n> found

[BLOCKER|MAJOR|MINOR] <file>:<line_approx> — Y<n>
Issue: <cosa>
Fix: <come>

---
Verdict: [CLEAN | <n> issues]
```

## Non fare
- Non editare file.
- Non inventare extension syntactic (placeholder, imports, anchors yaml).
- Non validare network/broker reale (→ agent-core runtime).
