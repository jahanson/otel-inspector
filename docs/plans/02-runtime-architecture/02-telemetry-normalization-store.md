---
project: otel-inspector-dashboard
title: "Telemetry Normalization Store"
type: runtime-spec
status: implemented
created: 2026-07-05
updated: 2026-07-08
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Telemetry Normalization Store

## Series key

```ts
type MetricSeriesKey = {
  resourceHash: string;
  scopeHash: string;
  metricName: string;
  metricType: 'gauge' | 'sum' | 'histogram' | 'exponential_histogram' | 'summary' | 'unknown';
  attributesHash: string;
};
```

## Normalized point

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

Implemented in `src/backend/metric_model.ts`, where `MetricPoint` keeps OTLP timestamps as string-safe nanosecond values and derives a deterministic `seriesKey`.

Exponential histogram datapoints are retained as typed normalized records once
the local proto/codegen surface exposes the OTLP oneof arm, but percentile
derivation remains unavailable until a separate safe derivation design lands.
Datapoints with inconsistent or unsafe bucket metadata stay normalized as
`incomplete` records without retained exponential bucket details.

## Derived summaries

- latest value
- rate per second
- delta over time window
- p50/p95/p99 from histograms where valid
- dropped/evicted points
- ingest payloads/sec
- ingest bytes/sec
- top resources/services/routes
- cardinality by metric/resource/attribute

## Retention

P0: in-memory bounded retention.

Implemented by `src/backend/telemetry_store.ts` for bounded point/export retention and `src/backend/metric_derivations.ts` for dashboard-ready summaries over retained points.

P1: optional SQLite session history with explicit retention and clear/delete controls.
