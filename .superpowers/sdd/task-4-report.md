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
