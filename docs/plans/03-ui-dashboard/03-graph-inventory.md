---
project: otel-inspector-dashboard
title: "Graph Inventory"
type: ui-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Graph Inventory

| Need | Graph | MVP |
|---|---|---|
| Latency p50/p95/p99 | `LineChart` | P0 |
| Request throughput | `AreaChart` | P0 |
| Error rate over throughput | `ComposedChart` | P0 |
| Status classes | stacked `BarChart` | P0 if attributes present |
| Active requests | `LineChart` | P0 if metric present |
| Ingest bytes/points per sec | `AreaChart` | P0 |
| Dropped point ratio | `RadialBarChart` or KPI | P0 |
| Top routes/resources | sorted `BarChart` + table | P0 |
| Metric cardinality | sorted `BarChart` | P0.5 |
| Outliers by route/status | `ScatterChart` | P1 |
| Signal mix | tiny radial/bar | P1 |
| Service map | custom graph | P2 |
| Trace waterfall | custom timeline | P1/P2 |

## Chart rules

- Label estimate vs exact values.
- Show unavailable state when required metric is absent.
- Surface aggregation window.
- Make every point drillable to metric series and decoded payload context.
- Avoid pie charts unless the categories are tiny and obvious. Pie charts: occasionally useful, frequently tiny circular lies.
