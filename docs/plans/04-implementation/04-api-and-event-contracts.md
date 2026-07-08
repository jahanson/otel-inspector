---
project: otel-inspector-dashboard
title: "API and Event Contracts"
type: implementation-plan
status: implemented
created: 2026-07-05
updated: 2026-07-08
source_method: LINEAR_METHOD_v2.md
owner: user
---

# API and Event Contracts

## Live summary event

```ts
type LiveTelemetrySummary = {
  observedAtMs: number;
  receiver: { endpoint: string; live: boolean; paused: boolean };
  ingest: { exportsPerSec: number; datapointsPerSec: number; bytesPerSec: number; dropped: number };
  overview: { p95Ms?: number; errorRate?: number; activeRequests?: number; requestRate?: number; topServices: string[] };
  warnings: Array<{ code: string; message: string }>;
};
```

This summary is implemented by `src/backend/metric_derivations.ts` and served by
`src/backend/app_server.ts` at `/api/summary`. M3 UI controls and chart-specific
projection contracts are still pending.

## Metric detail request

```ts
type MetricDetailRequest = {
  metricName: string;
  resourceHash?: string;
  attributesHash?: string;
  windowMs: number;
};
```

## Payload inspect request

```ts
type PayloadInspectRequest = {
  exportId: string;
  mode: 'safe' | 'redacted-debug';
};
```

## Fixture export request

```ts
type FixtureExportRequest = {
  source: 'last-export' | 'last-failure' | 'selected-chart-point';
  redaction: 'required';
  includeRawPayload: false;
};
```
