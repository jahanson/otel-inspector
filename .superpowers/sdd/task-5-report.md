# Task 5 Report: Wire Store And Normalization Into Live Bus

## Scope

- Created `tests/backend/live_bus_substrate_test.ts`
- Modified `src/backend/live_bus.ts`

I did not modify `src/backend/receiver.ts` in this task, per the brief. I also left the pre-existing change in `.superpowers/sdd/task-2-report.md` untouched.

## TDD Evidence

### RED

Command:

```powershell
deno test tests/backend/live_bus_substrate_test.ts
```

Result:

- Failed with `TS2345` in `tests/backend/live_bus_substrate_test.ts`
- Failure reason matched the brief: `recordReceiverExport()` still accepted only a numeric byte count, so the decoded-export input shape was rejected before implementation

### GREEN

Command:

```powershell
deno test tests/backend/live_bus_substrate_test.ts
```

Result:

- Passed: `2 passed | 0 failed`

## Implementation Notes

- Replaced the walking-skeleton `ReceiverState` counters with a substrate-backed `TelemetryStore`.
- Added `buildReceiverState()` store initialization through `createTelemetryStore()`.
- Expanded `recordReceiverExport()` to accept either:
  - the legacy numeric byte-count path used by `receiver.ts` in Task 5, or
  - the decoded export payload shape required for the substrate path
- Normalized decoded metric exports with `normalizeMetricsExport()` and recorded normalized points plus warnings into the store.
- Switched `buildLiveTelemetrySummary()` to derive rates and overview data through `deriveLiveTelemetrySummary(state.store.snapshot(), ...)`.
- Preserved receiver failure precedence by prepending `lastWarning` ahead of substrate warnings in the returned summary.

## Verification

Focused verification command:

```powershell
deno test tests/backend/live_bus_substrate_test.ts
```

Result:

- Passed: `2 passed | 0 failed`

## DOX Pass

- Re-read `AGENTS.md`, `src/AGENTS.md`, `src/backend/AGENTS.md`, and `tests/AGENTS.md` before editing.
- Left AGENTS docs unchanged because this task stayed within the existing backend/test contracts and did not alter subtree purpose, ownership, workflow, or verification requirements.

## Self-Review

- Confirmed the implementation stays within Task 5 ownership: one new backend test and one `live_bus.ts` change.
- Confirmed the old numeric `recordReceiverExport(state, bytesReceived)` path still exists for Task 6 compatibility.
- Confirmed the new test proves both substrate summary derivation and warning precedence behavior.

---

## Review Fixes: 2026-07-07

### Scope

- Modified `tests/backend/live_bus_substrate_test.ts`
- Modified `src/backend/AGENTS.md`
- Left `src/backend/live_bus.ts` unchanged because the improved warning-ordering test did not expose a production bug

### Finding 1: Warning Ordering Regression Coverage

- Updated the warning-ordering regression to record a decoded export that produces a real substrate warning (`metric-unsupported` from a summary metric), then record a receiver decode failure.
- Asserted that `buildLiveTelemetrySummary()` returns the receiver warning first and the substrate warning second.
- This closed the coverage gap where the prior test only proved receiver-warning behavior when no substrate warning existed.

### Finding 2: DOX Refresh

- Updated `src/backend/AGENTS.md` so backend ownership reflects the current substrate-backed design:
  - `live_bus.ts` owns receiver state, substrate ingestion, receiver warning precedence, and live summary generation
  - `normalize_metrics.ts`, `telemetry_store.ts`, and `metric_derivations.ts` are now explicitly listed in backend ownership

### Verification Evidence

Command:

```powershell
deno test tests/backend/live_bus_substrate_test.ts
```

Result:

- Passed: `2 passed | 0 failed`

Command:

```powershell
deno task ok
```

Result:

- Passed all repository quality gates for this worktree

### Notes

- The first `deno task ok` run failed `fmt --check` on `tests/backend/live_bus_substrate_test.ts`; I formatted that file with `deno fmt tests/backend/live_bus_substrate_test.ts` and reran the gate successfully.
- The strengthened warning-ordering regression passed without further `live_bus.ts` changes, confirming the existing receiver-warning prepend logic already handled substrate warnings correctly.
