---
project: otel-inspector-dashboard
title: "Runtime Architecture Overview"
type: architecture
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Runtime Architecture Overview

## Shape

```text
Instrumented app
  ↓ OTLP HTTP/protobuf POST /v1/metrics
Deno desktop backend receiver
  ↓ decode + normalize
Bounded telemetry store
  ↓ live summaries over app channel
React + shadcn dashboard
```

## Runtime layers

| Layer | Owns | Must not own |
|---|---|---|
| Receiver | HTTP endpoint, content type validation, payload size limits, protobuf decode | Chart derivations |
| Normalizer | Resource/scope/metric/datapoint traversal, series keys, metadata | Raw UI rendering |
| Store | Retention, eviction, latest points, export history metadata | Privacy bypasses |
| Derivation engine | Rates, deltas, percentile estimates, aggregates, cardinality | Protobuf decode |
| Live bus | Batching, downsampling, pause/resume stream state | Raw payload retention |
| UI | Dashboard projections, filters, drilldowns, empty/degraded states | Runtime truth creation |
| Redaction | Sensitive attribute policy, report generation, fixture safety | Silent raw capture |

## Key design rule

Commands and UI project substrate truth. They do not invent it. A chart should always be able to say which metric series, datapoints, aggregation, and payload/export produced it.
