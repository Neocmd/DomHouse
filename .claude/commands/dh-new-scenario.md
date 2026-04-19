---
description: Scaffold a new scenario for config/scenarios/*.yml. Outputs YAML for paste; does not write files.
argument-hint: <name> <brief description>
allowed-tools: Read, Grep, Glob
---

Produce a YAML entry for a new scenario. Matches schema Y3 in `.claude/rules/yaml-schemas.md`.

Arguments: `$ARGUMENTS` — `name` (snake_case) + natural-language description of steps.

Example:
- `/dh-new-scenario pomeriggio_studio Modalità studio: spegni TV, luce lampada al 100% cold, tapparella al 80%`

Steps:
1. Parse `$ARGUMENTS`: first token = `name` (validate snake_case, unique vs existing scenarios), rest = description.
2. Read `config/devices/*.yml` per capire topic validi.
3. Read `config/scenarios/*.yml` per evitare nome duplicato e ciclo `trigger_scenario`.
4. Chiedi all'utente:
   - `mode`: sequential o parallel?
   - Serve `rollback` (recovery su failure)?
   - `timeoutMs` desiderato?
5. Compose YAML:
   ```yaml
   - name: <name>
     description: <descrizione italiana>
     mode: sequential   # or parallel
     timeoutMs: 10000   # omit if not needed
     steps:
       - type: mqtt_publish
         topic: home/<room>/<type>/<id>/set
         payload: { on: true, brightness: 100 }
       - type: wait
         ms: 500
       ...
     rollback:          # optional
       - type: mqtt_publish
         topic: ...
         payload: ...
   ```
6. Checklist:
   - [ ] `/dh-yaml-validate scenarios`
   - [ ] Restart agent-core.
   - [ ] Trigger manuale: `curl -X POST http://localhost:3000/api/scenarios/<name>/trigger -d '{}'`.
   - [ ] Osserva con `/dh-mqtt-sniff home/#`.

Regole operative:
- Solo `mqtt_publish` e `set_system_state` ammessi in `rollback` (Y3.e).
- Niente loop `trigger_scenario` (Y3.g).
- Niente placeholder `${...}` (Y4).

Non fare:
- Non scrivere su file. Output fenced YAML.
- Non inventare step types fuori da `mqtt_publish|wait|set_system_state|trigger_scenario`.
