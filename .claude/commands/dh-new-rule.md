---
description: Scaffold a new automation rule for config/rules/*.yml via the domhouse-rule-author agent.
argument-hint: <brief description of the rule>
allowed-tools: Read, Grep, Glob, Agent
---

Delegate to `@domhouse-rule-author` to author a new rule.

Arguments: `$ARGUMENTS` — free-form natural language description (italiano preferito).

Steps:
1. Invoke `@domhouse-rule-author` with the description.
2. The agent reads devices + scenarios for cross-reference and produces:
   - A fenced YAML fragment ready to paste in `config/rules/<file>.yml`.
   - Checklist post-paste (validate, restart agent-core).
3. Print the agent output verbatim.

Esempi di uso:
- `/dh-new-rule quando rileva movimento in cucina la sera, accendi luce soffitto al 70%`
- `/dh-new-rule cron 23:30 ogni giorno → scenario goodnight`
- `/dh-new-rule se temperatura sensore bedroom > 27 per 10 min e sistema è home → log warn`

Non fare:
- Non scrivere su file (il comando e l'agent producono solo YAML da incollare).
- Non fare guess su deviceId: se l'utente cita un device non esistente, il rule-author lo segnala.
