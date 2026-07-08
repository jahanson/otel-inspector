# Task 7 Report: Build Metrics Explorer And Filters

## What I implemented

- Added `MetricsExplorer` in `src/ui/dashboard/components/MetricsExplorer.tsx`.
- The explorer filters `projection.explorer.rows` by metric name, metric type, resource service, and serialized attributes.
- Wired the Metrics tab in `src/ui/dashboard/App.tsx` to render `MetricsExplorer` from `projection.explorer.rows`.
- Kept the Overview tab cards and charts intact, and preserved the existing fallback for unsupported tabs.
- Added responsive explorer/table styling in `src/ui/dashboard/styles.css` with visible input focus, tabular numerals, and mobile stacked rows.
- Regenerated the built dashboard assets in `src/ui/dist/` via `deno task ui:build`.

## Verification

- `deno test --allow-read=src/ui/dashboard,src/ui/dist tests/ui/dashboard_bundle_test.ts tests/ui/metrics_explorer_test.ts`
  - Passed: 8 tests.
- `deno task ui:build`
  - Passed.
- `deno task check`
  - Passed.
- `deno task ok`
  - Passed.
- `rg -n "vw|transition-all" src/ui/dashboard/styles.css`
  - Returned no matches.

## Files changed

- `src/ui/dashboard/App.tsx`
- `src/ui/dashboard/components/MetricsExplorer.tsx`
- `src/ui/dashboard/styles.css`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`
- `tests/ui/dashboard_bundle_test.ts`
- `tests/ui/metrics_explorer_test.ts`

## Commit created

- `feat: add metrics explorer`

## Self-review findings

- The explorer only renders rows from `projection.explorer.rows`; no synthetic metrics were introduced.
- Overview rendering stays on the existing path.
- The new filter is pure string matching over the declared row fields and does not reach into raw payloads or unsupported inspector features.

## DOX pass result

- Read the applicable DOX chain before editing: root `AGENTS.md`, `src/AGENTS.md`, `src/ui/AGENTS.md`, and `tests/AGENTS.md`.
- No DOX contract changes were needed, so no AGENTS files were updated.

## Issues or concerns

- None.

## Task 7 review fixes

### Review findings addressed

- Preserved native table semantics in `src/ui/dashboard/components/MetricsExplorer.tsx` by removing the mobile `display: block` table fallback and generated `data-label` cells.
- Kept the explorer table in a horizontally scrollable `.table-wrap` instead of turning the table into a stacked card layout on small screens.
- Strengthened the UI regression coverage with a direct metric-name filter assertion and source-level contract checks for the seven column headers and em dash placeholders.

### Files changed

- `src/ui/dashboard/components/MetricsExplorer.tsx`
- `src/ui/dashboard/styles.css`
- `tests/ui/metrics_explorer_test.ts`
- `tests/ui/dashboard_bundle_test.ts`
- `src/ui/dist/app.js`
- `src/ui/dist/styles.css`

### Tests and checks

- `deno test tests/ui/metrics_explorer_test.ts`
  - Passed: 2 tests, 0 failed.
- `deno task ui:build`
  - Passed.
- `deno task test:dashboard-bundle`
  - Passed: 8 tests, 0 failed.
- `deno task check`
  - Passed.
- `deno task ok`
  - Passed.
- `rg -n "vw|transition-all" src/ui/dashboard/styles.css`
  - Returned no matches.

### Commit created

- `fix: preserve explorer table semantics`

### DOX pass result

- Re-read the applicable DOX chain before editing: root `AGENTS.md`, `src/ui/AGENTS.md`, and `tests/AGENTS.md`.
- No DOX contract changes were needed, so no AGENTS files were updated.
