# Task 3 Report: Normalize Exponential Histogram Datapoints And Close Docs

## What I implemented

- Added two Task 3 normalization tests to
  `tests/backend/normalize_metrics_test.ts` on top of the existing Task 2
  generated-binding coverage.
- Extended `src/backend/metric_model.ts` with:
  - `ExponentialHistogramBuckets`
  - `ExponentialHistogramValue`
  - `MetricPoint.exponentialHistogram?`
- Extended `src/backend/normalize_metrics.ts` to:
  - import generated exponential histogram types;
  - add the `"exponentialHistogram"` branch in `normalizeMetric()`;
  - normalize exponential histogram datapoints into typed retained records;
  - mark safe retained records as `unsupported` with typed
    `exponentialHistogram` metadata;
  - mark inconsistent or unsafe records as `incomplete` without retained
    exponential bucket metadata.
- Updated docs/evidence:
  - `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
  - `docs/plans/04-implementation/05-test-plan.md`
  - `docs/plans/05-linear-issues/OI-006.md`
  - `docs/plans/06-evidence/acceptance-matrix.md`
- Appended the Task 2 unblock resolution note to
  `.superpowers/sdd/task-2-report.md`.

## What I tested and exact results

1. `deno test .\tests\backend\normalize_metrics_test.ts`
   - RED: failed during type-checking with:
     - `TS2366` at `src/backend/normalize_metrics.ts:55:4`
     - `TS2339` for missing `MetricPoint.exponentialHistogram` in the new
       tests
   - GREEN: passed with `ok | 11 passed | 0 failed`

2. `deno task receiver:test`
   - Passed with `ok | 14 passed | 0 failed`

3. `deno test .\tests\backend\metric_model_test.ts .\tests\backend\normalize_metrics_test.ts .\tests\backend\telemetry_store_test.ts .\tests\backend\metric_derivations_test.ts .\tests\backend\live_bus_substrate_test.ts .\tests\backend\live_bus_cadence_test.ts`
   - Passed with `ok | 37 passed | 0 failed`

4. `deno task ok`
   - Passed.
   - `deno fmt --check`: `Checked 36 files`
   - `deno lint`: `Checked 24 files`
   - Full suite: `ok | 54 passed | 0 failed`

5. Diff inspection
   - `git status --short`: scoped dirty files only
   - `git diff --stat`: proto/codegen, model, normalizer, tests, docs, and
     report updates only

## TDD Evidence

### RED

Command:

```powershell
deno test .\tests\backend\normalize_metrics_test.ts
```

Output:

```text
TS2366 [ERROR]: Function lacks ending return statement and return type does not include 'undefined'.
at src/backend/normalize_metrics.ts:55:4

TS2339 [ERROR]: Property 'exponentialHistogram' does not exist on type 'MetricPoint'.
at tests/backend/normalize_metrics_test.ts:133:33

TS2339 [ERROR]: Property 'exponentialHistogram' does not exist on type 'MetricPoint'.
at tests/backend/normalize_metrics_test.ts:191:33
```

### GREEN

Command:

```powershell
deno test .\tests\backend\normalize_metrics_test.ts
```

Output:

```text
ok | 11 passed | 0 failed
```

## Files changed

- `.superpowers/sdd/task-2-report.md`
- `.superpowers/sdd/task-3-report.md`
- `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
- `docs/plans/04-implementation/05-test-plan.md`
- `docs/plans/05-linear-issues/OI-006.md`
- `docs/plans/06-evidence/acceptance-matrix.md`
- `src/backend/metric_model.ts`
- `src/backend/normalize_metrics.ts`
- `src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts`
- `tests/backend/normalize_metrics_test.ts`
- `tools/proto/opentelemetry/proto/metrics/v1/metrics.proto`

## Self-review findings

- The Task 2 generated bindings were left intact and consumed as-is; generated
  protobuf output was not hand-edited.
- The new normalization path is isolated to metric-model/normalizer/test/doc
  surfaces in the approved write scope.
- Incomplete exponential histograms do not retain unsafe bucket metadata and
  still surface a typed `exponential_histogram` metric record plus warning.

## Any concerns

- The success fixture was corrected so `count` now equals positive bucket
  totals plus negative bucket totals plus `zeroCount`, and
  `buildExponentialHistogramValue()` now follows OTLP total-count semantics.

## Review-fix closeout

- Files changed:
  - `src/backend/AGENTS.md`
  - `docs/plans/06-evidence/acceptance-matrix.md`
  - `.superpowers/sdd/task-3-report.md`
- Verification:
  - `deno fmt --check src/backend/AGENTS.md docs/plans/06-evidence/acceptance-matrix.md .superpowers/sdd/task-3-report.md` returned `No target files found.`
  - `git diff --check`

## Final-review fix

- Corrected exponential histogram `Buckets.bucket_counts` from `fixed64` to
  `uint64` in the local proto and plan snippet to match OTLP wire encoding.
- Regenerated protobuf bindings with `deno task proto:gen`; generated
  exponential bucket reads/writes now use `uint64`.
- Added a wire-level regression that decodes a hand-encoded OTLP exponential
  histogram payload with packed uint64 bucket counts before normalization.
- RED: `deno test .\tests\backend\normalize_metrics_test.ts` failed in
  `ExponentialHistogramDataPoint_Buckets` while the generated decoder still
  tried to read packed uint64 values as `fixed64`.
- GREEN: `deno test .\tests\backend\normalize_metrics_test.ts` passed with
  `12 passed | 0 failed`.
