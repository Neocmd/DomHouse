---
description: Run DomHouse UI tests (Vitest) with an optional filter pattern.
argument-hint: [test-name-or-path]
allowed-tools: Bash
---

Run Vitest in `packages/ui`. Usage:

- `/dh-test` — run all tests.
- `/dh-test RealtimeContext` — filter by test name (uses `-t`).
- `/dh-test src/context/__tests__/RealtimeContext.test.tsx` — run a specific file.

Arguments: `$ARGUMENTS`

Steps:
1. Detect if `$ARGUMENTS` looks like a path (contains `/` or ends with `.tsx`/`.ts`): pass as positional to `vitest run`.
2. Otherwise pass as `-t "<pattern>"` for name filter.
3. If empty: run `npm run test` (all).
4. Always run from `packages/ui`:
   ```bash
   cd packages/ui && npx vitest run [args]
   ```
5. Report: pass/fail count, failing test names.

Note: `packages/agent-core` has no test runner wired — running tests there is a no-op.
