---
description: Validate DomHouse YAML config (devices, rules, scenarios) against schemas. Delegates to @domhouse-yaml-linter.
argument-hint: [devices|rules|scenarios|all]
allowed-tools: Read, Grep, Glob, Bash, Agent
---

Validate YAML in `config/`. Argument limits scope: `devices`, `rules`, `scenarios`, or `all` (default).

Arguments: `$ARGUMENTS`

Steps:
1. Invoke `@domhouse-yaml-linter` agent with the scope restriction.
   - If scope is `devices` only: tell the linter to focus on `config/devices/**`.
   - If scope is `rules`: focus on `config/rules/**` but still cross-reference `devices/` and `scenarios/`.
   - Similarly for `scenarios`.
   - Default (`all` or empty): full sweep.
2. Print the linter's structured output verbatim.
3. If there are BLOCKER findings: exit with non-zero in the rendered summary ("Fix BLOCKERs before restarting agent-core").

Non fare:
- Non editare file (il linter non edita; neanche tu qui).
- Non validare broker runtime — solo schema statico.
