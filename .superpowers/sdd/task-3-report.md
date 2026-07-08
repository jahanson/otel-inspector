# Task 3 Report: Serve Dashboard Projection Endpoints And Assets

## What you implemented

- Added `GET /api/dashboard?windowMs=60000` to serve dashboard projections from
  `buildDashboardProjection(state.store.snapshot(), currentSummary(state), { windowMs })`.
- Added `POST /api/dashboard/clear` to clear retained telemetry and receiver
  failure counters through the explicit `clearReceiverState()` boundary.
- Added placeholder asset routes:
  - `GET /assets/app.js`
  - `GET /assets/styles.css`
- Added `src/ui/app_shell.ts` with `buildAppShell(initialProjection)` that:
  - mounts `#root`
  - links `/assets/styles.css`
  - bootstraps `globalThis.__OTEL_INITIAL_PROJECTION__`
  - loads `/assets/app.js`
- Added focused dashboard route coverage in
  `tests/backend/app_server_dashboard_test.ts`.
- Updated `tests/ui/app_html_test.ts` to validate the new app shell contract and
  inline JSON escaping.
- Updated DOX contracts in:
  - `src/backend/AGENTS.md`
  - `src/ui/AGENTS.md`

## TDD evidence

### RED

Command:

```powershell
deno test tests\backend\app_server_dashboard_test.ts
```

Output:

```text
running 3 tests from ./tests/backend/app_server_dashboard_test.ts
dashboard app server serves dashboard projection endpoint ... FAILED
dashboard app server serves app shell and static asset placeholders ... FAILED
dashboard clear endpoint resets store through explicit boundary ... FAILED

ERRORS

dashboard app server serves dashboard projection endpoint
error: SyntaxError: Unexpected token 'N', "Not found" is not valid JSON

dashboard app server serves app shell and static asset placeholders
error: AssertionError: Expected actual HTML to contain: "id=\"root\"".

dashboard clear endpoint resets store through explicit boundary
error: AssertionError: Values are not equal.
-   405
+   200
```

### GREEN

Command:

```powershell
deno test tests\backend\app_server_dashboard_test.ts tests\backend\app_server_test.ts tests\ui\app_html_test.ts
```

Output:

```text
ok | 6 passed | 0 failed
```

## Verification commands and results

1. Focused route and shell tests

```powershell
deno test tests\backend\app_server_dashboard_test.ts tests\backend\app_server_test.ts tests\ui\app_html_test.ts
```

Result:

```text
ok | 6 passed | 0 failed
```

2. Typecheck gate

```powershell
deno task check
```

Result:

```text
Task check deno check src/main.ts src/backend/receiver_worker.ts tests/**/*.ts tools/**/*.ts
Check src/main.ts
Check src/backend/receiver_worker.ts
Check tests/backend/app_server_dashboard_test.ts
Check tests/backend/app_server_test.ts
Check tests/backend/dashboard_projection_test.ts
Check tests/backend/live_bus_cadence_test.ts
Check tests/backend/live_bus_substrate_test.ts
Check tests/backend/metric_derivations_test.ts
Check tests/backend/metric_model_test.ts
Check tests/backend/normalize_metrics_test.ts
Check tests/backend/receiver_contract_test.ts
Check tests/backend/telemetry_store_test.ts
Check tests/ui/app_html_test.ts
Check tools/generate_proto.ts
Check tools/send_metrics_fixture.ts
Check tools/write_fixtures.ts
```

3. Full requested quality gate

```powershell
deno task ok
```

Result:

```text
Task ok deno task fmt:check && deno task lint && deno task check && deno task test
Task fmt:check deno fmt --check
Checked 40 files
Task lint deno lint
Checked 28 files
Task check deno check src/main.ts src/backend/receiver_worker.ts tests/**/*.ts tools/**/*.ts
Task test deno test --allow-read=fixtures --allow-net=127.0.0.1:4318 tests
ok | 65 passed | 0 failed
```

4. Diff hygiene

```powershell
git diff --check
```

Result:

```text
[no output]
```

## Files changed

- `.superpowers/sdd/task-3-report.md`
- `src/backend/AGENTS.md`
- `src/backend/app_server.ts`
- `src/backend/live_bus.ts`
- `src/backend/receiver.ts`
- `src/ui/AGENTS.md`
- `src/ui/app_shell.ts`
- `tests/backend/app_server_dashboard_test.ts`
- `tests/ui/app_html_test.ts`

## Commit created

- Created with the requested commit message: `feat: serve dashboard projection endpoints`

## Self-review findings

- `handleAppRequest()` keeps `buildDashboardProjection()` as the only server
  projection boundary and does not leak OTLP decode details into the UI shell.
- `clearReceiverState()` resets store, warning, start time, and failure counters
  without touching receiver server lifecycle.
- The shell is intentionally placeholder-only: `#root`, escaped inline bootstrap,
  and asset handoff for later React/shadcn tasks.
- No payload inspector tree, raw payload persistence, proxy-forwarding, traces,
  logs, or session history work was added.

## DOX pass result

- Read and followed:
  - `AGENTS.md`
  - `src/AGENTS.md`
  - `src/backend/AGENTS.md`
  - `src/ui/AGENTS.md`
  - `tests/AGENTS.md`
- Updated nearest owning docs where the contracts changed:
  - `src/backend/AGENTS.md`
  - `src/ui/AGENTS.md`
- Root and test DOX docs were left unchanged because the child index and
  test-scope rules still accurately described the affected paths.

## Any issues or concerns

- No functional concerns after `deno task ok`.
- I initially edited `src/ui/AGENTS.md` in the main checkout instead of the
  linked worktree, then restored that repo copy and applied the intended change
  in the worktree before staging. No unintended root-repo changes remain from
  this task.

## Review follow-up

- Review findings addressed:
  - strengthened `POST /api/dashboard/clear` coverage with seeded telemetry,
    a receiver failure, and post-clear emptiness checks for summary and
    projection warnings
  - added method guards for `GET /api/dashboard/clear` and
    `POST /api/dashboard`
  - asserted `cache-control: no-store` on successful `/api/dashboard/clear`,
    `/assets/app.js`, and `/assets/styles.css` responses
  - updated backend DOX verification to name
    `tests/backend/app_server_dashboard_test.ts`
- Files changed:
  - `.superpowers/sdd/task-3-report.md`
  - `src/backend/AGENTS.md`
  - `tests/backend/app_server_dashboard_test.ts`
- Tests run:
  - `deno test tests/backend/app_server_dashboard_test.ts tests/backend/app_server_test.ts tests/ui/app_html_test.ts` -> `ok | 7 passed | 0 failed`
  - `deno task check` -> passed
  - `deno task ok` -> passed, ending with `ok | 66 passed | 0 failed`
- Commit created: yes
- DOX pass result: read the root, source, backend, and test AGENTS chain for the touched paths; updated the backend Verification section to reflect the dashboard app-server contract test; no other DOX files required edits.
