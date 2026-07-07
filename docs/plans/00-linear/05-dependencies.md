---
project: otel-inspector-dashboard
title: "Dependency Spine"
type: linear-dependencies
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---
# Dependency Spine

Hard dependencies only. Use `Related` for cross-references that do not block execution.

| Upstream issue | Blocks downstream issue | Why |
|---|---|---|
| `OI-001` Establish Linear project packet and source-of-truth split | `OI-002` Define OTLP receiver v0 contract | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-001` Establish Linear project packet and source-of-truth split | `OI-003` Scaffold Deno desktop shell and UI/backend bridge | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-002` Define OTLP receiver v0 contract | `OI-004` Generate OTLP protobuf TypeScript types | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-002` Define OTLP receiver v0 contract | `OI-005` Implement POST /v1/metrics receiver | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-004` Generate OTLP protobuf TypeScript types | `OI-005` Implement POST /v1/metrics receiver | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-005` Implement POST /v1/metrics receiver | `OI-006` Normalize ResourceMetrics into metric series records | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-006` Normalize ResourceMetrics into metric series records | `OI-007` Implement bounded ingest ring buffer | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-005` Implement POST /v1/metrics receiver | `OI-008` Add ingest failure and partial success model | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-006` Normalize ResourceMetrics into metric series records | `OI-009` Build metric derivation engine | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-007` Implement bounded ingest ring buffer | `OI-009` Build metric derivation engine | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-009` Build metric derivation engine | `OI-010` Estimate histogram percentiles safely | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-009` Build metric derivation engine | `OI-011` Add HTTP semantic metric presets | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-007` Implement bounded ingest ring buffer | `OI-012` Implement live bus batching and downsampling | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-009` Build metric derivation engine | `OI-012` Implement live bus batching and downsampling | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-011` Add HTTP semantic metric presets | `OI-013` Design and implement Overview cards | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-012` Implement live bus batching and downsampling | `OI-013` Design and implement Overview cards | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-010` Estimate histogram percentiles safely | `OI-014` Implement live charts for latency, throughput, errors, and ingest health | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-011` Add HTTP semantic metric presets | `OI-014` Implement live charts for latency, throughput, errors, and ingest health | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-012` Implement live bus batching and downsampling | `OI-014` Implement live charts for latency, throughput, errors, and ingest health | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-009` Build metric derivation engine | `OI-015` Implement Metrics Explorer table and filters | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-012` Implement live bus batching and downsampling | `OI-015` Implement Metrics Explorer table and filters | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-006` Normalize ResourceMetrics into metric series records | `OI-016` Implement decoded Payload Inspector | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-018` Implement redaction and sensitive attribute policy | `OI-016` Implement decoded Payload Inspector | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-012` Implement live bus batching and downsampling | `OI-017` Add pause/resume/clear controls | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-013` Design and implement Overview cards | `OI-017` Add pause/resume/clear controls | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-008` Add ingest failure and partial success model | `OI-018` Implement redaction and sensitive attribute policy | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-018` Implement redaction and sensitive attribute policy | `OI-019` Make raw payload capture explicit opt-in | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-016` Implement decoded Payload Inspector | `OI-020` Export redacted debug fixtures | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-018` Implement redaction and sensitive attribute policy | `OI-020` Export redacted debug fixtures | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-007` Implement bounded ingest ring buffer | `OI-021` Persist optional session history to SQLite | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-018` Implement redaction and sensitive attribute policy | `OI-021` Persist optional session history to SQLite | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-005` Implement POST /v1/metrics receiver | `OI-022` Add proxy-forward mode design spike | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-018` Implement redaction and sensitive attribute policy | `OI-022` Add proxy-forward mode design spike | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-001` Establish Linear project packet and source-of-truth split | `OI-023` Scaffold traces tab as P1 placeholder | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-003` Scaffold Deno desktop shell and UI/backend bridge | `OI-023` Scaffold traces tab as P1 placeholder | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-001` Establish Linear project packet and source-of-truth split | `OI-024` Scaffold logs tab as P1 placeholder | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-003` Scaffold Deno desktop shell and UI/backend bridge | `OI-024` Scaffold logs tab as P1 placeholder | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-003` Scaffold Deno desktop shell and UI/backend bridge | `OI-025` Package Deno desktop dogfood build | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-013` Design and implement Overview cards | `OI-025` Package Deno desktop dogfood build | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-014` Implement live charts for latency, throughput, errors, and ingest health | `OI-025` Package Deno desktop dogfood build | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-015` Implement Metrics Explorer table and filters | `OI-025` Package Deno desktop dogfood build | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-016` Implement decoded Payload Inspector | `OI-025` Package Deno desktop dogfood build | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-020` Export redacted debug fixtures | `OI-026` Assemble acceptance evidence bundle | Downstream needs schema/data/fixture/state from upstream before it can be correct. |
| `OI-025` Package Deno desktop dogfood build | `OI-026` Assemble acceptance evidence bundle | Downstream needs schema/data/fixture/state from upstream before it can be correct. |

## Review rule

At each milestone checkpoint, ask whether each dependency is still a hard blocker or can become `Related`. Remove stale blockers quickly.
