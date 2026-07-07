---
project: otel-inspector-dashboard
title: "Reactive Live Bus"
type: runtime-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-07
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Reactive Live Bus

## Purpose

The live bus prevents the UI from rerendering on every datapoint.

## Flow

```text
receiver ingest event
→ normalized store append
→ derivation queue marks dirty windows
→ live bus emits summary every 250–1000ms
→ UI updates charts/cards/tables
```

The initial cadence helper is `maybeBuildLiveTelemetrySummary` in `src/backend/live_bus.ts`, with a default `250ms` minimum summary interval.

## Controls

- Live / Paused.
- Time window: 1m / 5m / 15m / 1h.
- Resolution: raw / 1s / 5s / 30s.
- Service/resource filter.
- Metric filter.
- Attribute filter.

## Degraded states

- Backpressure.
- Dropping points.
- Stale UI snapshot.
- Downsampled view.
- Receiver live but dashboard paused.
