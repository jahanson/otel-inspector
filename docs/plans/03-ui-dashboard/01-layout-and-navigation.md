---
project: otel-inspector-dashboard
title: "Layout and Navigation"
type: ui-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Layout and Navigation

## Docked layout

```text
┌──────────────────────────────────────────────┐
│ OTEL Inspector      ● Live   localhost:4318  │
│ 1.2k pts/s   dropped 0   last export 84ms    │
├──────────────────────────────────────────────┤
│ Overview | Metrics | Payload | Settings      │
├──────────────────────────────────────────────┤
│ p95 latency      error rate     active reqs  │
│ 184ms            0.8%           12           │
├──────────────────────────────────────────────┤
│ Latency over time                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
├──────────────────────────────────────────────┤
│ Top routes/resources                          │
│ GET /api/chat      p95 212ms   2.1k req      │
│ POST /tools/run    p95 481ms   128 req       │
├──────────────────────────────────────────────┤
│ Latest OTLP payload                           │
│ resource → scope → metric → datapoints        │
└──────────────────────────────────────────────┘
```

## Top navigation

- Overview
- Metrics
- Payload
- Traces (P1 placeholder)
- Logs (P1 placeholder)
- Settings

## Header controls

- Live / Paused
- Time window
- Service/resource selector
- Clear session
- Export fixture
- Expand dashboard
