---
project: otel-inspector-dashboard
title: "Telemetry Normalization Store"
type: runtime-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-07
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
type MetricPoint = {
  seriesKey: string;
  timestampUnixNano?: string;
  observedAtMs: number;
  name: string;
  unit?: string;
  type: string;
  value?: number;
  count?: number;
  sum?: number;
  buckets?: Array<{ upperBound: number; count: number }>;
  attributes: Record<string, string | number | boolean>;
  resource: Record<string, unknown>;
  scope: { name?: string; version?: string };
  redactionStatus: 'safe' | 'redacted' | 'withheld';
};
```

Implemented in `src/backend/metric_model.ts`, where `MetricPoint` keeps OTLP timestamps as string-safe nanosecond values and derives a deterministic `seriesKey`.

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
