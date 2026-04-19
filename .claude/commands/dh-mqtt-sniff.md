---
description: Subscribe to an MQTT topic pattern on the host broker and print messages.
argument-hint: [topic-pattern]
allowed-tools: Bash
---

Subscribe with `mosquitto_sub` to the host broker (localhost:1883) and print messages with topic + payload.

Arguments: `$ARGUMENTS` — topic pattern. Default: `home/#`.

Steps:
1. Default pattern if empty: `home/#`.
2. Run:
   ```bash
   mosquitto_sub -h localhost -p 1883 -t "$ARGUMENTS" -v
   ```
3. Run in background (`run_in_background: true`) — user interrupts when done.

Common patterns:
- `home/#` — all device traffic.
- `home/living/#` — everything in the living room.
- `home/+/+/+/state` — all device state (no commands, no config).
- `home/+/+/+/set` — all commands published by agent-core.
- `domhouse/#` — system/scenario topics.

Hint: se mosquitto_sub non è nel PATH → `choco install mosquitto` (Windows) o check `C:\Program Files\mosquitto\`.
