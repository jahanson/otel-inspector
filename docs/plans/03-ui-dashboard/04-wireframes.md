---
project: otel-inspector-dashboard
title: "Wireframes"
type: ui-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Wireframes

## Overview tab

```text
[Header: OTEL Inspector | Live | localhost:4318 | pts/sec | dropped]
[Tabs: Overview Metrics Payload Traces Logs Settings]

[KPI: p95] [KPI: err%] [KPI: req/s]
[KPI: active] [KPI: ingest] [KPI: dropped]

[LineChart: p50/p95/p99 latency]
[AreaChart: throughput]
[ComposedChart: req/s + error rate]
[Table: top resources/routes]
```

## Metric detail drawer

```text
Metric: http.server.request.duration
Type: histogram
Unit: s
Temporality: cumulative | delta | unknown
Percentiles: bucket-derived

[Chart]
[Series table split by attributes]
[Decoded source exports]
[Redaction status]
```

## Payload tab

```text
Export history
- exp_001  22KB  3 resources  18 metrics  412 datapoints  redacted

Decoded tree
ResourceMetrics
  Resource attrs
  ScopeMetrics
    Scope attrs
    Metric
      DataPoints table
```
