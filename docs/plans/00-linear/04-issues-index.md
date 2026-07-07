---
project: otel-inspector-dashboard
title: "Issues Index"
type: linear-issues-index
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---
# Issues Index

| ID | Title | Milestone | Type | Labels | Blocked by |
|---|---|---|---|---|---|
| `OI-001` | Establish Linear project packet and source-of-truth split | M0 | docs | p0-dogfood,docs | — |
| `OI-002` | Define OTLP receiver v0 contract | M0 | implementation | otel,provider-contract | OI-001 |
| `OI-003` | Scaffold Deno desktop shell and UI/backend bridge | M1 | implementation | deno-desktop,p0-dogfood | OI-001 |
| `OI-004` | Generate OTLP protobuf TypeScript types | M1 | implementation | otel,protobuf | OI-002 |
| `OI-005` | Implement POST /v1/metrics receiver | M1 | implementation | otel,p0-dogfood | OI-002, OI-004 |
| `OI-006` | Normalize ResourceMetrics into metric series records | M1 | implementation | telemetry-store | OI-005 |
| `OI-007` | Implement bounded ingest ring buffer | M2 | implementation | telemetry-store,p0-dogfood | OI-006 |
| `OI-008` | Add ingest failure and partial success model | M1 | implementation | inspectability,regression | OI-005 |
| `OI-009` | Build metric derivation engine | M2 | implementation | metrics,regression | OI-006, OI-007 |
| `OI-010` | Estimate histogram percentiles safely | M2 | implementation | metrics,p1-certification | OI-009 |
| `OI-011` | Add HTTP semantic metric presets | M2 | implementation | otel,http-metrics | OI-009 |
| `OI-012` | Implement live bus batching and downsampling | M2 | implementation | reactive-ui,performance | OI-007, OI-009 |
| `OI-013` | Design and implement Overview cards | M3 | implementation | shadcn,ui | OI-011, OI-012 |
| `OI-014` | Implement live charts for latency, throughput, errors, and ingest health | M3 | implementation | graphs,ui | OI-010, OI-011, OI-012 |
| `OI-015` | Implement Metrics Explorer table and filters | M3 | implementation | shadcn,data-table | OI-009, OI-012 |
| `OI-016` | Implement decoded Payload Inspector | M4 | implementation | inspectability,payload | OI-006, OI-018 |
| `OI-017` | Add pause/resume/clear controls | M3 | implementation | ui,p0-dogfood | OI-012, OI-013 |
| `OI-018` | Implement redaction and sensitive attribute policy | M4 | implementation | privacy,inspectability | OI-008 |
| `OI-019` | Make raw payload capture explicit opt-in | M4 | implementation | privacy,debuggability | OI-018 |
| `OI-020` | Export redacted debug fixtures | M4 | evidence | debuggability,regression | OI-016, OI-018 |
| `OI-021` | Persist optional session history to SQLite | M5 | implementation | persistence,p1-certification | OI-007, OI-018 |
| `OI-022` | Add proxy-forward mode design spike | M5 | decision | proxy,adr | OI-005, OI-018 |
| `OI-023` | Scaffold traces tab as P1 placeholder | M5 | implementation | traces,p1-certification | OI-001, OI-003 |
| `OI-024` | Scaffold logs tab as P1 placeholder | M5 | implementation | logs,p1-certification | OI-001, OI-003 |
| `OI-025` | Package Deno desktop dogfood build | M5 | implementation | deno-desktop,p0-dogfood | OI-003, OI-013, OI-014, OI-015, OI-016 |
| `OI-026` | Assemble acceptance evidence bundle | M5 | evidence | evidence,certification | OI-020, OI-025 |
