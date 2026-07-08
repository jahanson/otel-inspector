# Task 6 Report: Build Live Charts With Recharts

## What you implemented

- Added `LiveCharts` at `src/ui/dashboard/charts/LiveCharts.tsx` to render the four approved overview chart series from `DashboardProjection["charts"]`: latency, throughput, error rate, and ingest.
- Wired `LiveCharts` into the overview tab in `src/ui/dashboard/App.tsx` immediately after `OverviewCards`.
- Added token-based chart layout and chart-card styling in `src/ui/dashboard/styles.css` with stable dimensions, responsive two-column-to-one-column behavior, tabular numerals for window metadata, and no hover-only controls.
- Added the `recharts` import map entry in `deno.json` and regenerated `deno.lock`.
- Rebuilt `src/ui/dist/app.js` and `src/ui/dist/styles.css` via `deno task ui:build`.
- Added focused dashboard bundle regressions in `tests/ui/dashboard_bundle_test.ts` for the new `LiveCharts` contract and overview wiring.

## Dependency/import-map evidence

### RED

Command:

```powershell
deno task ui:build
```

Result before the import map update:

```text
ERROR: Could not resolve "recharts"
src/ui/dashboard/charts/LiveCharts.tsx:12:7
```

### GREEN

Command:

```powershell
deno test --allow-read=src/ui/dashboard,src/ui/dist tests/ui/dashboard_bundle_test.ts
deno task ui:build
```

Result after adding `"recharts": "npm:recharts@3.0.0"` to `deno.json`:

- `dashboard_bundle_test.ts`: 5 passed, 0 failed
- `deno task ui:build`: passed and regenerated `src/ui/dist/app.js`

## Verification commands and results

- `deno task ui:build` — passed
- `deno task check` — passed
- `deno task ok` — passed
- `rg -n "vw|transition-all" src/ui/dashboard/styles.css` — no matches

## Files changed

- `deno.json`
- `deno.lock`
- `src/ui/dashboard/App.tsx`
- `src/ui/dashboard/charts/LiveCharts.tsx`
- `src/ui/dashboard/styles.css`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`
- `tests/ui/dashboard_bundle_test.ts`
- `.superpowers/sdd/task-6-report.md`

## Commit created

- `feat: add dashboard live charts`

## Self-review findings

- Rendered only `projection.charts` series; no invented metrics or extra data sources were added.
- Kept chart color config separate from series data through `ChartContainer` config and CSS variables.
- Preserved the existing overview card surface and limited new behavior to Task 6 scope.
- Added a narrow regression test for the new component contract and App wiring.

## DOX pass result

- Re-read the applicable DOX chain: root `AGENTS.md`, `src/AGENTS.md`, `src/ui/AGENTS.md`, and `tests/AGENTS.md`.
- No AGENTS updates were needed because the task changed implementation and generated assets, not durable ownership, contracts, workflow rules, or verification policy.

## Any issues or concerns

- No blocking issues.

## Review findings addressed

- Disabled Recharts animations on the overview `Line` and `Area` series with `isAnimationActive={false}` so the live charts stay reduced-motion-safe during refreshes.
- Strengthened the overview ordering regression so it checks that `LiveCharts` appears after `OverviewCards` within the `overview` branch of `src/ui/dashboard/App.tsx`.

## Files changed

- `src/ui/dashboard/charts/LiveCharts.tsx`
- `tests/ui/dashboard_bundle_test.ts`
- `src/ui/dist/app.js`

## Tests and checks

- `deno task ui:build` — pass
- `deno task test:dashboard-bundle` — pass, 5 tests passed / 0 failed
- `deno task check` — pass
- `deno task ok` — pass
- `rg -n "vw|transition-all" src/ui/dashboard/styles.css` — no matches, exit code 1 as expected

## Commit created

- `8b17dac` `fix: disable live chart animations`

## DOX pass result

- Re-read the applicable DOX chain for the touched paths: root `AGENTS.md`, `src/ui/AGENTS.md`, and `tests/AGENTS.md`.
- No AGENTS updates were needed because this task changed implementation, generated assets, and test coverage only.
