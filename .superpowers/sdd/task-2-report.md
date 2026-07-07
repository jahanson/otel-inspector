# Task 2 Report: Normalize OTLP Metrics Into MetricPoint Records

## Scope

- Created `src/backend/normalize_metrics.ts`
- Created `tests/backend/normalize_metrics_test.ts`
- Left all other source files unchanged

## DOX chain read

- `AGENTS.md`
- `src/AGENTS.md`
- `src/backend/AGENTS.md`
- `src/backend/otel/AGENTS.md`
- `tests/AGENTS.md`

## TDD evidence

### RED

Command:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Result:

- Failed as expected with `TS2307`
- Failure reason: `src/backend/normalize_metrics.ts` did not exist yet

### GREEN

Command:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Result:

- Passed
- `3 passed | 0 failed`

## Implementation summary

- Normalized OTLP gauge datapoints into `MetricPoint` records with resource, scope, timestamps, unit, and numeric value.
- Normalized OTLP sum datapoints into `MetricPoint` records with temporality and monotonic metadata.
- Normalized OTLP histogram datapoints into `MetricPoint` records with count, sum, and explicit bucket boundaries when the bucket data is usable.
- Retained unsupported summary metrics as `MetricPoint` records marked `derivationStatus: "unsupported"` with `metric-unsupported` warnings.
- Aggregated point warnings into the top-level `NormalizeMetricsResult`.
- Reused Task 1 helpers from `metric_model.ts` for attribute normalization, series key generation, and safe numeric conversion.

## Verification

Focused task verification:

```powershell
deno test tests/backend/normalize_metrics_test.ts
deno fmt --check src/backend/normalize_metrics.ts tests/backend/normalize_metrics_test.ts
```

Results:

- Focused test passed
- Task files passed format check

Repo-wide verification attempt:

```powershell
deno task ok
```

Result:

- Failed during `deno fmt --check`
- Failure includes pre-existing formatting drift in `src/backend/metric_model.ts`
- I did not modify that file for Task 2 because the task scope said to avoid unrelated changes

## Self-review

- Kept the implementation inside the exact task-owned file boundary.
- Followed the brief’s required warning codes and derivation statuses verbatim.
- Adjusted the `sum` branch to satisfy TypeScript oneof narrowing without changing behavior.
- No AGENTS updates were needed because this task did not change durable structure, ownership, or workflow contracts.

## Concerns

- `deno task ok` is not green in this worktree because `src/backend/metric_model.ts` currently fails repo-wide formatting checks outside Task 2 scope.

## Controller Follow-up

The branch formatting concern was resolved after Task 2 by commit 4ccf598 (ix: restore metric model formatting drift). Follow-up command deno fmt --check src/backend/metric_model.ts tests/backend/metric_model_test.ts src/backend/normalize_metrics.ts tests/backend/normalize_metrics_test.ts passed with Checked 4 files.

## Task 2 Review Fix Follow-up

### Scope

- Updated `src/backend/normalize_metrics.ts`
- Updated `tests/backend/normalize_metrics_test.ts`
- Left all other source files unchanged

### Review findings addressed

- Summary normalization now emits one unsupported `MetricPoint` per summary datapoint when datapoints are present.
- Summary datapoint attributes, `startTimeUnixNano`, `timeUnixNano`, `count`, and `sum` are preserved when safely representable.
- Empty summary metrics still preserve the existing behavior by returning a single unsupported summary point.
- Added regression coverage for `metric-value-missing`.
- Added regression coverage for `histogram-incomplete`.

### TDD evidence

RED:

- `deno test tests/backend/normalize_metrics_test.ts`
- Failed with `1 failed` in `normalizeMetricsExport retains one unsupported summary point per summary datapoint`
- Failure showed the current implementation emitted `1` point instead of the expected `2`

GREEN:

- `deno test tests/backend/normalize_metrics_test.ts`
- Passed with `6 passed | 0 failed`

### Verification

- `deno test tests/backend/normalize_metrics_test.ts`
- `deno fmt --check src/backend/normalize_metrics.ts tests/backend/normalize_metrics_test.ts`

Results:

- Tests passed
- Format check passed

### DOX pass

- Re-checked the active DOX chain for the touched paths
- No AGENTS updates were needed because the fix did not change durable structure, ownership, workflow, or verification contracts

### Blocked reviewer item

Exponential histogram remains out of scope for this fix. The current generated proto surface in `src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts` exposes `gauge`, `sum`, `histogram`, and `summary` oneof arms only; there is no exponential histogram arm to normalize against in the owned Task 2 files. That reviewer item should be handled by the controller/human or in a future proto/codegen task.

