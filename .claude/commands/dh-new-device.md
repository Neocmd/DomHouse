---
description: Scaffold a new device entry for config/devices/*.yml, with topic schema + capabilities. Outputs YAML for paste; does not write files.
argument-hint: <room> <type> <id> [capabilities,...]
allowed-tools: Read, Grep, Glob
---

Produce a YAML entry for a new device. Matches schema Y1 in `.claude/rules/yaml-schemas.md`.

Arguments: `$ARGUMENTS` → `room type id [capabilities]`.

Examples:
- `/dh-new-device kitchen light main on_off,brightness`
- `/dh-new-device bedroom sensor temp temperature,humidity`

Steps:
1. Parse `$ARGUMENTS`: `room`, `type`, `id_segment`, optional comma-separated capabilities.
2. Validate:
   - `type` ∈ `light|switch|sensor|lock|climate|media|blind|camera|alarm|presence`.
   - `room`, `id_segment`: lowercase slug.
   - Check `config/devices/*.yml`: `deviceId = ${room}.${type}.${id_segment}` non duplicato.
3. Compose:
   ```yaml
   - id: <room>.<type>.<id>
     name: <Tipo Italianizzato> <Room capitalizzato>
     type: <type>
     room: <room>
     topic:
       state: home/<room>/<type>/<id>/state
       set:   home/<room>/<type>/<id>/set
       config: home/<room>/<type>/<id>/config
     capabilities: [<caps>]
   ```
4. Suggerisci il file target in `config/devices/` (uno per stanza: `<room>.yml`). Se non esiste, proporne la creazione.
5. Checklist post-paste:
   - [ ] `/dh-yaml-validate devices`
   - [ ] Restart agent-core: `docker compose restart agent-core` o `npm run dev`.
   - [ ] Verifica UI: `http://localhost:4000/rooms/<room>`.
   - [ ] (Opzionale) aggiungi template ESPHome in `infra/esphome/`.

Non fare:
- Non scrivere su file. Output fenced YAML + path suggerito.
- Non inventare capabilities fuori dalle convenzioni usate in `config/devices/` (grep per riferimento).
