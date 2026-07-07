# Telemetry Substrate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend telemetry substrate that normalizes decoded OTLP metrics into bounded in-memory records and derives dashboard-ready live summaries.

**Architecture:** Add focused backend modules for metric contracts, OTLP normalization, bounded storage, and derived summaries. Keep `receiver.ts` as the HTTP/protobuf safety boundary, then hand decoded exports to the substrate so UI-facing code reads `LiveTelemetrySummary` instead of OTLP protobuf trees.

**Tech Stack:** Deno TypeScript, generated `@protobuf-ts/runtime` OTLP bindings under `src/backend/otel/proto/`, Deno tests with `@std/assert`, existing receiver/app server tasks from `deno.json`.

## Global Constraints

- Follow the full DOX chain before editing any file.
- Use TDD for every production behavior change.
- Do not build the M3 dashboard UI in this slice.
- Do not implement the raw payload inspector, redacted fixture export, SQLite session history, traces, logs, or proxy mode.
- Do not attempt certification-grade histogram quantiles.
- Do not persist raw protobuf request bodies by default.
- The receiver still listens on `127.0.0.1:4318` and accepts only `POST /v1/metrics` with `application/x-protobuf`.
- Payload size limit remains `4 MiB`; enforce it before buffering beyond the cap.
- Empty metrics protobuf bodies remain decode failures.
- Safe failures must not echo request bodies, raw attributes, credentials, or raw decoder errors.
- UI code must not import from `src/backend/otel/`.
- `deno task ok` is the final quality gate.

---

## File Structure

- Create `src/backend/metric_model.ts` for substrate-owned types, attribute conversion, stable key helpers, and safe warning helpers.
- Create `src/backend/normalize_metrics.ts` for walking decoded `ExportMetricsServiceRequest` messages into `MetricPoint` records.
- Create `src/backend/telemetry_store.ts` for bounded in-memory point/export retention and eviction accounting.
- Create `src/backend/metric_derivations.ts` for HTTP/service-biased summary derivations from retained points.
- Modify `src/backend/contracts.ts` to add `normalize-failed`, extended summary fields, and reusable overview availability shapes.
- Modify `src/backend/live_bus.ts` so `ReceiverState` owns a `TelemetryStore` and summary building delegates to derivations.
- Modify `src/backend/receiver.ts` so successful decode calls substrate ingestion before responding.
- Add focused tests under `tests/backend/` for model, normalization, store, derivations, and receiver integration.
- Update `src/backend/AGENTS.md` after substrate modules become the local backend contract.
- Update durable planning docs under `docs/plans/02-runtime-architecture/` and `docs/plans/04-implementation/` only where executable contracts change.

---

### Task 1: Metric Model And Stable Series Keys

**Files:**
- Create: `tests/backend/metric_model_test.ts`
- Create: `src/backend/metric_model.ts`

**Interfaces:**
- Consumes: no new substrate code.
- Produces:
  - `type PrimitiveAttributeValue = string | number | boolean`
  - `type MetricPoint`
  - `type MetricWarning`
  - `type MetricType = "gauge" | "sum" | "histogram" | "exponential_histogram" | "summary" | "unknown"`
  - `type AggregationTemporalityName = "delta" | "cumulative" | "unspecified"`
  - `type DerivationStatus = "usable" | "unsupported" | "incomplete"`
  - `attributesFromKeyValues(keyValues: KeyValue[]): Record<string, PrimitiveAttributeValue>`
  - `buildSeriesKey(input: SeriesKeyInput): string`
  - `toNumberValue(value: bigint | number): number | undefined`

- [ ] **Step 1: Write failing model tests**

Create `tests/backend/metric_model_test.ts`:

```ts
import { assertEquals, assertMatch } from "@std/assert";
import { attributesFromKeyValues, buildSeriesKey, toNumberValue } from "../../src/backend/metric_model.ts";

Deno.test("attributesFromKeyValues keeps primitive OTLP values and omits unsafe complex values", () => {
  const attributes = attributesFromKeyValues([
    { key: "service.name", value: { value: { oneofKind: "stringValue", stringValue: "checkout" } } },
    { key: "http.response.status_code", value: { value: { oneofKind: "intValue", intValue: 503n } } },
    { key: "cache.hit", value: { value: { oneofKind: "boolValue", boolValue: true } } },
    { key: "http.server.duration", value: { value: { oneofKind: "doubleValue", doubleValue: 12.5 } } },
    { key: "payload.bytes", value: { value: { oneofKind: "bytesValue", bytesValue: new Uint8Array([1, 2, 3]) } } },
    { key: "empty", value: { value: { oneofKind: undefined } } },
  ]);

  assertEquals(attributes, {
    "service.name": "checkout",
    "http.response.status_code": 503,
    "cache.hit": true,
    "http.server.duration": 12.5,
  });
});

Deno.test("buildSeriesKey is deterministic regardless of object insertion order", () => {
  const first = buildSeriesKey({
    resource: { "service.name": "checkout", region: "us" },
    scope: { name: "otel.http", version: "1.0.0" },
    metricName: "http.server.duration",
    metricType: "histogram",
    unit: "ms",
    attributes: { route: "/cart", method: "GET" },
  });
  const second = buildSeriesKey({
    resource: { region: "us", "service.name": "checkout" },
    scope: { version: "1.0.0", name: "otel.http" },
    metricName: "http.server.duration",
    metricType: "histogram",
    unit: "ms",
    attributes: { method: "GET", route: "/cart" },
  });

  assertEquals(first, second);
  assertMatch(first, /^series:/);
});

Deno.test("toNumberValue converts safe bigint values and rejects unsafe bigint values", () => {
  assertEquals(toNumberValue(42n), 42);
  assertEquals(toNumberValue(42.5), 42.5);
  assertEquals(toNumberValue(9007199254740993n), undefined);
});
```

- [ ] **Step 2: Run model tests to verify failure**

Run:

```powershell
deno test tests/backend/metric_model_test.ts
```

Expected: FAIL because `src/backend/metric_model.ts` does not exist.

- [ ] **Step 3: Implement metric model**

Create `src/backend/metric_model.ts`:

```ts
import type { KeyValue } from "./otel/proto/opentelemetry/proto/common/v1/common.ts";

export type PrimitiveAttributeValue = string | number | boolean;

export type MetricWarning = {
  code: string;
  message: string;
};

export type MetricType = "gauge" | "sum" | "histogram" | "exponential_histogram" | "summary" | "unknown";
export type AggregationTemporalityName = "delta" | "cumulative" | "unspecified";
export type DerivationStatus = "usable" | "unsupported" | "incomplete";

export type MetricPoint = {
  seriesKey: string;
  observedAtMs: number;
  timestampUnixNano?: string;
  startTimeUnixNano?: string;
  resource: Record<string, PrimitiveAttributeValue>;
  scope: { name?: string; version?: string };
  metric: {
    name: string;
    description?: string;
    unit?: string;
    type: MetricType;
    temporality?: AggregationTemporalityName;
    monotonic?: boolean;
  };
  attributes: Record<string, PrimitiveAttributeValue>;
  value?: number;
  count?: number;
  sum?: number;
  buckets?: Array<{ upperBound: number; count: number }>;
  derivationStatus: DerivationStatus;
  warnings: MetricWarning[];
};

export type SeriesKeyInput = {
  resource: Record<string, PrimitiveAttributeValue>;
  scope: { name?: string; version?: string };
  metricName: string;
  metricType: MetricType;
  unit?: string;
  attributes: Record<string, PrimitiveAttributeValue>;
};

export function attributesFromKeyValues(keyValues: KeyValue[]): Record<string, PrimitiveAttributeValue> {
  const attributes: Record<string, PrimitiveAttributeValue> = {};

  for (const keyValue of keyValues) {
    if (!keyValue.value) {
      continue;
    }

    const primitive = primitiveFromAnyValue(keyValue.value);
    if (primitive !== undefined) {
      attributes[keyValue.key] = primitive;
    }
  }

  return attributes;
}

export function buildSeriesKey(input: SeriesKeyInput): string {
  return `series:${stableStringify({
    resource: input.resource,
    scope: input.scope,
    metricName: input.metricName,
    metricType: input.metricType,
    unit: input.unit ?? "",
    attributes: input.attributes,
  })}`;
}

export function toNumberValue(value: bigint | number): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const asNumber = Number(value);
  return Number.isSafeInteger(asNumber) ? asNumber : undefined;
}

function primitiveFromAnyValue(keyValue: KeyValue["value"]): PrimitiveAttributeValue | undefined {
  if (!keyValue) {
    return undefined;
  }

  switch (keyValue.value.oneofKind) {
    case "stringValue":
      return keyValue.value.stringValue;
    case "boolValue":
      return keyValue.value.boolValue;
    case "intValue":
      return toNumberValue(keyValue.value.intValue);
    case "doubleValue":
      return Number.isFinite(keyValue.value.doubleValue) ? keyValue.value.doubleValue : undefined;
    case "arrayValue":
    case "kvlistValue":
    case "bytesValue":
    case undefined:
      return undefined;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
```

- [ ] **Step 4: Run model tests to verify pass**

Run:

```powershell
deno test tests/backend/metric_model_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add src/backend/metric_model.ts tests/backend/metric_model_test.ts
git commit -m "feat: add metric substrate model"
```

Expected: commit succeeds.

---

### Task 2: Normalize OTLP Metrics Into MetricPoint Records

**Files:**
- Create: `tests/backend/normalize_metrics_test.ts`
- Create: `src/backend/normalize_metrics.ts`

**Interfaces:**
- Consumes:
  - `MetricPoint`, `attributesFromKeyValues`, `buildSeriesKey`, `toNumberValue` from `src/backend/metric_model.ts`
  - `ExportMetricsServiceRequestMessage` from `src/backend/otel/decode.ts`
- Produces:
  - `type NormalizeMetricsResult = { points: MetricPoint[]; warnings: MetricWarning[] }`
  - `normalizeMetricsExport(exportRequest: ExportMetricsServiceRequestMessage, observedAtMs: number): NormalizeMetricsResult`

- [ ] **Step 1: Write failing normalization tests**

Create `tests/backend/normalize_metrics_test.ts`:

```ts
import { assertEquals } from "@std/assert";
import { normalizeMetricsExport } from "../../src/backend/normalize_metrics.ts";
import { AggregationTemporality, type Metric } from "../../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";

Deno.test("normalizeMetricsExport emits gauge and sum datapoints with resource and scope context", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: {
        attributes: [
          stringAttribute("service.name", "checkout"),
          stringAttribute("deployment.environment", "dev"),
        ],
        droppedAttributesCount: 0,
      },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [
          gaugeMetric("queue.depth", "items", 7),
          sumMetric("http.server.request.count", "1", 5, AggregationTemporality.DELTA, true),
        ],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.warnings, []);
  assertEquals(result.points.length, 2);
  assertEquals(result.points[0].resource["service.name"], "checkout");
  assertEquals(result.points[0].scope, { name: "manual-fixture", version: "1.0.0" });
  assertEquals(result.points[0].metric.type, "gauge");
  assertEquals(result.points[0].metric.name, "queue.depth");
  assertEquals(result.points[0].metric.unit, "items");
  assertEquals(result.points[0].value, 7);
  assertEquals(result.points[0].timestampUnixNano, "100");
  assertEquals(result.points[0].derivationStatus, "usable");
  assertEquals(result.points[1].metric.type, "sum");
  assertEquals(result.points[1].metric.temporality, "delta");
  assertEquals(result.points[1].metric.monotonic, true);
  assertEquals(result.points[1].value, 5);
});

Deno.test("normalizeMetricsExport emits histogram bucket points when bucket data is usable", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [stringAttribute("service.name", "api")], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration",
          description: "duration",
          unit: "ms",
          data: {
            oneofKind: "histogram",
            histogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [
                  stringAttribute("http.request.method", "GET"),
                  stringAttribute("http.route", "/cart"),
                ],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 3n,
                sum: 60,
                bucketCounts: [1n, 2n],
                explicitBounds: [10],
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.warnings, []);
  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "histogram");
  assertEquals(result.points[0].metric.temporality, "delta");
  assertEquals(result.points[0].count, 3);
  assertEquals(result.points[0].sum, 60);
  assertEquals(result.points[0].buckets, [
    { upperBound: 10, count: 1 },
    { upperBound: Number.POSITIVE_INFINITY, count: 2 },
  ]);
  assertEquals(result.points[0].attributes["http.route"], "/cart");
});

Deno.test("normalizeMetricsExport retains unsupported metric records without failing the whole export", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "legacy.summary",
          description: "",
          unit: "",
          data: { oneofKind: "summary", summary: { dataPoints: [] } },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "summary");
  assertEquals(result.points[0].derivationStatus, "unsupported");
  assertEquals(result.points[0].warnings[0].code, "metric-unsupported");
  assertEquals(result.warnings[0].code, "metric-unsupported");
});

function gaugeMetric(name: string, unit: string, value: number): Metric {
  return {
    name,
    description: "",
    unit,
    data: {
      oneofKind: "gauge",
      gauge: {
        dataPoints: [{
          attributes: [],
          startTimeUnixNano: 0n,
          timeUnixNano: 100n,
          value: { oneofKind: "asDouble", asDouble: value },
        }],
      },
    },
  };
}

function sumMetric(name: string, unit: string, value: number, temporality: AggregationTemporality, monotonic: boolean): Metric {
  return {
    name,
    description: "",
    unit,
    data: {
      oneofKind: "sum",
      sum: {
        aggregationTemporality: temporality,
        isMonotonic: monotonic,
        dataPoints: [{
          attributes: [],
          startTimeUnixNano: 0n,
          timeUnixNano: 100n,
          value: { oneofKind: "asInt", asInt: BigInt(value) },
        }],
      },
    },
  };
}

function stringAttribute(key: string, value: string) {
  return { key, value: { value: { oneofKind: "stringValue" as const, stringValue: value } } };
}
```

- [ ] **Step 2: Run normalization tests to verify failure**

Run:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Expected: FAIL because `src/backend/normalize_metrics.ts` does not exist.

- [ ] **Step 3: Implement normalization**

Create `src/backend/normalize_metrics.ts`:

```ts
import {
  AggregationTemporality,
  type Histogram,
  type Metric,
  type NumberDataPoint,
  type ScopeMetrics,
} from "./otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";
import type { ExportMetricsServiceRequestMessage } from "./otel/decode.ts";
import {
  attributesFromKeyValues,
  buildSeriesKey,
  type MetricPoint,
  type MetricType,
  type MetricWarning,
  type PrimitiveAttributeValue,
  toNumberValue,
} from "./metric_model.ts";

export type NormalizeMetricsResult = {
  points: MetricPoint[];
  warnings: MetricWarning[];
};

export function normalizeMetricsExport(
  exportRequest: ExportMetricsServiceRequestMessage,
  observedAtMs: number,
): NormalizeMetricsResult {
  const points: MetricPoint[] = [];
  const warnings: MetricWarning[] = [];

  for (const resourceMetrics of exportRequest.resourceMetrics) {
    const resource = attributesFromKeyValues(resourceMetrics.resource?.attributes ?? []);

    for (const scopeMetrics of resourceMetrics.scopeMetrics) {
      for (const metric of scopeMetrics.metrics) {
        const metricPoints = normalizeMetric(metric, scopeMetrics, resource, observedAtMs);
        points.push(...metricPoints);
        for (const point of metricPoints) {
          warnings.push(...point.warnings);
        }
      }
    }
  }

  return { points, warnings };
}

function normalizeMetric(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
): MetricPoint[] {
  switch (metric.data.oneofKind) {
    case "gauge":
      return metric.data.gauge.dataPoints.map((dataPoint) =>
        numberPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint, "gauge")
      );
    case "sum":
      return metric.data.sum.dataPoints.map((dataPoint) =>
        numberPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint, "sum", {
          temporality: temporalityName(metric.data.sum.aggregationTemporality),
          monotonic: metric.data.sum.isMonotonic,
        })
      );
    case "histogram":
      return histogramPoints(metric, scopeMetrics, resource, observedAtMs, metric.data.histogram);
    case "summary":
      return [unsupportedPoint(metric, scopeMetrics, resource, observedAtMs, "summary")];
    case undefined:
      return [unsupportedPoint(metric, scopeMetrics, resource, observedAtMs, "unknown")];
  }
}

function numberPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  dataPoint: NumberDataPoint,
  metricType: "gauge" | "sum",
  metricOverrides: { temporality?: "delta" | "cumulative" | "unspecified"; monotonic?: boolean } = {},
): MetricPoint {
  const attributes = attributesFromKeyValues(dataPoint.attributes);
  const value = dataPoint.value.oneofKind === "asDouble"
    ? toNumberValue(dataPoint.value.asDouble)
    : dataPoint.value.oneofKind === "asInt"
    ? toNumberValue(dataPoint.value.asInt)
    : undefined;
  const warnings = value === undefined ? [{ code: "metric-value-missing", message: "Metric datapoint has no usable numeric value." }] : [];
  const status = value === undefined ? "incomplete" : "usable";

  return basePoint(metric, scopeMetrics, resource, observedAtMs, attributes, metricType, {
    timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
    startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
    value,
    metricOverrides,
    derivationStatus: status,
    warnings,
  });
}

function histogramPoints(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  histogram: Histogram,
): MetricPoint[] {
  return histogram.dataPoints.map((dataPoint) => {
    const attributes = attributesFromKeyValues(dataPoint.attributes);
    const count = toNumberValue(dataPoint.count);
    const bucketCounts = dataPoint.bucketCounts.map((bucketCount) => toNumberValue(bucketCount));
    const usableBuckets = bucketCounts.every((bucketCount) => bucketCount !== undefined) &&
      dataPoint.bucketCounts.length === dataPoint.explicitBounds.length + 1;
    const warnings = usableBuckets && count !== undefined
      ? []
      : [{ code: "histogram-incomplete", message: "Histogram datapoint cannot produce safe percentile estimates." }];

    return basePoint(metric, scopeMetrics, resource, observedAtMs, attributes, "histogram", {
      timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
      startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
      count,
      sum: Number.isFinite(dataPoint.sum) ? dataPoint.sum : undefined,
      buckets: usableBuckets
        ? bucketCounts.map((bucketCount, index) => ({
          upperBound: dataPoint.explicitBounds[index] ?? Number.POSITIVE_INFINITY,
          count: bucketCount!,
        }))
        : undefined,
      metricOverrides: { temporality: temporalityName(histogram.aggregationTemporality) },
      derivationStatus: usableBuckets && count !== undefined ? "usable" : "incomplete",
      warnings,
    });
  });
}

function unsupportedPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  metricType: MetricType,
): MetricPoint {
  const warning = { code: "metric-unsupported", message: "Metric type is retained but not yet used for derivations." };
  return basePoint(metric, scopeMetrics, resource, observedAtMs, {}, metricType, {
    derivationStatus: "unsupported",
    warnings: [warning],
  });
}

function basePoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  attributes: Record<string, PrimitiveAttributeValue>,
  metricType: MetricType,
  options: {
    timestampUnixNano?: string;
    startTimeUnixNano?: string;
    value?: number;
    count?: number;
    sum?: number;
    buckets?: Array<{ upperBound: number; count: number }>;
    metricOverrides?: { temporality?: "delta" | "cumulative" | "unspecified"; monotonic?: boolean };
    derivationStatus: "usable" | "unsupported" | "incomplete";
    warnings: MetricWarning[];
  },
): MetricPoint {
  const scope = {
    name: scopeMetrics.scope?.name || undefined,
    version: scopeMetrics.scope?.version || undefined,
  };
  const unit = metric.unit || undefined;
  const pointMetric = {
    name: metric.name,
    description: metric.description || undefined,
    unit,
    type: metricType,
    ...options.metricOverrides,
  };

  return {
    seriesKey: buildSeriesKey({
      resource,
      scope,
      metricName: metric.name,
      metricType,
      unit,
      attributes,
    }),
    observedAtMs,
    timestampUnixNano: options.timestampUnixNano,
    startTimeUnixNano: options.startTimeUnixNano,
    resource,
    scope,
    metric: pointMetric,
    attributes,
    value: options.value,
    count: options.count,
    sum: options.sum,
    buckets: options.buckets,
    derivationStatus: options.derivationStatus,
    warnings: options.warnings,
  };
}

function temporalityName(temporality: AggregationTemporality): "delta" | "cumulative" | "unspecified" {
  switch (temporality) {
    case AggregationTemporality.DELTA:
      return "delta";
    case AggregationTemporality.CUMULATIVE:
      return "cumulative";
    case AggregationTemporality.UNSPECIFIED:
      return "unspecified";
  }
}
```

- [ ] **Step 4: Run normalization tests to verify pass**

Run:

```powershell
deno test tests/backend/normalize_metrics_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```powershell
git add src/backend/normalize_metrics.ts tests/backend/normalize_metrics_test.ts
git commit -m "feat: normalize OTLP metric exports"
```

Expected: commit succeeds.

---

### Task 3: Bounded Telemetry Store

**Files:**
- Create: `tests/backend/telemetry_store_test.ts`
- Create: `src/backend/telemetry_store.ts`

**Interfaces:**
- Consumes:
  - `MetricPoint`, `MetricWarning` from `src/backend/metric_model.ts`
- Produces:
  - `type TelemetryStoreOptions = { maxPoints: number; maxExports: number }`
  - `type IngestExportMetadata = { observedAtMs: number; bytesReceived: number; pointCount: number }`
  - `type TelemetryStoreSnapshot`
  - `class TelemetryStore`
  - `createTelemetryStore(options?: Partial<TelemetryStoreOptions>): TelemetryStore`

- [ ] **Step 1: Write failing store tests**

Create `tests/backend/telemetry_store_test.ts`:

```ts
import { assertEquals } from "@std/assert";
import { createTelemetryStore } from "../../src/backend/telemetry_store.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";

Deno.test("TelemetryStore appends export metadata and retained points", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });

  store.recordExport({
    observedAtMs: 1_000,
    bytesReceived: 64,
    points: [point("http.server.request.count", 1_000, 2)],
    warnings: [],
  });

  const snapshot = store.snapshot();
  assertEquals(snapshot.totalExports, 1);
  assertEquals(snapshot.totalBytes, 64);
  assertEquals(snapshot.totalPoints, 1);
  assertEquals(snapshot.droppedPoints, 0);
  assertEquals(snapshot.recentPoints.length, 1);
  assertEquals(snapshot.exports.length, 1);
});

Deno.test("TelemetryStore evicts old points and counts dropped records", () => {
  const store = createTelemetryStore({ maxPoints: 2, maxExports: 5 });

  store.recordExport({ observedAtMs: 1_000, bytesReceived: 10, points: [point("a", 1_000, 1)], warnings: [] });
  store.recordExport({ observedAtMs: 2_000, bytesReceived: 10, points: [point("b", 2_000, 2)], warnings: [] });
  store.recordExport({ observedAtMs: 3_000, bytesReceived: 10, points: [point("c", 3_000, 3)], warnings: [] });

  const snapshot = store.snapshot();
  assertEquals(snapshot.totalPoints, 3);
  assertEquals(snapshot.droppedPoints, 1);
  assertEquals(snapshot.recentPoints.map((item) => item.metric.name), ["b", "c"]);
});

Deno.test("TelemetryStore exposes deterministic series list and selected series window", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });
  const first = point("http.server.duration", 1_000, 25, "series:duration");
  const second = point("http.server.duration", 2_000, 50, "series:duration");
  const third = point("queue.depth", 3_000, 7, "series:queue");

  store.recordExport({ observedAtMs: 1_000, bytesReceived: 10, points: [first, second, third], warnings: [] });

  assertEquals(store.seriesList().map((series) => series.seriesKey), ["series:duration", "series:queue"]);
  assertEquals(store.pointsForSeries("series:duration", 1_500, 2_500), [second]);
});

function point(name: string, observedAtMs: number, value: number, seriesKey = `series:${name}`): MetricPoint {
  return {
    seriesKey,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: {},
    metric: { name, type: "gauge" },
    attributes: {},
    value,
    derivationStatus: "usable",
    warnings: [],
  };
}
```

- [ ] **Step 2: Run store tests to verify failure**

Run:

```powershell
deno test tests/backend/telemetry_store_test.ts
```

Expected: FAIL because `src/backend/telemetry_store.ts` does not exist.

- [ ] **Step 3: Implement bounded store**

Create `src/backend/telemetry_store.ts`:

```ts
import type { MetricPoint, MetricWarning } from "./metric_model.ts";

export type TelemetryStoreOptions = {
  maxPoints: number;
  maxExports: number;
};

export type IngestExportMetadata = {
  observedAtMs: number;
  bytesReceived: number;
  pointCount: number;
  warningCount: number;
};

export type TelemetryStoreSnapshot = {
  totalExports: number;
  totalBytes: number;
  totalPoints: number;
  droppedPoints: number;
  recentPoints: MetricPoint[];
  exports: IngestExportMetadata[];
  warnings: MetricWarning[];
};

export type SeriesSummary = {
  seriesKey: string;
  metricName: string;
  metricType: string;
  unit?: string;
  resource: MetricPoint["resource"];
  attributes: MetricPoint["attributes"];
  lastObservedAtMs: number;
};

export class TelemetryStore {
  readonly options: TelemetryStoreOptions;
  #points: MetricPoint[] = [];
  #exports: IngestExportMetadata[] = [];
  #warnings: MetricWarning[] = [];
  #totalExports = 0;
  #totalBytes = 0;
  #totalPoints = 0;
  #droppedPoints = 0;

  constructor(options: TelemetryStoreOptions) {
    this.options = options;
  }

  recordExport(input: { observedAtMs: number; bytesReceived: number; points: MetricPoint[]; warnings: MetricWarning[] }): void {
    this.#totalExports += 1;
    this.#totalBytes += input.bytesReceived;
    this.#totalPoints += input.points.length;
    this.#points.push(...input.points);
    this.#exports.push({
      observedAtMs: input.observedAtMs,
      bytesReceived: input.bytesReceived,
      pointCount: input.points.length,
      warningCount: input.warnings.length,
    });
    this.#warnings.push(...input.warnings);
    this.#trim();
  }

  snapshot(): TelemetryStoreSnapshot {
    return {
      totalExports: this.#totalExports,
      totalBytes: this.#totalBytes,
      totalPoints: this.#totalPoints,
      droppedPoints: this.#droppedPoints,
      recentPoints: [...this.#points],
      exports: [...this.#exports],
      warnings: [...this.#warnings],
    };
  }

  seriesList(): SeriesSummary[] {
    const bySeries = new Map<string, SeriesSummary>();
    for (const point of this.#points) {
      bySeries.set(point.seriesKey, {
        seriesKey: point.seriesKey,
        metricName: point.metric.name,
        metricType: point.metric.type,
        unit: point.metric.unit,
        resource: point.resource,
        attributes: point.attributes,
        lastObservedAtMs: point.observedAtMs,
      });
    }

    return [...bySeries.values()].sort((left, right) => left.metricName.localeCompare(right.metricName));
  }

  pointsForSeries(seriesKey: string, fromObservedAtMs = Number.NEGATIVE_INFINITY, toObservedAtMs = Number.POSITIVE_INFINITY): MetricPoint[] {
    return this.#points.filter((point) =>
      point.seriesKey === seriesKey &&
      point.observedAtMs >= fromObservedAtMs &&
      point.observedAtMs <= toObservedAtMs
    );
  }

  #trim(): void {
    if (this.#points.length > this.options.maxPoints) {
      const dropCount = this.#points.length - this.options.maxPoints;
      this.#points.splice(0, dropCount);
      this.#droppedPoints += dropCount;
    }

    if (this.#exports.length > this.options.maxExports) {
      this.#exports.splice(0, this.#exports.length - this.options.maxExports);
    }

    if (this.#warnings.length > this.options.maxExports) {
      this.#warnings.splice(0, this.#warnings.length - this.options.maxExports);
    }
  }
}

export function createTelemetryStore(options: Partial<TelemetryStoreOptions> = {}): TelemetryStore {
  return new TelemetryStore({
    maxPoints: options.maxPoints ?? 10_000,
    maxExports: options.maxExports ?? 500,
  });
}
```

- [ ] **Step 4: Run store tests to verify pass**

Run:

```powershell
deno test tests/backend/telemetry_store_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add src/backend/telemetry_store.ts tests/backend/telemetry_store_test.ts
git commit -m "feat: add bounded telemetry store"
```

Expected: commit succeeds.

---

### Task 4: HTTP-Biased Metric Derivations

**Files:**
- Create: `tests/backend/metric_derivations_test.ts`
- Create: `src/backend/metric_derivations.ts`
- Modify: `src/backend/contracts.ts`

**Interfaces:**
- Consumes:
  - `TelemetryStoreSnapshot` from `src/backend/telemetry_store.ts`
  - `MetricPoint` from `src/backend/metric_model.ts`
  - `LiveTelemetrySummary` from `src/backend/contracts.ts`
- Produces:
  - extended `LiveTelemetrySummary["overview"]` fields
  - `deriveLiveTelemetrySummary(snapshot: TelemetryStoreSnapshot, startedAtMs: number, observedAtMs: number): LiveTelemetrySummary`

- [ ] **Step 1: Write failing derivation tests**

Create `tests/backend/metric_derivations_test.ts`:

```ts
import { assertEquals } from "@std/assert";
import { deriveLiveTelemetrySummary } from "../../src/backend/metric_derivations.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";
import type { TelemetryStoreSnapshot } from "../../src/backend/telemetry_store.ts";

Deno.test("deriveLiveTelemetrySummary computes ingest rates and dropped counts", () => {
  const summary = deriveLiveTelemetrySummary(snapshot([
    gauge("queue.depth", 2_000, 7),
    gauge("queue.depth", 3_000, 8),
  ], { totalExports: 2, totalBytes: 256, totalPoints: 2, droppedPoints: 1 }), 1_000, 3_000);

  assertEquals(summary.ingest.exportsPerSec, 1);
  assertEquals(summary.ingest.datapointsPerSec, 1);
  assertEquals(summary.ingest.bytesPerSec, 128);
  assertEquals(summary.ingest.dropped, 1);
});

Deno.test("deriveLiveTelemetrySummary computes HTTP request rate and error rate from semantic sums", () => {
  const summary = deriveLiveTelemetrySummary(snapshot([
    httpRequestCount(2_000, 8, 200),
    httpRequestCount(2_000, 2, 500),
  ], { totalExports: 1, totalBytes: 64, totalPoints: 2, droppedPoints: 0 }), 1_000, 3_000);

  assertEquals(summary.overview.requestRate, 5);
  assertEquals(summary.overview.errorRate, 0.2);
  assertEquals(summary.overview.topServices, ["checkout"]);
});

Deno.test("deriveLiveTelemetrySummary estimates p95 from usable HTTP histogram buckets", () => {
  const summary = deriveLiveTelemetrySummary(snapshot([
    {
      ...basePoint("http.server.duration", 2_000),
      metric: { name: "http.server.duration", type: "histogram", unit: "ms", temporality: "delta" },
      count: 10,
      sum: 120,
      buckets: [
        { upperBound: 50, count: 5 },
        { upperBound: 100, count: 4 },
        { upperBound: Number.POSITIVE_INFINITY, count: 1 },
      ],
    },
  ], { totalExports: 1, totalBytes: 64, totalPoints: 1, droppedPoints: 0 }), 1_000, 3_000);

  assertEquals(summary.overview.p95Ms, 100);
  assertEquals(summary.warnings, []);
});

Deno.test("deriveLiveTelemetrySummary reports unavailable overview data without guessing", () => {
  const summary = deriveLiveTelemetrySummary(snapshot([
    {
      ...basePoint("http.server.duration", 2_000),
      metric: { name: "http.server.duration", type: "histogram", unit: "ms", temporality: "delta" },
      derivationStatus: "incomplete",
      warnings: [{ code: "histogram-incomplete", message: "Histogram datapoint cannot produce safe percentile estimates." }],
    },
  ], { totalExports: 1, totalBytes: 64, totalPoints: 1, droppedPoints: 0 }), 1_000, 3_000);

  assertEquals(summary.overview.p95Ms, undefined);
  assertEquals(summary.warnings[0].code, "histogram-incomplete");
});

function snapshot(
  points: MetricPoint[],
  counters: { totalExports: number; totalBytes: number; totalPoints: number; droppedPoints: number },
): TelemetryStoreSnapshot {
  return {
    ...counters,
    recentPoints: points,
    exports: [],
    warnings: points.flatMap((point) => point.warnings),
  };
}

function gauge(name: string, observedAtMs: number, value: number): MetricPoint {
  return { ...basePoint(name, observedAtMs), value };
}

function httpRequestCount(observedAtMs: number, value: number, statusCode: number): MetricPoint {
  return {
    ...basePoint("http.server.request.count", observedAtMs),
    metric: { name: "http.server.request.count", type: "sum", unit: "1", temporality: "delta", monotonic: true },
    attributes: {
      "http.response.status_code": statusCode,
      "http.request.method": "GET",
      "http.route": "/cart",
    },
    value,
  };
}

function basePoint(name: string, observedAtMs: number): MetricPoint {
  return {
    seriesKey: `series:${name}:${observedAtMs}`,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: {},
    metric: { name, type: "gauge" },
    attributes: {},
    derivationStatus: "usable",
    warnings: [],
  };
}
```

- [ ] **Step 2: Run derivation tests to verify failure**

Run:

```powershell
deno test tests/backend/metric_derivations_test.ts
```

Expected: FAIL because `src/backend/metric_derivations.ts` does not exist and `LiveTelemetrySummary` lacks `topServices`.

- [ ] **Step 3: Extend summary contracts**

Modify `src/backend/contracts.ts` so the relevant type section is:

```ts
export type ReceiverFailureCategory =
  | "method-not-allowed"
  | "endpoint-unsupported"
  | "signal-unsupported"
  | "content-type-unsupported"
  | "payload-too-large"
  | "decode-failed"
  | "normalize-failed";

export type ReceiverWarning = {
  code: string;
  message: string;
};

export type LiveTelemetrySummary = {
  observedAtMs: number;
  receiver: { endpoint: string; live: boolean; paused: boolean };
  ingest: { exportsPerSec: number; datapointsPerSec: number; bytesPerSec: number; dropped: number };
  overview: {
    p95Ms?: number;
    errorRate?: number;
    activeRequests?: number;
    requestRate?: number;
    topServices: string[];
  };
  warnings: Array<ReceiverWarning>;
};
```

- [ ] **Step 4: Implement derivations**

Create `src/backend/metric_derivations.ts`:

```ts
import { LiveTelemetrySummary, RECEIVER_CONTRACT, receiverEndpoint } from "./contracts.ts";
import type { MetricPoint, PrimitiveAttributeValue } from "./metric_model.ts";
import type { TelemetryStoreSnapshot } from "./telemetry_store.ts";

export function deriveLiveTelemetrySummary(
  snapshot: TelemetryStoreSnapshot,
  startedAtMs: number,
  observedAtMs: number,
): LiveTelemetrySummary {
  const elapsedSeconds = Math.max((observedAtMs - startedAtMs) / 1000, 1);
  const requestCount = sumValues(snapshot.recentPoints.filter(isHttpRequestCount));
  const errorCount = sumValues(snapshot.recentPoints.filter((point) => isHttpRequestCount(point) && isErrorStatus(point)));

  return {
    observedAtMs,
    receiver: {
      endpoint: receiverEndpoint(RECEIVER_CONTRACT),
      live: true,
      paused: false,
    },
    ingest: {
      exportsPerSec: roundRate(snapshot.totalExports / elapsedSeconds),
      datapointsPerSec: roundRate(snapshot.totalPoints / elapsedSeconds),
      bytesPerSec: roundRate(snapshot.totalBytes / elapsedSeconds),
      dropped: snapshot.droppedPoints,
    },
    overview: {
      requestRate: requestCount > 0 ? roundRate(requestCount / elapsedSeconds) : undefined,
      errorRate: requestCount > 0 ? roundRate(errorCount / requestCount) : undefined,
      p95Ms: percentileFromHistograms(snapshot.recentPoints.filter(isHttpDurationHistogram), 0.95),
      topServices: topServices(snapshot.recentPoints),
    },
    warnings: snapshot.warnings,
  };
}

function isHttpRequestCount(point: MetricPoint): boolean {
  return point.metric.type === "sum" &&
    point.derivationStatus === "usable" &&
    point.value !== undefined &&
    (point.metric.name === "http.server.request.count" || point.metric.name === "http.server.requests");
}

function isHttpDurationHistogram(point: MetricPoint): boolean {
  return point.metric.type === "histogram" &&
    point.derivationStatus === "usable" &&
    point.buckets !== undefined &&
    (point.metric.name === "http.server.duration" || point.metric.name === "http.server.request.duration");
}

function isErrorStatus(point: MetricPoint): boolean {
  const status = attributeNumber(point.attributes["http.response.status_code"] ?? point.attributes["http.status_code"]);
  return status !== undefined && status >= 500;
}

function attributeNumber(value: PrimitiveAttributeValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sumValues(points: MetricPoint[]): number {
  return points.reduce((sum, point) => sum + (point.value ?? 0), 0);
}

function percentileFromHistograms(points: MetricPoint[], quantile: number): number | undefined {
  const buckets = new Map<number, number>();
  let totalCount = 0;

  for (const point of points) {
    for (const bucket of point.buckets ?? []) {
      buckets.set(bucket.upperBound, (buckets.get(bucket.upperBound) ?? 0) + bucket.count);
      totalCount += bucket.count;
    }
  }

  if (totalCount === 0) {
    return undefined;
  }

  const rank = Math.ceil(totalCount * quantile);
  let seen = 0;
  for (const [upperBound, count] of [...buckets.entries()].sort((left, right) => left[0] - right[0])) {
    seen += count;
    if (seen >= rank) {
      return Number.isFinite(upperBound) ? upperBound : undefined;
    }
  }

  return undefined;
}

function topServices(points: MetricPoint[]): string[] {
  const counts = new Map<string, number>();
  for (const point of points) {
    const serviceName = point.resource["service.name"];
    if (typeof serviceName === "string" && serviceName.length > 0) {
      counts.set(serviceName, (counts.get(serviceName) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([serviceName]) => serviceName);
}

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 5: Run derivation tests to verify pass**

Run:

```powershell
deno test tests/backend/metric_derivations_test.ts
```

Expected: PASS.

- [ ] **Step 6: Fix compile fallout from extended summary shape**

Run:

```powershell
deno task check
```

Expected before fixes: FAIL where existing summaries construct `overview` without `topServices` or where `ReceiverFailureCategory` switch statements lack `normalize-failed`.

Apply these targeted fixes:

- In `src/backend/live_bus.ts`, add `topServices: []` to the existing walking-skeleton `overview` object if Task 5 has not replaced summary building yet.
- In `src/backend/receiver.ts`, add this case to `safeFailureMessage`:

```ts
    case "normalize-failed":
      return "OTLP metrics payload could not be normalized safely.";
```

Run:

```powershell
deno task check
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git add src/backend/contracts.ts src/backend/metric_derivations.ts src/backend/live_bus.ts src/backend/receiver.ts tests/backend/metric_derivations_test.ts
git commit -m "feat: derive live telemetry summaries"
```

Expected: commit succeeds.

---

### Task 5: Wire Store And Normalization Into Live Bus

**Files:**
- Create: `tests/backend/live_bus_substrate_test.ts`
- Modify: `src/backend/live_bus.ts`

**Interfaces:**
- Consumes:
  - `TelemetryStore`, `createTelemetryStore` from `src/backend/telemetry_store.ts`
  - `normalizeMetricsExport` from `src/backend/normalize_metrics.ts`
  - `deriveLiveTelemetrySummary` from `src/backend/metric_derivations.ts`
  - `ExportMetricsServiceRequestMessage` from `src/backend/otel/decode.ts`
- Produces:
  - `type ReceiverState = { startedAtMs: number; store: TelemetryStore; failureCounts: Record<ReceiverFailureCategory, number>; lastWarning?: ReceiverWarning }`
  - `buildReceiverState(startedAtMs?: number): ReceiverState`
  - `recordReceiverExport(state: ReceiverState, input: number | { exportRequest: ExportMetricsServiceRequestMessage; bytesReceived: number; observedAtMs?: number }): void`
  - `recordReceiverFailure(...)`
  - `buildLiveTelemetrySummary(...)`

- [ ] **Step 1: Write failing live bus substrate tests**

Create `tests/backend/live_bus_substrate_test.ts`:

```ts
import { assertEquals } from "@std/assert";
import {
  buildLiveTelemetrySummary,
  buildReceiverState,
  recordReceiverExport,
  recordReceiverFailure,
} from "../../src/backend/live_bus.ts";
import { AggregationTemporality } from "../../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";

Deno.test("recordReceiverExport normalizes decoded exports into live summary data", () => {
  const state = buildReceiverState(1_000);

  recordReceiverExport(state, {
    exportRequest: {
      resourceMetrics: [{
        resource: {
          attributes: [{ key: "service.name", value: { value: { oneofKind: "stringValue", stringValue: "checkout" } } }],
          droppedAttributesCount: 0,
        },
        scopeMetrics: [{
          scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
          schemaUrl: "",
          metrics: [{
            name: "http.server.request.count",
            description: "",
            unit: "1",
            data: {
              oneofKind: "sum",
              sum: {
                aggregationTemporality: AggregationTemporality.DELTA,
                isMonotonic: true,
                dataPoints: [{
                  attributes: [
                    { key: "http.response.status_code", value: { value: { oneofKind: "intValue", intValue: 200n } } },
                  ],
                  startTimeUnixNano: 0n,
                  timeUnixNano: 10n,
                  value: { oneofKind: "asInt", asInt: 4n },
                }],
              },
            },
          }],
        }],
        schemaUrl: "",
      }],
    },
    bytesReceived: 128,
    observedAtMs: 2_000,
  });

  const summary = buildLiveTelemetrySummary(state, 3_000);

  assertEquals(summary.ingest.exportsPerSec, 0.5);
  assertEquals(summary.ingest.datapointsPerSec, 0.5);
  assertEquals(summary.ingest.bytesPerSec, 64);
  assertEquals(summary.overview.requestRate, 2);
  assertEquals(summary.overview.errorRate, 0);
  assertEquals(summary.overview.topServices, ["checkout"]);
});

Deno.test("buildLiveTelemetrySummary keeps receiver failures ahead of substrate warnings", () => {
  const state = buildReceiverState(1_000);

  recordReceiverFailure(state, "decode-failed", "OTLP protobuf payload could not be decoded safely.");

  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(summary.warnings[0], {
    code: "decode-failed",
    message: "OTLP protobuf payload could not be decoded safely.",
  });
});
```

- [ ] **Step 2: Run live bus substrate tests to verify failure**

Run:

```powershell
deno test tests/backend/live_bus_substrate_test.ts
```

Expected: FAIL because `recordReceiverExport` still accepts only a byte count and the state has no substrate store.

- [ ] **Step 3: Replace live bus state with substrate-backed state while preserving the old receiver call**

Modify `src/backend/live_bus.ts` to this shape:

```ts
import {
  LiveTelemetrySummary,
  RECEIVER_CONTRACT,
  receiverEndpoint,
  ReceiverFailureCategory,
  ReceiverWarning,
} from "./contracts.ts";
import type { ExportMetricsServiceRequestMessage } from "./otel/decode.ts";
import { deriveLiveTelemetrySummary } from "./metric_derivations.ts";
import { normalizeMetricsExport } from "./normalize_metrics.ts";
import { createTelemetryStore, TelemetryStore } from "./telemetry_store.ts";

export type ReceiverState = {
  startedAtMs: number;
  store: TelemetryStore;
  failureCounts: Record<ReceiverFailureCategory, number>;
  lastWarning?: ReceiverWarning;
};

export function buildReceiverState(startedAtMs = Date.now()): ReceiverState {
  return {
    startedAtMs,
    store: createTelemetryStore(),
    failureCounts: {
      "method-not-allowed": 0,
      "endpoint-unsupported": 0,
      "signal-unsupported": 0,
      "content-type-unsupported": 0,
      "payload-too-large": 0,
      "decode-failed": 0,
      "normalize-failed": 0,
    },
  };
}

export function recordReceiverFailure(
  state: ReceiverState,
  category: ReceiverFailureCategory,
  message: string,
): void {
  state.failureCounts[category] += 1;
  state.lastWarning = { code: category, message };
}

export function recordReceiverExport(
  state: ReceiverState,
  input: number | { exportRequest: ExportMetricsServiceRequestMessage; bytesReceived: number; observedAtMs?: number },
): void {
  if (typeof input === "number") {
    state.store.recordExport({
      observedAtMs: Date.now(),
      bytesReceived: input,
      points: [],
      warnings: [],
    });
    delete state.lastWarning;
    return;
  }

  const observedAtMs = input.observedAtMs ?? Date.now();
  const normalized = normalizeMetricsExport(input.exportRequest, observedAtMs);
  state.store.recordExport({
    observedAtMs,
    bytesReceived: input.bytesReceived,
    points: normalized.points,
    warnings: normalized.warnings,
  });
  delete state.lastWarning;
}

export function buildLiveTelemetrySummary(
  state: ReceiverState,
  observedAtMs = Date.now(),
): LiveTelemetrySummary {
  const summary = deriveLiveTelemetrySummary(state.store.snapshot(), state.startedAtMs, observedAtMs);
  const warnings = state.lastWarning ? [state.lastWarning, ...summary.warnings] : summary.warnings;

  return {
    ...summary,
    receiver: {
      endpoint: receiverEndpoint(RECEIVER_CONTRACT),
      live: true,
      paused: false,
    },
    warnings,
  };
}
```

- [ ] **Step 4: Run live bus substrate tests to verify pass**

Run:

```powershell
deno test tests/backend/live_bus_substrate_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```powershell
git add src/backend/live_bus.ts tests/backend/live_bus_substrate_test.ts
git commit -m "feat: back receiver state with telemetry store"
```

Expected: commit succeeds.

---

### Task 6: Receiver Integration And Safe Normalize Failures

**Files:**
- Modify: `src/backend/receiver.ts`
- Modify: `tests/backend/receiver_contract_test.ts`
- Modify: `tests/ui/app_html_test.ts`
- Modify: `tests/backend/app_server_test.ts`

**Interfaces:**
- Consumes:
  - `recordReceiverExport(state, { exportRequest, bytesReceived })` from `src/backend/live_bus.ts`
  - `decodeMetricsExportRequest(payload)` from `src/backend/otel/decode.ts`
- Produces:
  - Receiver success path that decodes once, normalizes through live bus, and returns protobuf response.
  - Safe `normalize-failed` handling for unexpected substrate errors.

- [ ] **Step 1: Add regression test for safe normalize failure**

Modify the existing `POST /v1/metrics with valid protobuf records successful export` test in `tests/backend/receiver_contract_test.ts` so its assertions include:

```ts
  assertEquals(summary.ingest.exportsPerSec, 1);
  assertEquals(summary.ingest.datapointsPerSec, 0);
  assertEquals(summary.ingest.bytesPerSec, payload.byteLength);
  assertEquals(summary.ingest.dropped, 0);
  assertEquals(summary.overview.topServices, []);
  assertEquals(summary.warnings, []);
```

Then add this safe normalization failure test after the malformed protobuf test:

```ts
Deno.test("POST /v1/metrics normalization failures stay safe", async () => {
  const payload = await Deno.readFile("fixtures/otlp/valid-minimal-metrics.bin");
  const state = buildReceiverState(1_000);
  const originalRecordExport = state.store.recordExport.bind(state.store);
  state.store.recordExport = () => {
    throw new Error("secret raw normalization failure");
  };

  try {
    const response = await handleReceiverRequest(
      request("/v1/metrics", {
        method: "POST",
        headers: { "content-type": RECEIVER_CONTRACT.contentType },
        body: toBody(payload),
      }),
      state,
    );
    const body = await readFailure(response);

    assertEquals(response.status, 400);
    assertEquals(body["category"], "normalize-failed");
    assertEquals(body["message"], "OTLP metrics payload could not be normalized safely.");
    assertEquals(JSON.stringify(body).includes("secret"), false);
  } finally {
    state.store.recordExport = originalRecordExport;
  }
});
```

- [ ] **Step 2: Add HTTP metrics receiver integration test**

Add this test to `tests/backend/receiver_contract_test.ts`:

```ts
Deno.test("POST /v1/metrics with HTTP metrics updates datapoints and overview", async () => {
  const payload = httpMetricsExport();
  const state = buildReceiverState(1_000);
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: toBody(payload),
    }),
    state,
  );
  const summary = buildLiveTelemetrySummary(state, 3_000);

  assertEquals(response.status, 200);
  assertEquals(summary.ingest.exportsPerSec, 0.5);
  assertEquals(summary.ingest.datapointsPerSec, 1);
  assertEquals(summary.overview.requestRate, 5);
  assertEquals(summary.overview.errorRate, 0.2);
  assertEquals(summary.overview.p95Ms, 100);
  assertEquals(summary.overview.topServices, ["checkout"]);
});
```

Add these helpers near the existing protobuf helper functions:

```ts
function httpMetricsExport(): Uint8Array {
  const requestCount = metricField(0x3a, [
    stringField(0x0a, "http.server.request.count"),
    stringField(0x1a, "1"),
    sumField([
      numberDataPoint(10, 20, 8n, [
        stringAttributeBytes("http.request.method", "GET"),
        stringAttributeBytes("http.route", "/cart"),
        intAttributeBytes("http.response.status_code", 200n),
      ]),
      numberDataPoint(10, 20, 2n, [
        stringAttributeBytes("http.request.method", "GET"),
        stringAttributeBytes("http.route", "/cart"),
        intAttributeBytes("http.response.status_code", 500n),
      ]),
    ]),
  ]);
  const duration = metricField(0x4a, [
    stringField(0x0a, "http.server.duration"),
    stringField(0x1a, "ms"),
    histogramField(histogramDataPoint()),
  ]);
  const scopeMetrics = bytes(0x12, concat(requestCount, duration));
  const resource = bytes(0x0a, stringAttributeBytes("service.name", "checkout"));
  const resourceMetrics = bytes(0x0a, concat(resource, scopeMetrics));

  return bytes(0x0a, resourceMetrics);
}

function metricField(tag: number, fields: Uint8Array[]): Uint8Array {
  return bytes(tag, concat(...fields));
}

function sumField(dataPoints: Uint8Array[]): Uint8Array {
  return bytes(0x3a, concat(...dataPoints, new Uint8Array([0x10, 0x01, 0x18, 0x01])));
}

function numberDataPoint(start: number, time: number, value: bigint, attributes: Uint8Array[]): Uint8Array {
  return bytes(0x0a, concat(
    ...attributes,
    fixed64Field(0x11, BigInt(start)),
    fixed64Field(0x19, BigInt(time)),
    fixed64Field(0x31, value),
  ));
}

function histogramField(dataPoint: Uint8Array): Uint8Array {
  return bytes(0x4a, concat(dataPoint, new Uint8Array([0x10, 0x01])));
}

function histogramDataPoint(): Uint8Array {
  return bytes(0x0a, concat(
    stringAttributeBytes("http.request.method", "GET"),
    stringAttributeBytes("http.route", "/cart"),
    fixed64Field(0x11, 10n),
    fixed64Field(0x19, 20n),
    fixed64Field(0x21, 10n),
    doubleField(0x29, 120),
    new Uint8Array([0x31, 0x05, 0x31, 0x04, 0x31, 0x01]),
    doubleField(0x39, 50),
    doubleField(0x39, 100),
  ));
}

function stringAttributeBytes(key: string, value: string): Uint8Array {
  return bytes(0x0a, concat(
    stringField(0x0a, key),
    bytes(0x12, stringField(0x0a, value)),
  ));
}

function intAttributeBytes(key: string, value: bigint): Uint8Array {
  return bytes(0x0a, concat(
    stringField(0x0a, key),
    bytes(0x12, varintField(0x18, value)),
  ));
}

function stringField(tag: number, value: string): Uint8Array {
  return bytes(tag, new TextEncoder().encode(value));
}

function varintField(tag: number, value: bigint): Uint8Array {
  const encoded = [];
  let current = value;
  while (current >= 0x80n) {
    encoded.push(Number((current & 0x7fn) | 0x80n));
    current >>= 7n;
  }
  encoded.push(Number(current));
  return new Uint8Array([tag, ...encoded]);
}

function doubleField(tag: number, value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, true);
  return new Uint8Array([tag, ...bytes]);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}
```

- [ ] **Step 3: Run receiver tests to verify failure**

Run:

```powershell
deno task receiver:test
```

Expected: FAIL because `receiver.ts` still calls `recordReceiverExport(state, payloadRead.payload.byteLength)`.

- [ ] **Step 4: Wire decoded export into live bus**

Modify the decode and success section in `src/backend/receiver.ts` to:

```ts
  let exportRequest;
  try {
    if (payloadRead.payload.byteLength === 0) {
      throw new Error("empty protobuf payload");
    }

    exportRequest = decodeMetricsExportRequest(payloadRead.payload);
  } catch {
    return failureResponse(
      state,
      400,
      "decode-failed",
      request,
      path,
      payloadRead.payload.byteLength,
      "Send a valid ExportMetricsServiceRequest protobuf body.",
    );
  }

  try {
    recordReceiverExport(state, { exportRequest, bytesReceived: payloadRead.payload.byteLength });
  } catch {
    return failureResponse(
      state,
      400,
      "normalize-failed",
      request,
      path,
      payloadRead.payload.byteLength,
      "Send a valid metrics export with normalizable metric datapoints.",
    );
  }

  return new Response(toResponseBody(encodeMetricsExportResponse()), {
```

Ensure `safeFailureMessage` includes:

```ts
    case "normalize-failed":
      return "OTLP metrics payload could not be normalized safely.";
```

- [ ] **Step 5: Run focused receiver tests**

Run:

```powershell
deno task receiver:test
```

Expected: PASS.

- [ ] **Step 6: Run backend test suite**

Run:

```powershell
deno test --allow-read=fixtures --allow-net=127.0.0.1:4318 tests/backend
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

Run:

```powershell
git add src/backend/receiver.ts src/backend/live_bus.ts tests/backend/receiver_contract_test.ts tests/backend/app_server_test.ts tests/ui/app_html_test.ts
git commit -m "feat: ingest normalized metrics through receiver"
```

Expected: commit succeeds.

---

### Task 7: Live Bus Cadence Contract

**Files:**
- Create: `tests/backend/live_bus_cadence_test.ts`
- Modify: `src/backend/live_bus.ts`

**Interfaces:**
- Consumes:
  - `ReceiverState`
  - `buildLiveTelemetrySummary`
- Produces:
  - `type LiveBusCadence = { minIntervalMs: number; lastPublishedAtMs?: number; lastSummary?: LiveTelemetrySummary }`
  - `createLiveBusCadence(minIntervalMs?: number): LiveBusCadence`
  - `maybeBuildLiveTelemetrySummary(state: ReceiverState, cadence: LiveBusCadence, observedAtMs?: number): LiveTelemetrySummary | undefined`

- [ ] **Step 1: Write failing cadence tests**

Create `tests/backend/live_bus_cadence_test.ts`:

```ts
import { assertEquals } from "@std/assert";
import {
  buildReceiverState,
  createLiveBusCadence,
  maybeBuildLiveTelemetrySummary,
} from "../../src/backend/live_bus.ts";

Deno.test("maybeBuildLiveTelemetrySummary emits first summary immediately", () => {
  const state = buildReceiverState(1_000);
  const cadence = createLiveBusCadence(500);

  const summary = maybeBuildLiveTelemetrySummary(state, cadence, 1_000);

  assertEquals(summary?.observedAtMs, 1_000);
  assertEquals(cadence.lastPublishedAtMs, 1_000);
});

Deno.test("maybeBuildLiveTelemetrySummary suppresses summaries inside cadence window", () => {
  const state = buildReceiverState(1_000);
  const cadence = createLiveBusCadence(500);

  maybeBuildLiveTelemetrySummary(state, cadence, 1_000);
  const suppressed = maybeBuildLiveTelemetrySummary(state, cadence, 1_250);
  const emitted = maybeBuildLiveTelemetrySummary(state, cadence, 1_500);

  assertEquals(suppressed, undefined);
  assertEquals(emitted?.observedAtMs, 1_500);
});
```

- [ ] **Step 2: Run cadence tests to verify failure**

Run:

```powershell
deno test tests/backend/live_bus_cadence_test.ts
```

Expected: FAIL because cadence helpers do not exist.

- [ ] **Step 3: Add cadence helpers**

Append this code to `src/backend/live_bus.ts`:

```ts
export type LiveBusCadence = {
  minIntervalMs: number;
  lastPublishedAtMs?: number;
  lastSummary?: LiveTelemetrySummary;
};

export function createLiveBusCadence(minIntervalMs = 250): LiveBusCadence {
  return { minIntervalMs };
}

export function maybeBuildLiveTelemetrySummary(
  state: ReceiverState,
  cadence: LiveBusCadence,
  observedAtMs = Date.now(),
): LiveTelemetrySummary | undefined {
  if (
    cadence.lastPublishedAtMs !== undefined &&
    observedAtMs - cadence.lastPublishedAtMs < cadence.minIntervalMs
  ) {
    return undefined;
  }

  const summary = buildLiveTelemetrySummary(state, observedAtMs);
  cadence.lastPublishedAtMs = observedAtMs;
  cadence.lastSummary = summary;
  return summary;
}
```

- [ ] **Step 4: Run cadence tests to verify pass**

Run:

```powershell
deno test tests/backend/live_bus_cadence_test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 7**

Run:

```powershell
git add src/backend/live_bus.ts tests/backend/live_bus_cadence_test.ts
git commit -m "feat: add live summary cadence"
```

Expected: commit succeeds.

---

### Task 8: Docs, DOX, And Final Verification

**Files:**
- Modify: `src/backend/AGENTS.md`
- Modify: `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
- Modify: `docs/plans/02-runtime-architecture/03-reactive-live-bus.md`
- Modify: `docs/plans/04-implementation/03-ingest-pipeline.md`
- Modify: `docs/plans/04-implementation/04-api-and-event-contracts.md`

**Interfaces:**
- Consumes: implementation from Tasks 1-7.
- Produces: durable docs aligned with the executable substrate contract.

- [ ] **Step 1: Update backend DOX**

Modify `src/backend/AGENTS.md` so these sections reflect the new substrate ownership:

```md
## Ownership

- `contracts.ts` defines receiver/public telemetry types.
- `metric_model.ts` owns normalized metric point contracts and stable series keys.
- `normalize_metrics.ts` owns decoded OTLP metrics to normalized point conversion.
- `telemetry_store.ts` owns bounded in-memory point/export retention and eviction accounting.
- `metric_derivations.ts` owns dashboard-ready summary derivations from retained points.
- `receiver.ts` owns OTLP HTTP request validation and safe failure responses.
- `live_bus.ts` owns receiver state, substrate ingestion, and live summary cadence.
- `app_server.ts` serves the dashboard shell and summary API on the dashboard port.
- `receiver_worker.ts` keeps Deno HTTP servers off the synchronous native webview thread.

## Local Contracts

- Receiver listens on `127.0.0.1:4318` and accepts only `POST /v1/metrics` with `application/x-protobuf`.
- Dashboard app server listens on `127.0.0.1:4319`.
- Payload size limit is `4 MiB`; enforce it before buffering beyond the cap.
- Empty metrics protobuf bodies are decode failures, not successful empty exports.
- Decode failures are failures, not successful exports.
- Normalization failures are safe `normalize-failed` receiver failures.
- Successful exports append normalized points to bounded memory and update dropped-point accounting.
- Safe failures must not echo request bodies, raw attributes, credentials, or raw decoder errors.
```

- [ ] **Step 2: Update durable planning docs**

Apply these specific doc updates:

- In `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`, add the implemented module names under retention and note that `MetricPoint` uses string-safe timestamps and deterministic `seriesKey`.
- In `docs/plans/02-runtime-architecture/03-reactive-live-bus.md`, note the initial cadence helper name `maybeBuildLiveTelemetrySummary` and the default `250ms` interval.
- In `docs/plans/04-implementation/03-ingest-pipeline.md`, add `normalize-failed` to the failure classes and state that valid decoded exports append to `TelemetryStore`.
- In `docs/plans/04-implementation/04-api-and-event-contracts.md`, update `LiveTelemetrySummary.overview` to include `topServices: string[]`.

- [ ] **Step 3: Run focused substrate tests**

Run:

```powershell
deno test tests/backend/metric_model_test.ts tests/backend/normalize_metrics_test.ts tests/backend/telemetry_store_test.ts tests/backend/metric_derivations_test.ts tests/backend/live_bus_cadence_test.ts
```

Expected: PASS.

- [ ] **Step 4: Regenerate fixtures and proto output**

Run:

```powershell
deno task proto:gen
deno task fixtures
git status --short
```

Expected: generated proto output and fixtures remain unchanged. If they change, inspect the diff and commit deterministic generated changes with the docs only when they are expected.

- [ ] **Step 5: Run full quality gate**

Run:

```powershell
deno task ok
```

Expected: PASS.

- [ ] **Step 6: Commit Task 8**

Run:

```powershell
git add src/backend/AGENTS.md docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md docs/plans/02-runtime-architecture/03-reactive-live-bus.md docs/plans/04-implementation/03-ingest-pipeline.md docs/plans/04-implementation/04-api-and-event-contracts.md
git commit -m "docs: document telemetry substrate contracts"
```

Expected: commit succeeds.

---

## Final Closeout

- [ ] Run `git status --short` and confirm the worktree is clean.
- [ ] Run `deno task ok` after the final commit when Step 4 reports generated or fixture changes.
- [ ] Run `repowise update` after the implementation branch is complete so future agents see the new substrate map.
- [ ] Summarize the implemented substrate, tests run, docs updated, and any intentional deferrals: M3 UI, payload inspector, SQLite persistence, traces/logs, and proxy mode.
