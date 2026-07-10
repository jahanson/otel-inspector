# Task 4 Report

## What you implemented

- Added a local React dashboard entry at `src/ui/dashboard/main.tsx` with a minimal `App.tsx`, browser-only projection types, and local shadcn-style primitives for buttons, cards, badges, tabs, and chart containers.
- Added Hallmark-friendly base CSS in `src/ui/dashboard/styles.css` and wired chart color tokens through CSS variables.
- Added `deno task ui:build`, a Windows-friendly Deno-owned `tools/build_ui.ts`, and the React/npm compiler configuration needed for `deno check`.
- Generated `src/ui/dist/app.js` and `src/ui/dist/styles.css` from the new build task.
- Updated `src/backend/app_server.ts` to serve `/assets/app.js` and `/assets/styles.css` from `src/ui/dist`, returning `503` with a build hint when assets are unavailable.
- Updated backend dashboard asset coverage in `tests/backend/app_server_dashboard_test.ts`.

## TDD/build RED evidence and GREEN evidence

### RED

1. Added `ui:build` before any dashboard entrypoint existed.
2. Ran `deno task ui:build`.
3. Confirmed the task failed before implementation work. Initial failures were permission/bootstrap related, then the build path was corrected so the missing entrypoint/build lane was exercised before UI files were created.
4. Added a backend regression in `tests/backend/app_server_dashboard_test.ts` that expected built asset responses instead of the placeholder asset strings.
5. Ran `deno test tests/backend/app_server_dashboard_test.ts` and confirmed it failed against the placeholder script response (`console.info("OTEL Inspector dashboard asset placeholder");` did not include `createRoot(`).

### GREEN

1. Implemented the React dashboard shell, build script, generated assets, and disk-backed asset serving.
2. Ran `deno task ui:build` successfully and emitted:
   - `src/ui/dist/app.js`
   - `src/ui/dist/styles.css`
3. Re-ran `deno test tests/backend/app_server_dashboard_test.ts` and got `4 passed | 0 failed`.
4. Re-ran the full gate with `deno task ok` and got `66 passed | 0 failed`.

## Verification commands and results

- `deno task ui:build` — passed
- `deno test tests/backend/app_server_dashboard_test.ts` — passed
- `deno task check` — passed
- `deno task ok` — passed

## Files changed

- `deno.json`
- `deno.lock`
- `src/backend/app_server.ts`
- `src/backend/AGENTS.md`
- `src/ui/AGENTS.md`
- `src/ui/dashboard/main.tsx`
- `src/ui/dashboard/App.tsx`
- `src/ui/dashboard/types.ts`
- `src/ui/dashboard/components/ui/button.tsx`
- `src/ui/dashboard/components/ui/card.tsx`
- `src/ui/dashboard/components/ui/badge.tsx`
- `src/ui/dashboard/components/ui/tabs.tsx`
- `src/ui/dashboard/components/ui/chart.tsx`
- `src/ui/dashboard/styles.css`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`
- `tests/backend/app_server_dashboard_test.ts`
- `tools/AGENTS.md`
- `tools/build_ui.ts`

## Commit created

- Created with commit message `feat: add React dashboard asset shell`

## Self-review findings

- Kept the browser projection contract UI-local; no backend type imports cross the boundary.
- Used a Deno-owned `tools/build_ui.ts` instead of the plan's PowerShell `Copy-Item` so `deno task ui:build` stays shell-agnostic on Windows and avoids brittle inline shell copy behavior.
- Left richer charts, payload inspection, session history, traces/logs, raw payload handling, and percentile follow-up out of scope.
- The backend dashboard asset test stubs `Deno.readFileSync` so the user's exact `deno test tests/backend/app_server_dashboard_test.ts` command works without adding CLI read flags; the actual emitted asset files are still verified by `deno task ui:build`.

## DOX pass result

- Updated `src/ui/AGENTS.md` for the new `dashboard/` and `dist/` ownership plus `ui:build` verification.
- Updated `src/backend/AGENTS.md` to reflect built asset serving and the `503` missing-build contract.
- Updated `tools/AGENTS.md` to document `tools/build_ui.ts` and the `ui:build` workflow.
- Root `AGENTS.md`, `src/AGENTS.md`, and `tests/AGENTS.md` were re-checked and left unchanged because their existing repo-wide rules still matched the new behavior.

## Issues or concerns

- No open implementation concerns after the required verification passed.

## Review Fixes: narrow dashboard bundle permissions and stylesheet link regression

### Re-review findings addressed

- Restored `deno task test` to a narrow suite-level read scope by keeping it on `fixtures` only and excluding `tests/ui/dashboard_bundle_test.ts`.
- Added a focused `deno task test:dashboard-bundle` so the bundle/source regression can read `src/ui/dashboard` and `src/ui/dist` without broadening the whole suite.
- Added a shell regression in `tests/backend/app_server_dashboard_test.ts` that asserts the root dashboard HTML keeps the `/assets/styles.css` link alongside `/assets/app.js`.
- Updated `tests/AGENTS.md` so the documented test contract matches the new split-task permission model.

### Files changed

- `deno.json`
- `tests/AGENTS.md`
- `tests/backend/app_server_dashboard_test.ts`

### Tests/checks run and exact pass/fail summary

- `deno task test` - passed; `67 passed | 0 failed`
- `deno task test:dashboard-bundle` - passed; `3 passed | 0 failed`
- `deno test tests/backend/app_server_dashboard_test.ts` - passed; `5 passed | 0 failed`
- `deno task check` - passed
- `deno task ok` - passed; `67 passed | 0 failed` from the suite run, then the focused dashboard bundle task passed with `3 passed | 0 failed`

### Commit created

- `fix: narrow dashboard bundle permissions`

### DOX pass result

- Re-read the root DOX plus `tests/AGENTS.md` before editing.
- Updated `tests/AGENTS.md` because the test-task permission contract changed and the docs needed to stop claiming broad suite reads.
- No source or UI DOX files needed updates for this fix.

## Review Fixes: dashboard asset build follow-up

### Review findings addressed

- Replaced the brittle `tools/build_ui.ts` binary path splice with the supported `npm:esbuild@0.25.8` module API while keeping `deno task ui:build` Deno-owned.
- Added focused missing-asset coverage in `tests/backend/app_server_dashboard_test.ts` that stubs `Deno.readFileSync` to throw and asserts `503` plus `Asset not built. Run deno task ui:build.` for both dashboard asset routes.
- Promoted chart/warning effect colors in `src/ui/dashboard/styles.css` to named CSS custom properties so component rules consume tokens instead of literal gradient and RGBA values.
- Regenerated `src/ui/dist/app.js` and `src/ui/dist/styles.css` via `deno task ui:build`.

### Files changed

- `tools/build_ui.ts`
- `tests/backend/app_server_dashboard_test.ts`
- `src/ui/dashboard/styles.css`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`

### Tests run and exact pass/fail summary

- `deno task ui:build` — passed; emitted `src\\ui\\dist\\app.js 973.3kb`
- `deno test tests/backend/app_server_dashboard_test.ts` — passed; `5 passed | 0 failed`
- `deno task check` — passed; checked `src/main.ts`, `src/backend/receiver_worker.ts`, `src/ui/dashboard/main.tsx`, 11 test files, and 4 tool files
- `deno task ok` — passed; `67 passed | 0 failed`, plus `ui:build`, `fmt:check`, `lint`, and `check` all passed cleanly

### Commit created

- `fix: harden dashboard asset build`

### DOX pass result

- Re-checked the root, `src`, `src/backend`, `src/ui`, `tools`, and `tests` DOX chain before closeout.
- Left DOX files unchanged because these review fixes did not alter ownership, contracts, workflows, or verification requirements already documented there.

## Review Fixes: chart token normalization and viewport font sizing

### Re-review findings addressed

- Normalized chart styling tokens in `src/ui/dashboard/components/ui/chart.tsx` so the container emits `--chart-accent` alongside per-series CSS variables, and `src/ui/dashboard/styles.css` now consumes `--chart-accent` for the chart stripe.
- Replaced viewport-unit font sizing in `src/ui/dashboard/styles.css` with breakpoint-driven font-size tokens so text no longer scales directly with viewport width.
- Regenerated `src/ui/dist/app.js` and `src/ui/dist/styles.css` with `deno task ui:build`.

### Files changed

- `src/ui/dashboard/components/ui/chart.tsx`
- `src/ui/dashboard/styles.css`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`

### Tests/checks run and exact pass/fail summary

- `deno task ui:build` - passed; emitted `src\\ui\\dist\\app.js 973.5kb`
- `deno task check` - passed; checked `src/main.ts`, `src/backend/receiver_worker.ts`, `src/ui/dashboard/main.tsx`, 11 test files, and 4 tool files
- `deno task ok` - passed; `67 passed | 0 failed`
- `rg -n "vw" src/ui/dashboard/styles.css` - no matches, which confirms the viewport unit was removed from the dashboard stylesheet

### Commit created

- `fix: honor dashboard chart color tokens`

### DOX pass result

- Re-checked the root DOX and `src/ui/AGENTS.md` before editing.
- No AGENTS.md updates were needed because this fix changed implementation details only; the existing UI contract still matches the current behavior.

## Review Fixes: linked stylesheet handoff and local chart transparency

### Re-review findings addressed

- Removed the CSS text import and `<style>` injection from `src/ui/dashboard/main.tsx` so the dashboard now relies on the linked `/assets/styles.css` handoff from `src/ui/app_shell.ts`.
- Kept `ChartContainer` responsible for the local series accent token in `src/ui/dashboard/components/ui/chart.tsx`, while `src/ui/dashboard/styles.css` now derives `--chart-accent-transparent` from `--chart-accent` inside `.chart-container` instead of using a global latency-pinned token.
- Regenerated `src/ui/dist/app.js` and `src/ui/dist/styles.css` with `deno task ui:build`.

### Files changed

- `deno.json`
- `src/ui/AGENTS.md`
- `src/ui/dashboard/main.tsx`
- `src/ui/dashboard/components/ui/chart.tsx`
- `src/ui/dashboard/styles.css`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`
- `tests/AGENTS.md`
- `tests/ui/dashboard_bundle_test.ts`

### Tests/checks run and exact pass/fail summary

- `deno test --allow-read=fixtures,src/ui/dashboard,src/ui/dist tests/ui/dashboard_bundle_test.ts` - passed; `3 passed | 0 failed`
- `deno task ui:build` - passed; emitted `src\\ui\\dist\\app.js 966.7kb`
- `deno task check` - passed; checked `src/main.ts`, `src/backend/receiver_worker.ts`, `src/ui/dashboard/main.tsx`, 12 test files, and 4 tool files
- `rg -n "vw" src/ui/dashboard/styles.css` - no matches
- `rg -n -F -e 'style.textContent =' -e 'document.head.append(style)' -e 'styles_default =' -e 'import styles from \"./styles.css\"' src/ui/dist/app.js` - no matches
- `deno task ok` - passed; `70 passed | 0 failed`

### Commit created

- `fix: use linked dashboard stylesheet asset`

### DOX pass result

- Re-checked the root, `src`, `src/ui`, and `tests` DOX chain before closeout.
- Updated `tests/AGENTS.md` because the new UI regression test reads the dashboard source and generated bundle directly, which changes the test-task permission contract.
