---
project: otel-inspector-dashboard
title: "Non-goals"
type: non-goals
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Non-goals

## MVP non-goals

- Full distributed tracing.
- Log ingestion.
- Cloud sync.
- Hosted dashboards.
- Authentication/multi-user team mode.
- Raw payload storage by default.
- OTLP/gRPC support.
- Upstream collector proxy mode.
- Long-term analytics retention.
- Automatic instrumentation setup for every framework.

## Why these are excluded

The MVP must prove the local metrics ingest → normalization → live dashboard → safe payload inspect → fixture export loop. Breadth comes after trust. Cut provider/signal breadth before cutting inspectability, redaction, or evidence.
