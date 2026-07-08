# Task 2 Report: Add Dashboard Projection Contracts

## Status

DONE

## Scope Completed

- Created `src/backend/dashboard_projection.ts` with the Task 2 projection
  contract types and `buildDashboardProjection(...)`.
- Created `tests/backend/dashboard_projection_test.ts` from the brief and
  completed the required red-green cycle.
- Updated `docs/plans/04-implementation/04-api-and-event-contracts.md` with the
  concise `DashboardProjection` contract note from the brief.

## TDD Record

1. Added `tests/backend/dashboard_projection_test.ts`.
2. Ran `deno test tests/backend/dashboard_projection_test.ts`.
3. Confirmed RED: the test failed because
   `src/backend/dashboard_projection.ts` did not exist.
4. Added `src/backend/dashboard_projection.ts`.
5. Re-ran `deno test tests/backend/dashboard_projection_test.ts`.
6. Fixed explorer-row grouping so the focused contract test passed as expected.
7. Re-ran `deno test tests/backend/dashboard_projection_test.ts` and confirmed
   `ok | 2 passed | 0 failed`.

## Verification

- `deno task check` passed.
- `deno task ok` initially failed on `deno fmt --check` for the two new files.
- Ran
  `deno fmt src/backend/dashboard_projection.ts tests/backend/dashboard_projection_test.ts docs/plans/04-implementation/04-api-and-event-contracts.md`.
- Re-ran `deno task ok` and it passed with `58 passed | 0 failed`.
- `git diff --cached --check` passed with no output.

## Commit Created

- `7cd315f` `feat: add dashboard projection contracts`

## Self-Review

- Reviewed the staged diff and final commit summary.
- Confirmed the task stayed within the three task-owned files plus the required
  report artifact.
- Confirmed the worktree was clean after commit.

## DOX Pass

- Re-read the applicable DOX chain for `src/`, `src/backend/`, `tests/`, and
  `docs/`.
- Left AGENTS files unchanged because this task added a new backend projection
  module and tests without changing ownership boundaries, durable workflow
  rules, or Child DOX indexes.

## Concerns

- None.

## Task 2 Review Follow-up

### Review Findings Addressed

- Tightened the dashboard window filter so points must be at or before the
  projection timestamp and inside the selected lookback window.
- Filtered ingest chart exports through the same time window before mapping
  them to chart points.
- Keyed explorer rows directly by `point.seriesKey` so distinct series stay
  distinct even when their metric metadata matches.
- Added regression coverage for the window boundary, future-dated data, and
  multiple series keys that share metric metadata.

### Files Changed

- `src/backend/dashboard_projection.ts`
- `tests/backend/dashboard_projection_test.ts`
- `.superpowers/sdd/task-2-report.md`

### Tests Run

- `deno test tests/backend/dashboard_projection_test.ts` - pass, 4 passed, 0
  failed.
- `deno task check` - pass.
- `deno task ok` - initial run failed on `deno fmt --check` for the updated test
  file; after `deno fmt src/backend/dashboard_projection.ts
  tests/backend/dashboard_projection_test.ts`, reran cleanly with 60 passed, 0
  failed.

### Commit Created

- `fix: tighten dashboard projection windowing`

### DOX Pass

- Re-read the applicable DOX chain for the repository root, `src/`,
  `src/backend/`, and `tests/` before editing.
- No AGENTS files needed updates because the change was scoped to behavior and
  tests inside the existing backend/test ownership boundaries.
