---
project: otel-inspector-dashboard
title: "UX North Star"
type: ui-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# UX North Star

> The inspector should feel like DevTools for telemetry: calm by default, live when useful, and exact when the user asks why.

## Modes

### Docked inspector

A right-side sidecar panel, 420–720px wide, for live diagnosis while the app runs.

### Full dashboard

Expanded window/route for deep exploration, payload inspection, fixtures, settings, and future traces/logs.

## Core UX rules

1. Latency/error health first, collector ingest health second.
2. Every chart point can explain its source.
3. Degraded and empty states are first-class.
4. Redaction status is visible, not buried.
5. Raw payload capture is opt-in.
6. Pause is not stop; it freezes the view while receiver state remains honest.
