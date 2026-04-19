---
name: domhouse-new-device
description: End-to-end addition of a new smart device in DomHouse. Use when the user says "nuovo device", "aggiungi device", "new smart plug", "aggiungi sensore", "nuovo light in <room>", "register device", or similar. Produces device YAML entry + optional ESPHome template + UI impact notes + checklist. Does not write files — outputs fragments for paste.
---

# DomHouse: Nuovo Device

## Quando scatta
Trigger phrases:
- "nuovo device", "aggiungi device", "registra device"
- "nuovo light/sensor/blind/media/lock/climate/switch/camera/alarm/presence in <room>"
- "aggiungi smart plug", "aggiungi termostato", "aggiungi sensore temperatura"

## Cosa produce
1. **Entry YAML** per `config/devices/<room>.yml` — schema Y1 di `.claude/rules/yaml-schemas.md`.
2. **Opzionale:** template ESPHome in `infra/esphome/` se il device è fisico.
3. **UI impact:** `DeviceCard` e `DeviceType` — flag se serve modifica.
4. **Checklist post-paste** — validate, restart, verify.

## Workflow

### Step 1 — Raccogli info
Chiedi (una domanda alla volta se non già fornite):
- `room` slug (lowercase).
- `type` ∈ `light|switch|sensor|lock|climate|media|blind|camera|alarm|presence`.
- `id_segment` (slug lowercase).
- `name` user-facing (italiano).
- `capabilities` (array slug snake_case).
- Il device è fisico (ESPHome/Tasmota) o virtuale?

### Step 2 — Verifiche
- Read `config/devices/*.yml`:
  - `deviceId = ${room}.${type}.${id_segment}` non esiste.
  - Convenzioni di naming coerenti con entry esistenti.
- Read `packages/agent-core/src/types.ts`:
  - `type` ∈ `DeviceType` union. Se no → BLOCKER: serve estendere union.

### Step 3 — Genera device YAML
```yaml
- id: <room>.<type>.<id>
  name: <Name italiano>
  type: <type>
  room: <room>
  topic:
    state: home/<room>/<type>/<id>/state
    set:   home/<room>/<type>/<id>/set
    config: home/<room>/<type>/<id>/config
  capabilities: [<caps>]
  meta:
    vendor: <esphome|tasmota|custom>   # opzionale
```

### Step 4 — ESPHome template (se device fisico)
Se confermato ESPHome, genera anche stub `infra/esphome/<name>.yml` basato sui template esistenti (`infra/esphome/light_template.yml`, `sensor_temp_motion.yml`).

### Step 5 — UI impact check
- Esiste gestione UI per `type`?
  - `packages/ui/src/components/DeviceCard.tsx` — check se `type` ha branch di render.
  - Se no → propone estensione (snippet, non scritto).
- `type` nuovo in `DeviceType` → richiede modifica a:
  - `packages/agent-core/src/types.ts` (union).
  - `packages/ui/src/lib/api.ts` se la UI la conosce.
  - `DeviceCard` per render capabilities.

### Step 6 — Output finale
Stampa:
1. YAML da incollare + path target (`config/devices/<room>.yml`).
2. ESPHome template (se richiesto) + path.
3. UI changes richiesti (lista file : motivo).
4. Checklist:
   - [ ] Incolla YAML in `config/devices/<room>.yml` (creane il file se non esiste).
   - [ ] `/dh-yaml-validate devices`
   - [ ] Restart agent-core: `docker compose restart agent-core` o `npm run agent`.
   - [ ] Se fisico: flash ESPHome, verifica retained `config` topic via `/dh-mqtt-sniff home/<room>/<type>/<id>/config`.
   - [ ] UI smoke test: `http://localhost:4000/rooms/<room>`.

## Limiti
- **Non scrive file.** Solo fragments fenced + path.
- **Non modifica UI direttamente.** Flag cambi necessari, lascia la decisione.
- **Non flasha ESPHome** — suggerisce il template, l'utente lo usa.
- **Non inventa capability non standard.** Grep esistenti per coerenza.

## Anti-pattern
- Aggiungere il device direttamente via MQTT auto-discovery (retained `config` topic) — funziona, ma bypassa review e file di verità.
- Duplicare `deviceId`: il secondo sovrascrive silenziosamente in memoria.
- `name` in inglese: la UI è italiana, mantenere coerenza.
