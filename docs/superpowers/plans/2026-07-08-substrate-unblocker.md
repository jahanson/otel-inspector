# Substrate Unblocker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the verification baseline, reconcile substrate docs, and add typed exponential histogram normalization before M3 dashboard UI work starts.

**Architecture:** Keep the existing ingest-decode-normalize-store-derive pipeline. Extend the local backend-only OTLP metrics schema, regenerate generated bindings through `deno task proto:gen`, and teach `normalizeMetricsExport()` to retain exponential histogram datapoints as typed normalized records without attempting percentile derivation.

**Tech Stack:** Deno TypeScript, protobuf-ts generated bindings, local OTLP proto inputs under `tools/proto/`, Deno tests with `@std/assert`, docs under DOX.

## Global Constraints

- Follow the full DOX chain before editing any file.
- Do not build Overview cards, live charts, Metrics Explorer filters, or pause/resume/clear controls.
- Do not implement the Payload Inspector, redaction policy, raw capture opt-in, redacted fixture export, SQLite session history, traces, logs, or proxy mode.
- Do not attempt certification-grade exponential histogram percentile math.
- Do not persist raw protobuf request bodies.
- Do not hand-edit generated files under `src/backend/otel/proto/`.
- Generated output under `src/backend/otel/proto/` must come only from `deno task proto:gen`.
- Safe failures must not echo request bodies, raw decoder errors, credentials, or raw sensitive attribute values.
- Preserve the metrics-first MVP scope: `/v1/metrics` only, with traces/logs rejected as unsupported signals.
- `deno task ok` is the final quality gate.
- Leave unrelated working-tree changes alone; an existing unstaged `AGENTS.md` Repowise metadata diff may be present.

---

## File Structure

- Modify `.codex/hooks.json` only to normalize line endings.
- Modify `tools/proto/opentelemetry/proto/metrics/v1/metrics.proto` to add the minimal exponential histogram metric surface.
- Regenerate `src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts` with `deno task proto:gen`; do not hand-edit it.
- Modify `src/backend/metric_model.ts` to add a typed `ExponentialHistogramValue` field to `MetricPoint`.
- Modify `src/backend/normalize_metrics.ts` to normalize generated `exponentialHistogram` metrics.
- Modify `tests/backend/normalize_metrics_test.ts` for exponential histogram coverage.
- Modify docs under `docs/plans/` only where they describe the completed substrate, exponential histogram support, or evidence gates.

Reference the upstream OpenTelemetry
[`metrics.proto`](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto)
field numbering for exponential histogram messages, then keep only the local
schema surface needed by this repository's metrics receiver and tests.

---

### Task 1: Restore Baseline Gate And Reconcile Existing Contracts

**Files:**
- Modify: `.codex/hooks.json`
- Modify: `docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md`
- Modify: `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
- Modify: `docs/plans/02-runtime-architecture/03-reactive-live-bus.md`
- Modify: `docs/plans/04-implementation/03-ingest-pipeline.md`
- Modify: `docs/plans/04-implementation/04-api-and-event-contracts.md`
- Modify: `docs/plans/06-evidence/acceptance-matrix.md`
- Modify: `docs/plans/06-evidence/dogfood-checklist.md`

**Interfaces:**
- Consumes: current receiver/substrate code in `src/backend/contracts.ts`, `src/backend/receiver.ts`, `src/backend/live_bus.ts`, `src/backend/telemetry_store.ts`, and `src/backend/metric_derivations.ts`.
- Produces: clean line-ending verification and docs that accurately distinguish implemented backend substrate work from pending UI/privacy/packaging work.

- [ ] **Step 1: Confirm the line-ending failure**

Run:

```powershell
git ls-files --eol -- .codex/hooks.json
deno fmt --check .codex/hooks.json
```

Expected in the original parent checkout before the fix:

```text
i/lf    w/crlf  attr/text=auto eol=lf  .codex/hooks.json
error: Found 1 not formatted file in 1 file
```

In a fresh isolated worktree this command may already pass and report
`w/lf`. If it does, treat the quality-gate baseline as already satisfied and do
not edit `.codex/hooks.json`.

- [ ] **Step 2: Normalize `.codex/hooks.json` with Deno**

Run only if Step 1 reported `w/crlf` or `deno fmt --check .codex/hooks.json`
failed:

```powershell
deno fmt .codex/hooks.json
```

Expected: Deno rewrites only line endings/formatting for `.codex/hooks.json`.

- [ ] **Step 3: Verify the focused format gate**

Run:

```powershell
deno fmt --check .codex/hooks.json
git ls-files --eol -- .codex/hooks.json
```

Expected:

```text
Checked 1 file
i/lf    w/lf    attr/text=auto eol=lf  .codex/hooks.json
```

If `.codex/hooks.json` was already `w/lf`, it should remain unchanged in
`git status --short`.

- [ ] **Step 4: Update receiver runtime doc**

In `docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md`, replace the success paragraph with:

```md
Successful metric exports return `200` with an empty
`ExportMetricsServiceResponse` protobuf body and are counted only after decode
and substrate normalization/storage both succeed.
```

In the rejection table, add this row after malformed protobuf:

```md
| Normalization/storage failure | 400 | normalize-failed |
```

In the `ReceiverFailureResponse` category union, add:

```ts
    | "decode-failed"
    | "normalize-failed";
```

- [ ] **Step 5: Update telemetry normalization store doc**

In `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`, change frontmatter:

```yaml
status: implemented
updated: 2026-07-08
```

Replace the `MetricPoint` example with the current implemented shape plus the future exponential histogram field:

```ts
type ExponentialHistogramValue = {
  scale: number;
  zeroCount?: number;
  zeroThreshold?: number;
  positive?: { offset: number; counts: number[] };
  negative?: { offset: number; counts: number[] };
  min?: number;
  max?: number;
};

type MetricPoint = {
  seriesKey: string;
  observedAtMs: number;
  timestampUnixNano?: string;
  startTimeUnixNano?: string;
  resource: Record<string, string | number | boolean>;
  scope: { name?: string; version?: string };
  metric: {
    name: string;
    description?: string;
    unit?: string;
    type: "gauge" | "sum" | "histogram" | "exponential_histogram" | "summary" | "unknown";
    temporality?: "delta" | "cumulative" | "unspecified";
    monotonic?: boolean;
  };
  attributes: Record<string, string | number | boolean>;
  value?: number;
  count?: number;
  sum?: number;
  buckets?: Array<{ upperBound: number; count: number }>;
  exponentialHistogram?: ExponentialHistogramValue;
  derivationStatus: "usable" | "unsupported" | "incomplete";
  warnings: Array<{ code: string; message: string }>;
};
```

Add this sentence below the implemented-module paragraph:

```md
Exponential histogram datapoints are retained as typed normalized records once
the local proto/codegen surface exposes the OTLP oneof arm, but percentile
derivation remains unavailable until a separate safe derivation design lands.
```

- [ ] **Step 6: Update live bus and API contract docs**

In `docs/plans/02-runtime-architecture/03-reactive-live-bus.md`, change frontmatter:

```yaml
status: implemented
updated: 2026-07-08
```

Add this sentence after the cadence helper paragraph:

```md
The current implementation exposes deterministic summary cadence helpers for
backend tests; browser backpressure, pause/resume, and downsampled UI views
remain M3 dashboard work.
```

In `docs/plans/04-implementation/04-api-and-event-contracts.md`, change frontmatter:

```yaml
status: implemented
updated: 2026-07-08
```

Keep `LiveTelemetrySummary` as:

```ts
type LiveTelemetrySummary = {
  observedAtMs: number;
  receiver: { endpoint: string; live: boolean; paused: boolean };
  ingest: { exportsPerSec: number; datapointsPerSec: number; bytesPerSec: number; dropped: number };
  overview: { p95Ms?: number; errorRate?: number; activeRequests?: number; requestRate?: number; topServices: string[] };
  warnings: Array<{ code: string; message: string }>;
};
```

Add this note below it:

```md
This summary is implemented by `src/backend/metric_derivations.ts` and served by
`src/backend/app_server.ts` at `/api/summary`. M3 UI controls and chart-specific
projection contracts are still pending.
```

- [ ] **Step 7: Update ingest and evidence docs without claiming UI completion**

In `docs/plans/04-implementation/03-ingest-pipeline.md`, change frontmatter:

```yaml
status: implemented
updated: 2026-07-08
```

Add this note after the pipeline block:

```md
The implemented backend path currently covers receiver validation, protobuf
decode, metric normalization, bounded store append, safe `normalize-failed`
handling, and live summary derivation. Redaction pre-scan, durable persistence,
and UI controls remain pending.
```

In `docs/plans/06-evidence/acceptance-matrix.md`, update the first two rows to:

```md
| Receiver accepts OTLP metrics over HTTP/protobuf | `tests/backend/receiver_contract_test.ts`, `fixtures/otlp/valid-minimal-metrics.bin`, `fixtures/otlp/malformed-protobuf.bin` | UI/evidence closeout still pending | P0 |
| Telemetry is normalized before UI rendering | `tests/backend/normalize_metrics_test.ts`, `tests/backend/metric_model_test.ts`, `tests/backend/telemetry_store_test.ts`, exponential histogram follow-up in this slice | Dashboard projection still pending | P0 |
```

In `docs/plans/06-evidence/dogfood-checklist.md`, mark only the backend receiver items as complete:

```md
- [x] `POST /v1/metrics` accepts valid protobuf fixture.
- [x] Malformed payloads fail safely.
- [ ] Overview dashboard renders no-telemetry, live, paused, and degraded states.
```

Leave all UI, payload inspector, redaction, fixture export, packaging, and acceptance-matrix closeout items unchecked.

- [ ] **Step 8: Verify docs and baseline gate**

Run:

```powershell
deno fmt --check .codex/hooks.json
deno task lint
deno task check
git diff --check
```

Expected:

```text
Checked 1 file
Checked 24 files
Check ...
```

`git diff --check` should produce no whitespace errors.

- [ ] **Step 9: Commit Task 1**

Run:

```powershell
git status --short
git add -- docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md docs/plans/02-runtime-architecture/03-reactive-live-bus.md docs/plans/04-implementation/03-ingest-pipeline.md docs/plans/04-implementation/04-api-and-event-contracts.md docs/plans/06-evidence/acceptance-matrix.md docs/plans/06-evidence/dogfood-checklist.md
if ((git status --short -- .codex/hooks.json) -ne "") { git add -- .codex/hooks.json }
git commit -m "docs: reconcile substrate contracts"
```

Expected: commit succeeds. Do not stage unrelated `AGENTS.md` changes unless this task intentionally changed them.

---

### Task 2: Add Exponential Histogram Proto Surface

**Files:**
- Modify: `tools/proto/opentelemetry/proto/metrics/v1/metrics.proto`
- Generated: `src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts`
- Modify: `tests/backend/normalize_metrics_test.ts`

**Interfaces:**
- Consumes: `deno task proto:gen` from `deno.json`; generated metrics bindings imported from `src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts`.
- Produces:
  - generated `ExponentialHistogram` and `ExponentialHistogramDataPoint` interfaces;
  - generated `Metric.data.oneofKind === "exponentialHistogram"` arm;
  - compile-time test coverage proving the generated arm exists.

- [ ] **Step 1: Add a failing generated-binding test**

Modify the import block in `tests/backend/normalize_metrics_test.ts` to include the new generated types:

```ts
import {
  AggregationTemporality,
  type ExponentialHistogramDataPoint,
  type Metric,
} from "../../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";
```

Add this test before the existing histogram test:

```ts
Deno.test("generated metrics bindings expose exponential histogram metrics", () => {
  const dataPoint: ExponentialHistogramDataPoint = {
    attributes: [stringAttribute("http.route", "/cart")],
    startTimeUnixNano: 10n,
    timeUnixNano: 20n,
    count: 4n,
    sum: 120,
    scale: 2,
    zeroCount: 1n,
    positive: { offset: -1, bucketCounts: [1n, 2n] },
    negative: { offset: 0, bucketCounts: [1n] },
    flags: 0,
    min: 1,
    max: 80,
    zeroThreshold: 0,
  };
  const metric: Metric = {
    name: "http.server.duration.exp",
    description: "",
    unit: "ms",
    data: {
      oneofKind: "exponentialHistogram",
      exponentialHistogram: {
        aggregationTemporality: AggregationTemporality.DELTA,
        dataPoints: [dataPoint],
      },
    },
  };

  assertEquals(metric.data.oneofKind, "exponentialHistogram");
  if (metric.data.oneofKind === "exponentialHistogram") {
    assertEquals(metric.data.exponentialHistogram.dataPoints[0].positive?.bucketCounts, [1n, 2n]);
  }
});
```

- [ ] **Step 2: Run the focused test to verify the missing generated surface**

Run:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Expected before proto/codegen work: FAIL during type checking because `ExponentialHistogramDataPoint` and/or the `"exponentialHistogram"` oneof arm do not exist.

- [ ] **Step 3: Add minimal exponential histogram schema**

In `tools/proto/opentelemetry/proto/metrics/v1/metrics.proto`, add the oneof arm inside `message Metric` after `Histogram histogram = 9;`:

```proto
    ExponentialHistogram exponential_histogram = 10;
```

Add these messages after `message Histogram` and before `message Summary`:

```proto
message ExponentialHistogram {
  repeated ExponentialHistogramDataPoint data_points = 1;
  AggregationTemporality aggregation_temporality = 2;
}

message ExponentialHistogramDataPoint {
  repeated opentelemetry.proto.common.v1.KeyValue attributes = 1;
  fixed64 start_time_unix_nano = 2;
  fixed64 time_unix_nano = 3;
  fixed64 count = 4;
  optional double sum = 5;
  sint32 scale = 6;
  fixed64 zero_count = 7;
  Buckets positive = 8;
  Buckets negative = 9;
  uint32 flags = 10;
  optional double min = 12;
  optional double max = 13;
  double zero_threshold = 14;

  message Buckets {
    sint32 offset = 1;
    repeated fixed64 bucket_counts = 2;
  }
}
```

This local schema intentionally omits exemplars because the current local proto surface does not include `Exemplar`; unknown exemplar fields should remain ignored by the minimal decoder.

- [ ] **Step 4: Regenerate protobuf bindings**

Run:

```powershell
deno task proto:gen
```

Expected:

```text
Generated OTLP protobuf bindings in src/backend/otel/proto
```

- [ ] **Step 5: Verify the generated oneof arm exists**

Run:

```powershell
rg -n "exponentialHistogram|ExponentialHistogramDataPoint" src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts
deno test tests/backend/normalize_metrics_test.ts
```

Expected:

```text
... oneofKind: "exponentialHistogram" ...
... export interface ExponentialHistogramDataPoint ...
ok | 9 passed | 0 failed
```

The test count may be higher if other tests were added later; it must have 0 failures.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git status --short
git add -- tools/proto/opentelemetry/proto/metrics/v1/metrics.proto src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts tests/backend/normalize_metrics_test.ts
git commit -m "feat: add exponential histogram proto bindings"
```

Expected: commit succeeds. If `deno task proto:gen` changes generated files outside metrics bindings, inspect them and include only deterministic generated changes caused by the proto input.

---

### Task 3: Normalize Exponential Histogram Datapoints And Close Docs

**Files:**
- Modify: `src/backend/metric_model.ts`
- Modify: `src/backend/normalize_metrics.ts`
- Modify: `tests/backend/normalize_metrics_test.ts`
- Modify: `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
- Modify: `docs/plans/04-implementation/05-test-plan.md`
- Modify: `docs/plans/05-linear-issues/OI-006.md`
- Modify: `docs/plans/06-evidence/acceptance-matrix.md`

**Interfaces:**
- Consumes:
  - `type ExponentialHistogram` and `type ExponentialHistogramDataPoint` from generated metrics bindings.
  - `toNumberValue(value: bigint | number): number | undefined` from `src/backend/metric_model.ts`.
  - `basePoint(...)` helper in `src/backend/normalize_metrics.ts`.
- Produces:
  - `type ExponentialHistogramBuckets = { offset: number; counts: number[] }`
  - `type ExponentialHistogramValue = { scale: number; zeroCount?: number; zeroThreshold?: number; positive?: ExponentialHistogramBuckets; negative?: ExponentialHistogramBuckets; min?: number; max?: number }`
  - `MetricPoint.exponentialHistogram?: ExponentialHistogramValue`
  - `normalizeMetricsExport()` support for `metric.data.oneofKind === "exponentialHistogram"`.

- [ ] **Step 1: Add failing exponential histogram normalization tests**

Keep the generated-binding test from Task 2. Add these tests after it in `tests/backend/normalize_metrics_test.ts`:

```ts
Deno.test("normalizeMetricsExport retains exponential histogram datapoints as unsupported typed points", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [stringAttribute("service.name", "checkout")], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration.exp",
          description: "duration",
          unit: "ms",
          data: {
            oneofKind: "exponentialHistogram",
            exponentialHistogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [
                  stringAttribute("http.request.method", "GET"),
                  stringAttribute("http.route", "/cart"),
                ],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 4n,
                sum: 120,
                scale: 2,
                zeroCount: 1n,
                positive: { offset: -1, bucketCounts: [1n, 2n] },
                negative: { offset: 0, bucketCounts: [1n] },
                flags: 0,
                min: 1,
                max: 80,
                zeroThreshold: 0,
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "exponential_histogram");
  assertEquals(result.points[0].metric.temporality, "delta");
  assertEquals(result.points[0].derivationStatus, "unsupported");
  assertEquals(result.points[0].resource["service.name"], "checkout");
  assertEquals(result.points[0].attributes["http.route"], "/cart");
  assertEquals(result.points[0].startTimeUnixNano, "10");
  assertEquals(result.points[0].timestampUnixNano, "20");
  assertEquals(result.points[0].count, 4);
  assertEquals(result.points[0].sum, 120);
  assertEquals(result.points[0].exponentialHistogram, {
    scale: 2,
    zeroCount: 1,
    zeroThreshold: 0,
    positive: { offset: -1, counts: [1, 2] },
    negative: { offset: 0, counts: [1] },
    min: 1,
    max: 80,
  });
  assertEquals(result.points[0].warnings, [{
    code: "metric-unsupported",
    message: "Exponential histogram is retained but not yet used for derivations.",
  }]);
  assertEquals(result.warnings[0].code, "metric-unsupported");
});

Deno.test("normalizeMetricsExport reports incomplete exponential histograms when bucket totals do not match count", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration.exp",
          description: "",
          unit: "ms",
          data: {
            oneofKind: "exponentialHistogram",
            exponentialHistogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [stringAttribute("http.route", "/cart")],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 10n,
                sum: 120,
                scale: 2,
                zeroCount: 1n,
                positive: { offset: -1, bucketCounts: [1n, 2n] },
                negative: { offset: 0, bucketCounts: [1n] },
                flags: 0,
                min: 1,
                max: 80,
                zeroThreshold: 0,
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "exponential_histogram");
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].count, 10);
  assertEquals(result.points[0].exponentialHistogram, undefined);
  assertEquals(result.points[0].warnings, [{
    code: "exponential-histogram-incomplete",
    message: "Exponential histogram datapoint cannot be retained as safe bucket metadata.",
  }]);
  assertEquals(result.warnings[0].code, "exponential-histogram-incomplete");
});
```

- [ ] **Step 2: Run focused tests to verify the normalizer gap**

Run:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Expected before implementation: FAIL because `normalizeMetric()` has no `"exponentialHistogram"` branch and `MetricPoint` has no `exponentialHistogram` property.

- [ ] **Step 3: Extend the metric model**

In `src/backend/metric_model.ts`, add these exported types after `MetricWarning`:

```ts
export type ExponentialHistogramBuckets = {
  offset: number;
  counts: number[];
};

export type ExponentialHistogramValue = {
  scale: number;
  zeroCount?: number;
  zeroThreshold?: number;
  positive?: ExponentialHistogramBuckets;
  negative?: ExponentialHistogramBuckets;
  min?: number;
  max?: number;
};
```

Add this field to `MetricPoint` after `buckets?: Array<{ upperBound: number; count: number }>;`:

```ts
  exponentialHistogram?: ExponentialHistogramValue;
```

- [ ] **Step 4: Import generated exponential histogram types**

In `src/backend/normalize_metrics.ts`, update the generated metrics import to include:

```ts
  type ExponentialHistogram,
  type ExponentialHistogramDataPoint,
```

Update the metric model import to include:

```ts
  type ExponentialHistogramBuckets,
  type ExponentialHistogramValue,
```

- [ ] **Step 5: Add the normalizer branch**

In `normalizeMetric()`, add this case after the histogram case and before summary:

```ts
    case "exponentialHistogram":
      return exponentialHistogramPoints(metric, scopeMetrics, resource, observedAtMs, metric.data.exponentialHistogram);
```

- [ ] **Step 6: Add exponential histogram helper functions**

Add these functions after `histogramPoints()` and before `hasUsableHistogramBuckets()` in `src/backend/normalize_metrics.ts`:

```ts
function exponentialHistogramPoints(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  exponentialHistogram: ExponentialHistogram,
): MetricPoint[] {
  return exponentialHistogram.dataPoints.map((dataPoint) =>
    exponentialHistogramPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint, exponentialHistogram)
  );
}

function exponentialHistogramPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  dataPoint: ExponentialHistogramDataPoint,
  exponentialHistogram: ExponentialHistogram,
): MetricPoint {
  const attributes = attributesFromKeyValues(dataPoint.attributes);
  const count = toNumberValue(dataPoint.count);
  const zeroCount = toNumberValue(dataPoint.zeroCount);
  const positive = normalizeExponentialBuckets(dataPoint.positive);
  const negative = normalizeExponentialBuckets(dataPoint.negative);
  const safeHistogram = buildExponentialHistogramValue(dataPoint, positive, negative, count, zeroCount);
  const incomplete = safeHistogram === undefined;
  const warning = incomplete
    ? {
      code: "exponential-histogram-incomplete",
      message: "Exponential histogram datapoint cannot be retained as safe bucket metadata.",
    }
    : {
      code: "metric-unsupported",
      message: "Exponential histogram is retained but not yet used for derivations.",
    };

  return basePoint(metric, scopeMetrics, resource, observedAtMs, attributes, "exponential_histogram", {
    timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
    startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
    count,
    sum: dataPoint.sum !== undefined && Number.isFinite(dataPoint.sum) ? dataPoint.sum : undefined,
    exponentialHistogram: safeHistogram,
    metricOverrides: { temporality: temporalityName(exponentialHistogram.aggregationTemporality) },
    derivationStatus: incomplete ? "incomplete" : "unsupported",
    warnings: [warning],
  });
}

function normalizeExponentialBuckets(
  buckets: ExponentialHistogramDataPoint["positive"],
): ExponentialHistogramBuckets | undefined {
  if (!buckets) {
    return undefined;
  }

  const counts = buckets.bucketCounts.map((bucketCount) => toNumberValue(bucketCount));
  if (counts.some((count) => count === undefined || count < 0)) {
    return undefined;
  }

  return { offset: buckets.offset, counts: counts as number[] };
}

function buildExponentialHistogramValue(
  dataPoint: ExponentialHistogramDataPoint,
  positive: ExponentialHistogramBuckets | undefined,
  negative: ExponentialHistogramBuckets | undefined,
  count: number | undefined,
  zeroCount: number | undefined,
): ExponentialHistogramValue | undefined {
  if (count === undefined || zeroCount === undefined || zeroCount < 0) {
    return undefined;
  }

  const bucketTotal = bucketCountTotal(positive) + bucketCountTotal(negative) + zeroCount;
  if (bucketTotal !== count) {
    return undefined;
  }

  const value: ExponentialHistogramValue = {
    scale: dataPoint.scale,
    zeroCount,
    zeroThreshold: Number.isFinite(dataPoint.zeroThreshold) ? dataPoint.zeroThreshold : undefined,
    positive,
    negative,
    min: dataPoint.min !== undefined && Number.isFinite(dataPoint.min) ? dataPoint.min : undefined,
    max: dataPoint.max !== undefined && Number.isFinite(dataPoint.max) ? dataPoint.max : undefined,
  };

  return value;
}

function bucketCountTotal(buckets: ExponentialHistogramBuckets | undefined): number {
  if (!buckets) {
    return 0;
  }

  return buckets.counts.reduce((sum, count) => sum + count, 0);
}
```

- [ ] **Step 7: Extend `basePoint()` options and return shape**

In `basePoint()` options, add:

```ts
    exponentialHistogram?: ExponentialHistogramValue;
```

In the returned `MetricPoint`, add:

```ts
    exponentialHistogram: options.exponentialHistogram,
```

- [ ] **Step 8: Run focused normalization tests**

Run:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Expected:

```text
ok | 11 passed | 0 failed
```

The exact count may differ if Task 2 added or adjusted tests, but all tests in `tests/backend/normalize_metrics_test.ts` must pass.

- [ ] **Step 9: Run receiver and substrate safety tests**

Run:

```powershell
deno task receiver:test
deno test tests/backend/metric_model_test.ts tests/backend/normalize_metrics_test.ts tests/backend/telemetry_store_test.ts tests/backend/metric_derivations_test.ts tests/backend/live_bus_substrate_test.ts tests/backend/live_bus_cadence_test.ts
```

Expected:

```text
ok | ... passed | 0 failed
```

- [ ] **Step 10: Update exponential histogram docs and OI-006**

In `docs/plans/04-implementation/05-test-plan.md`, change frontmatter:

```yaml
updated: 2026-07-08
```

Replace the normalization bullet:

```md
- Gauge/sum/histogram/exponential histogram shapes normalized; exponential
  histogram percentile derivation remains a follow-up.
```

In `docs/plans/05-linear-issues/OI-006.md`, change frontmatter:

```yaml
status: implemented
updated: 2026-07-08
```

Replace the second acceptance criterion with:

```md
- Exponential histogram payloads have typed normalized forms after local
  proto/codegen support; percentile derivation remains out of scope for this
  issue.
```

In `docs/plans/06-evidence/acceptance-matrix.md`, update the telemetry normalization row evidence to include:

```md
`tests/backend/normalize_metrics_test.ts` exponential histogram coverage
```

- [ ] **Step 11: Run the full quality gate**

Run:

```powershell
deno task ok
```

Expected:

```text
Task ok deno task fmt:check && deno task lint && deno task check && deno task test
Checked ...
ok | ... passed | 0 failed
```

- [ ] **Step 12: Inspect generated and documentation diffs**

Run:

```powershell
git status --short
git diff --stat
git diff -- tools/proto/opentelemetry/proto/metrics/v1/metrics.proto src/backend/metric_model.ts src/backend/normalize_metrics.ts tests/backend/normalize_metrics_test.ts
```

Expected:

- `.codex/hooks.json` should already be committed by Task 1.
- Generated `metrics.ts` changes should correspond to the new proto schema.
- No unrelated `AGENTS.md` diff should be staged unless explicitly changed by this task.

- [ ] **Step 13: Commit Task 3**

Run:

```powershell
git add -- src/backend/metric_model.ts src/backend/normalize_metrics.ts tests/backend/normalize_metrics_test.ts docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md docs/plans/04-implementation/05-test-plan.md docs/plans/05-linear-issues/OI-006.md docs/plans/06-evidence/acceptance-matrix.md
git commit -m "feat: normalize exponential histograms"
```

Expected: commit succeeds.

- [ ] **Step 14: Refresh Repowise after implementation is complete**

Run:

```powershell
repowise update
```

Expected: Repowise refresh succeeds so follow-on M3 UI planning sees the new proto/normalization contract.

---

## Final Closeout

- [ ] Run `git status --short`.
- [ ] Run `deno task ok` after the final commit if any generated files or docs changed after Task 3 verification.
- [ ] Confirm `AGENTS.md` was not accidentally staged if it only contains unrelated Repowise metadata drift.
- [ ] Summarize:
  - line-ending baseline fixed;
  - docs/evidence reconciled;
  - exponential histogram proto/codegen added;
  - exponential histogram datapoints normalized as typed unsupported/incomplete records;
  - M3 dashboard UI, redaction, payload inspector, raw capture, fixture export, SQLite, traces, logs, and proxy mode remain pending.
