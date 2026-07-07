# Task 3 Report: Bounded Telemetry Store

## Scope

Implemented the bounded telemetry store required by Task 3 in:

- `src/backend/telemetry_store.ts`
- `tests/backend/telemetry_store_test.ts`

I did not modify any unrelated source files.

## Red / Green

Red:

- Added the focused telemetry store test file first.
- Ran `deno test tests/backend/telemetry_store_test.ts`.
- Confirmed the expected missing-module failure for `src/backend/telemetry_store.ts`.

Green:

- Implemented `TelemetryStore`, `TelemetryStoreSnapshot`, `TelemetryStoreOptions`,
  `IngestExportMetadata`, `SeriesSummary`, and `createTelemetryStore`.
- Re-ran `deno test tests/backend/telemetry_store_test.ts`.
- Confirmed all 3 tests passed.

## Behavior

The store now:

- retains recent metric points up to `maxPoints`
- counts dropped points when older points are evicted
- tracks export metadata including observed time, bytes, point count, and warning count
- keeps recent export metadata and warnings bounded by `maxExports`
- returns deterministic series summaries
- supports querying points for a series within an observed-at window

## Verification

Focused test command:

```powershell
deno test tests/backend/telemetry_store_test.ts
```

Result:

- 3 tests passed
- 0 failed

## Commit

- `b3e816d` `feat: add bounded telemetry store`

## Self-review

- The implementation stays within the task scope and only touches the two owned files.
- The store API matches the task brief and the tests cover the requested retention and series-query behavior.
- The worktree still has an unrelated pre-existing modification in `.superpowers/sdd/task-2-report.md`; I left it untouched.

## Review Fixes

I addressed the follow-up review findings by tightening the telemetry store boundary:

- `seriesList()` now sorts retained series by `metricName` and then `seriesKey` so ties are deterministic.
- `recordExport()` clones incoming `MetricPoint` and `MetricWarning` objects before storing them.
- `snapshot()` and `pointsForSeries()` return cloned objects so callers cannot mutate stored history through readback results.

## Review Verification

Focused verification after the fix:

```powershell
deno test tests/backend/telemetry_store_test.ts
deno fmt --check src/backend/telemetry_store.ts tests/backend/telemetry_store_test.ts
```

Result:

- 6 tests passed
- 0 failed
- formatting check passed

## Review Follow-up

I fixed the remaining review finding by removing the local `MetricPoint` and
`MetricWarning` definitions from `src/backend/telemetry_store.ts` and importing
the canonical types from `src/backend/metric_model.ts` instead.

I also updated `tests/backend/telemetry_store_test.ts` to import the type-only
aliases from `metric_model.ts`, since the store no longer re-exports those
shapes.

Verification for this follow-up:

- `deno test tests/backend/telemetry_store_test.ts`
- `deno fmt --check src/backend/telemetry_store.ts tests/backend/telemetry_store_test.ts`
