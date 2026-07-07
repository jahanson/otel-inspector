---
project: otel-inspector-dashboard
title: "Product Brief"
type: product-brief
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Product Brief: OTEL Inspector and Dashboard

## Executive summary

**OTEL Inspector and Dashboard** is a local-first Deno desktop inspector that receives OTLP HTTP/protobuf telemetry from a nearby app and renders a live shadcn dashboard for metrics, payload inspection, and redacted debugging.

It should feel like DevTools for telemetry: a side panel that answers what the app is doing now, what changed, what broke, and which decoded OTLP payload proves it.

## Core promise

> Make app telemetry inspectable enough to trust and debuggable enough to improve, without requiring a cloud backend or leaking raw payloads by default.

## Beachhead users

- Local-first app builders instrumenting Deno/TypeScript apps.
- Mabel runtime contributors who need fixture-quality runtime evidence.
- Developers debugging HTTP metrics, latency spikes, route errors, dropped points, and instrumentation mistakes.
- Tool builders who want a lightweight observability cockpit next to their app.

## MVP wedge

Metrics-first OTLP receiver + live dashboard:

```text
Instrumented app → OTLP HTTP/protobuf POST /v1/metrics → local receiver → normalized store → live dashboard → payload inspector → redacted fixture
```

## Why now

Deno desktop makes a local desktop inspector plausible without Electron-shaped ceremony, while OTLP gives a standard telemetry wire format. The product value is not raw charting. The value is click-to-explain: every chart point can drill back to the telemetry source that produced it.
