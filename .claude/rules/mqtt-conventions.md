# DomHouse MQTT Conventions

Fonte di verità per `@domhouse-mqtt-auditor` e `@domhouse-yaml-linter`. Applies to topic, payload, QoS, retained flag.

---

## M1 — Topic schema

### Device topics
```
home/{room}/{type}/{id}/state     # device → agent (telemetria)
home/{room}/{type}/{id}/set       # agent → device (comando)
home/{room}/{type}/{id}/config    # device → agent (auto-discovery, retained)
```

- `{room}` = lowercase, no spazi. Es: `living`, `bedroom`, `kitchen`.
- `{type}` = uno di `DeviceType` in `packages/agent-core/src/types.ts`: `light|switch|sensor|lock|climate|media|blind|camera|alarm|presence`.
- `{id}` = slug lowercase, no spazi. Es: `ceiling`, `lamp`, `main`.
- `deviceId` derivato = `{room}.{type}.{id}` — formato univoco per API e `DeviceRegistry`.

### Scenario trigger
```
domhouse/scenarios/{name}/trigger
```

### Riservati (futuri)
```
domhouse/system/*
domhouse/ha/*
```

**Regola.** Mai inventare prefissi nuovi senza aggiornare `MqttRouter` + questo file.

## M2 — Payload format

- Default JSON. Parsed da `parsePayload(raw)` in `MessageBrokerInterface.ts`.
- Fallback: numero (se `Number(str)` non è NaN), altrimenti string.
- Boolean → `{ "on": true }` non `"true"`.
- Sensor readings → oggetto con campi numerici: `{ "temperature": 22.5, "humidity": 45 }`.

**Red flag.** Payload binario non-JSON → wrappa in `{ "raw": "<base64>" }` o crea topic dedicato.

## M3 — QoS e retain

| Topic kind | QoS | Retain |
|---|---|---|
| `home/+/+/+/state` | 0 | false (stream telemetria) |
| `home/+/+/+/set` | 1 | false (comando) |
| `home/+/+/+/config` | 1 | **true** (auto-discovery) |
| `domhouse/scenarios/+/trigger` | 1 | false |

`MqttRouter.command()` usa QoS 1. `DeviceRegistry` auto-scopre via `config` retained.

## M4 — Auto-discovery

Un device nuovo si registra pubblicando su `home/{room}/{type}/{id}/config` (retained) con payload:
```json
{ "name": "Luce Soffitto Salotto", "capabilities": ["on_off","brightness"] }
```

`MqttRouter.handleDeviceConfig()` crea la `DeviceConfig` se `deviceId` non esiste in registry. Se esiste, il messaggio è ignorato (no override runtime).

**Regola.** Per aggiornare un device esistente → modifica `config/devices/*.yml` + restart, **non** ri-pubblica `config`.

## M5 — Subscription patterns

Pattern wildcard ammessi in `MqttRouter` + `RuleEngine`:
- `+` = un livello
- `#` = multi-livello (solo in coda)

**Regola.** Non usare `#` nei trigger delle rules — troppo rumore. Usa `+` con prefisso specifico.

## M6 — MessageBrokerInterface

Tutti i consumer MQTT importano `MessageBrokerInterface` da `packages/agent-core/src/mqtt/MessageBrokerInterface.ts`. Mai `import 'mqtt'`.

I metodi disponibili:
- `publish(topic, payload, options?)` — serializza via `serializePayload`.
- `subscribe(topicPattern, handler)` — handler riceve `ParsedMqttMessage` con `topicParts` già splittato.
- `unsubscribe(topicPattern)`
- `isConnected()`

**Red flag.** Subscribe/publish che bypassa l'interfaccia → violazione A3 (architecture) + rompe testabilità.

## M7 — Rate limits e back-pressure

Nessun bounded queue interno (a differenza di ELIS). Se un device pubblica ad alta frequenza:
- StateManager aggiorna Redis su ogni transizione (potenziale hot path).
- InfluxDB riceve ogni valore numerico/boolean in `sendDeviceEvent`.

**Regola.** Per sensori ad alta frequenza (>10 Hz) valutare throttling a monte (lato ESPHome) o aggregazione in `MqttRouter` prima di feedare `StateManager`.

## M8 — Testing MQTT

Per sniffare topic in dev:
```bash
mosquitto_sub -h localhost -t 'home/#' -v
mosquitto_sub -h localhost -t 'domhouse/#' -v
```

Per simulare un device:
```bash
mosquitto_pub -h localhost -t 'home/living/light/ceiling/state' -m '{"on":true,"brightness":80}'
```

---

## Audit output (per `@domhouse-mqtt-auditor`)

```
[severity] <file>:<line> — M<n>
Issue: <cosa>
Fix: <come>
```

Severità:
- **BLOCKER** — M6 (`mqtt` importato fuori da `MqttClient`), M1 (topic schema violato nel routing).
- **MAJOR** — M3 (QoS/retain sbagliati), M4 (override config runtime), M5 (`#` in rule trigger).
- **MINOR** — M2 (payload non-canonico), M7 (frequenza non valutata).
