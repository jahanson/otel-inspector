---
project: otel-inspector-dashboard
title: "PRD"
type: prd-draft
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# OTEL Inspector and Dashboard PRD v0.1

## Summary

Build a **Deno desktop** side inspector that receives local OTLP HTTP/protobuf metric exports and renders a live shadcn dashboard. The MVP focuses on metrics, not traces/logs. It should be calm by default, inspectable on demand, and safe with sensitive telemetry attributes.

## User success

A user succeeds when they can:

1. Start the desktop inspector.
2. Point an instrumented app at `http://localhost:<port>/v1/metrics`.
3. See live ingest state and app health within seconds.
4. Inspect latency, throughput, error, active request, and ingest health graphs.
5. Search metric series by service, resource, metric, and attributes.
6. Click from a graph point into the decoded OTLP payload source.
7. Export a redacted fixture for a failing or surprising telemetry case.

## MVP scope

- Deno desktop app shell.
- Local OTLP metrics receiver.
- Protobuf decode and normalization.
- In-memory bounded telemetry store.
- Live reactive bus with batching/downsampling.
- Overview dashboard.
- Metrics Explorer.
- Payload Inspector.
- Safe redaction and raw capture opt-in.
- Fixture export.
- Dogfood evidence bundle.

## Functional requirements

### FR1 — Receiver

The app must expose `POST /v1/metrics` locally and accept protobuf-encoded OTLP metric export requests. It must reject unsupported methods, paths, content types, malformed payloads, and oversize payloads with explicit safe failures.

### FR2 — Decode and normalize

The receiver must decode resource/scope/metric/datapoint structure into a normalized series store. The UI must not parse raw OTLP payload trees directly.

### FR3 — Derived metrics

The substrate must derive latest value, rates, deltas, percentiles where valid, dropped points, ingest bytes/sec, and top series/cardinality signals.

### FR4 — Live dashboard

The UI must render an Overview, Metrics Explorer, and Payload Inspector. Charts should update reactively without rerendering per datapoint.

### FR5 — Safe payload inspection

Payload inspection must default to decoded summaries and redacted attributes. Raw protobuf capture is disabled unless explicitly enabled.

### FR6 — Fixture export

Users must be able to export a redacted fixture with enough metadata to reproduce decode, derivation, redaction, or chart issues.

## Nonfunctional requirements

- Local-first by default.
- No external telemetry forwarding in MVP.
- Redaction by default.
- Bounded memory.
- Visible dropped/evicted point accounting.
- Degraded states instead of silent blank charts.
- Test fixtures for receiver, decode, derivation, UI states, and redaction.

## Non-goals

- Full Grafana replacement.
- Traces/logs MVP support.
- Cloud storage or shared dashboards.
- Raw payload storage by default.
- Proxy-forward mode in MVP.

## Release label

Use **Dogfood MVP** until the acceptance evidence in `06-evidence/acceptance-matrix.md` is complete.
