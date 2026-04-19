---
description: Tail Docker Compose logs for the DomHouse stack (or a single service).
argument-hint: [service]
allowed-tools: Bash
---

Tail `docker compose logs -f` for the whole stack or a single service.

Arguments: `$ARGUMENTS` — one of `agent-core`, `ui`, `redis`, `influxdb`, or empty for all.

Steps:
1. If `$ARGUMENTS` is empty:
   ```bash
   docker compose logs -f --tail=100
   ```
2. Else:
   ```bash
   docker compose logs -f --tail=100 "$ARGUMENTS"
   ```
3. Run in background (`run_in_background: true`) so the session stays responsive; user can interrupt.

Hint: Mosquitto is not in Compose (runs as Windows service on host). For broker logs, check Windows service `mosquitto` via Event Viewer or `net session`.
