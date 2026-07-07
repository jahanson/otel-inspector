---
project: otel-inspector-dashboard
title: "Linear Project"
type: linear-project
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
target_date: 2026-08-14
---

# OTEL Inspector and Dashboard MVP

## Summary

Build a local-first **Deno desktop OTEL Inspector** that receives OTLP HTTP/protobuf metrics on localhost, normalizes them into a live telemetry substrate, and renders a shadcn-powered side inspector/dashboard for app health, metric exploration, payload inspection, and redacted debug fixtures.

## Product frame

The product is an inspector that pops up beside an app. It is not a generic Grafana replacement. It is a local developer cockpit: compact by default, inspectable on demand, safe with payloads, and designed to explain which telemetry facts drive each dashboard view.

## Goal

Ship a dogfoodable metrics-first desktop inspector by **2026-08-14**.

## First success moment

> I run the inspector beside my app, receive OTLP metrics over `/v1/metrics`, see live latency/throughput/error signals, click a spike, inspect the decoded payload source, and export a redacted fixture.

## Scope

### P0 dogfood

- Deno desktop shell with backend receiver and shadcn UI.
- OTLP HTTP/protobuf metrics receiver for `POST /v1/metrics`.
- Protobuf decode, normalization, bounded in-memory telemetry store.
- Live bus with batching/downsampling.
- Overview dashboard, Metrics Explorer, Payload Inspector.
- Safe redaction, raw capture opt-in, redacted fixture export.
- Acceptance fixtures, UI snapshots, redaction tests, packaging notes.

### P1 follow-on

- `/v1/traces` and trace waterfall.
- `/v1/logs` and log viewer.
- Proxy-forward mode to upstream collector.
- SQLite retention and saved sessions.
- Local alert rules.
- Multi-app sessions.

## Non-goals

- Replacing full observability platforms.
- Accepting traces/logs in the MVP receiver.
- Persisting raw protobuf payloads by default.
- Sending telemetry to external services.
- Building production-grade distributed tracing in P0.
- Hiding decode/redaction failures behind pretty graphs.

## Milestones

- **M0: Project frame + receiver contract** — 2026-07-10
- **M1: OTLP metrics receiver walking skeleton** — 2026-07-17
- **M2: Reactive telemetry substrate** — 2026-07-24
- **M3: Docked inspector dashboard** — 2026-07-31
- **M4: Safe payload inspect + debug fixtures** — 2026-08-07
- **M5: Dogfood packaging + acceptance evidence** — 2026-08-14

## Exit criteria

- P0 commands/features are implemented or intentionally cut.
- Fixture suite covers valid ingest, malformed payloads, redaction, derivation, empty states, and degraded states.
- Dogfood build exists and packaging posture is documented.
- Remaining P1 traces/logs/proxy work is filed as follow-on, not hidden.
- Durable decisions are promoted to ADRs or project-library docs.
