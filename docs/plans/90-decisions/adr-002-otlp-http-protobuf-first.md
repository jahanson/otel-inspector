---
project: otel-inspector-dashboard
title: "ADR-002 OTLP HTTP Protobuf First"
type: adr
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# ADR-002: Metrics-first OTLP HTTP/protobuf receiver

## Decision

The MVP accepts **OTLP metrics over HTTP/protobuf** at `/v1/metrics`. Traces and logs are P1 placeholders.

## Rationale

Metrics provide the fastest useful live dashboard loop: latency, throughput, errors, active requests, ingest health, and dropped points. Supporting every signal in P0 would widen the substrate before the dashboard proves value.

## Consequences

- `/v1/traces` and `/v1/logs` return unsupported/P1 state.
- The normalizer and dashboard are metrics-first.
- Trace waterfall/log viewer work is kept as follow-on.
