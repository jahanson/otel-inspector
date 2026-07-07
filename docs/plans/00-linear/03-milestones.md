---
project: otel-inspector-dashboard
title: "Milestones"
type: linear-milestones
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---
# Milestones

## M0 — Project frame + receiver contract

**Target:** 2026-07-10

**Goal:** Lock the Linear/project shape, source-of-truth split, OTLP receiver scope, and dogfood success criteria before implementation sprawl begins.

**Acceptance criteria:**

- Project packet, PRD draft, issue map, dependency spine, labels/views, and status template exist.
- OTLP receiver v0 is explicitly metrics-first and supports /v1/metrics over HTTP/protobuf.
- P1 traces/logs/proxy features are named but not allowed to inflate MVP.

**Issues:**

- `OI-001` — Establish Linear project packet and source-of-truth split
- `OI-002` — Define OTLP receiver v0 contract

## M1 — OTLP metrics receiver walking skeleton

**Target:** 2026-07-17

**Goal:** Prove the end-to-end ingest spine from local OTLP HTTP/protobuf request to normalized metric summaries and safe failure records.

**Acceptance criteria:**

- Deno backend listens on localhost for POST /v1/metrics.
- Valid protobuf metric exports decode into ResourceMetrics → ScopeMetrics → Metric → DataPoint records.
- Bad content type, malformed protobuf, oversize payloads, and decode failures produce visible safe failures.

**Issues:**

- `OI-003` — Scaffold Deno desktop shell and UI/backend bridge
- `OI-004` — Generate OTLP protobuf TypeScript types
- `OI-005` — Implement POST /v1/metrics receiver
- `OI-006` — Normalize ResourceMetrics into metric series records
- `OI-008` — Add ingest failure and partial success model

## M2 — Reactive telemetry substrate

**Target:** 2026-07-24

**Goal:** Build the live in-memory substrate that dashboards project instead of parsing raw OTLP trees directly.

**Acceptance criteria:**

- Normalized metric store supports bounded retention and ring-buffer eviction accounting.
- Derived metric engine computes latest, rate, deltas, and histogram percentile estimates where possible.
- Live bus batches updates so UI never rerenders per datapoint.

**Issues:**

- `OI-007` — Implement bounded ingest ring buffer
- `OI-009` — Build metric derivation engine
- `OI-010` — Estimate histogram percentiles safely
- `OI-011` — Add HTTP semantic metric presets
- `OI-012` — Implement live bus batching and downsampling

## M3 — Docked inspector dashboard

**Target:** 2026-07-31

**Goal:** Ship the side-panel inspector UX with overview cards, charts, explorer, filters, pause/resume, and clear empty/degraded states.

**Acceptance criteria:**

- Docked Sheet/ResizablePanel inspector can attach beside the app and expand to full dashboard mode.
- Overview renders latency, throughput, error, active request, ingest, and dropped-point state.
- Metrics Explorer can filter by service/resource/metric/attribute and open metric detail.

**Issues:**

- `OI-013` — Design and implement Overview cards
- `OI-014` — Implement live charts for latency, throughput, errors, and ingest health
- `OI-015` — Implement Metrics Explorer table and filters
- `OI-017` — Add pause/resume/clear controls

## M4 — Safe payload inspect + debug fixtures

**Target:** 2026-08-07

**Goal:** Make raw telemetry inspectable enough to trust and debuggable enough to improve, without turning payloads into secret soup.

**Acceptance criteria:**

- Payload Inspector traces every dashboard point back to decoded resource/scope/metric/datapoint context.
- Redaction policy hides sensitive attributes and reports what was hidden.
- Redacted fixture export exists for ingest, decode, high-cardinality, redaction, and chart-derivation failures.

**Issues:**

- `OI-016` — Implement decoded Payload Inspector
- `OI-018` — Implement redaction and sensitive attribute policy
- `OI-019` — Make raw payload capture explicit opt-in
- `OI-020` — Export redacted debug fixtures

## M5 — Dogfood packaging + acceptance evidence

**Target:** 2026-08-14

**Goal:** Package the Deno desktop app for local dogfood and assemble the evidence bundle that proves the MVP claims.

**Acceptance criteria:**

- Deno desktop build runs with explicit network/file permissions and documented localhost receiver posture.
- Golden fixtures, UI snapshots, redaction tests, and acceptance matrix are current.
- Project can close or promote follow-on traces/logs/proxy work without hiding unfinished MVP evidence.

**Issues:**

- `OI-021` — Persist optional session history to SQLite
- `OI-022` — Add proxy-forward mode design spike
- `OI-023` — Scaffold traces tab as P1 placeholder
- `OI-024` — Scaffold logs tab as P1 placeholder
- `OI-025` — Package Deno desktop dogfood build
- `OI-026` — Assemble acceptance evidence bundle
