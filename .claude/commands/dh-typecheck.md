---
description: Run TypeScript typecheck on both packages (agent-core + ui).
allowed-tools: Bash
---

Run `tsc --noEmit` on both workspaces in parallel.

Steps:
1. Kick off both:
   ```bash
   (cd packages/agent-core && npm run typecheck) &
   (cd packages/ui && npm run typecheck) &
   wait
   ```
2. Collect stdout/stderr from each.
3. Report per-package:
   - `agent-core: OK` or `agent-core: N errors` + first 5 error lines.
   - `ui: OK` or `ui: N errors` + first 5 error lines.
4. Overall exit status: fail if either failed.

Hint: if the user just edited one package, they can pass its name as an argument (optional future extension). Current impl always checks both.
