# Substrate Unblocker Design

## Status

- Approved for implementation planning.
- Date: 2026-07-08.
- Scope: immediate backend substrate unblocker before M3 dashboard UI work.

## Goal

Restore a clean verification baseline, reconcile durable docs with the implemented
receiver/substrate contracts, and add typed exponential histogram normalization
support so the dashboard UI can build on a current backend contract.

This slice is intentionally not a dashboard implementation. It prepares the
backend and docs for that work.

## Non-Goals

- Do not build Overview cards, live charts, Metrics Explorer filters, or
  pause/resume/clear controls.
- Do not implement the Payload Inspector, redaction policy, raw capture opt-in,
  redacted fixture export, SQLite session history, traces, logs, or proxy mode.
- Do not attempt certification-grade exponential histogram percentile math.
- Do not persist raw protobuf request bodies.
- Do not hand-edit generated files under `src/backend/otel/proto/`.

## Problem Summary

The current backend substrate is mostly implemented, but three issues block a
clean handoff to UI work:

1. `deno task ok` fails at `deno fmt --check` because `.codex/hooks.json` has
   working-tree CRLF line endings while the index expects LF.
2. Several durable docs still describe implemented substrate pieces as
   proposed-draft or omit newer contract details such as `normalize-failed`,
   `TelemetryStore`, and live summary cadence.
3. Exponential histogram support was intentionally deferred because the current
   local OTLP metrics proto surface does not expose an exponential histogram
   oneof arm.

The implementation should resolve these in order: verification baseline,
documentation reconciliation, then exponential histogram substrate support.

## Architecture

The data flow remains:

```text
tools/proto schema
-> deno task proto:gen
-> generated backend-only bindings
-> receiver decode
-> normalizeMetricsExport
-> TelemetryStore
-> LiveTelemetrySummary
```

The receiver stays responsible for HTTP method/path/content-type checks, payload
size limits, protobuf decode, and safe failure responses. The substrate owns
normalized metric records, bounded retention, derived summaries, and warnings.

## Components

### Quality Gate Baseline

Normalize `.codex/hooks.json` line endings so Deno format checks match the Git
index. This should be treated as repo hygiene and should not change hook
behavior.

Verification for this part:

```powershell
deno fmt --check .codex/hooks.json
```

### Contract Reconciliation

Update only the closest durable docs that describe already-implemented behavior
or the newly added exponential histogram contract.

Docs expected to be in scope:

- `docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md`
- `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
- `docs/plans/02-runtime-architecture/03-reactive-live-bus.md`
- `docs/plans/04-implementation/03-ingest-pipeline.md`
- `docs/plans/04-implementation/04-api-and-event-contracts.md`
- `docs/plans/04-implementation/05-test-plan.md`
- `docs/plans/06-evidence/acceptance-matrix.md`
- `docs/plans/06-evidence/dogfood-checklist.md`
- `docs/plans/05-linear-issues/OI-006.md` if the exponential histogram
  follow-up changes the closeout claim.

The docs should say what is implemented and what remains pending. They must not
claim M3 dashboard UI, payload inspect, redaction, raw capture, fixture export,
or packaging work is complete.

### Proto And Codegen

Extend the local metrics schema under:

```text
tools/proto/opentelemetry/proto/metrics/v1/metrics.proto
```

Add the minimal OTLP exponential histogram message surface needed for metrics
exports and normalizer tests. Keep the schema deterministic and local; generation
must not download schemas at runtime.

Regenerate bindings with:

```powershell
deno task proto:gen
```

Generated output under `src/backend/otel/proto/` must come only from this task.

### Normalization

`src/backend/metric_model.ts` already includes
`MetricType = "exponential_histogram"`. Preserve that public contract and extend
`MetricPoint` only if the current shape cannot safely retain required
exponential histogram metadata.

`src/backend/normalize_metrics.ts` should add a branch for the generated
`exponentialHistogram` oneof arm. Each safe datapoint should produce a retained
`MetricPoint` with:

- `metric.type: "exponential_histogram"`
- resource, scope, metric name, description, unit, and datapoint attributes
- string-safe timestamps
- count, sum, and zero-count metadata where safely representable
- positive and negative bucket summaries if the selected representation supports
  them without lossy or unsafe coercion
- `derivationStatus` set to `unsupported` or `incomplete` unless a separate
  safe derivation design makes it usable
- warnings that explain unavailable derivations without exposing raw payloads
  or sensitive values

The normalizer should not fail a whole export solely because an exponential
histogram cannot feed dashboard percentile derivations yet. Retain safe metadata
and warnings instead.

## Error Handling

- Malformed protobuf remains `decode-failed`.
- Unexpected substrate exceptions remain safe `normalize-failed`.
- Unsupported or incomplete exponential histogram datapoints should create
  warnings and retained points where possible.
- Failure responses and docs must not echo request bodies, raw decoder errors,
  credentials, or raw sensitive attribute values.

## Verification

The implementation plan should require these gates:

```powershell
deno fmt --check .codex/hooks.json
deno task proto:gen
deno test tests/backend/normalize_metrics_test.ts
deno task receiver:test
deno task ok
git status --short
```

Focused normalization tests should prove:

- exponential histogram proto bindings expose the generated oneof arm;
- a safe exponential histogram datapoint is retained as a typed
  `exponential_histogram` point;
- incomplete or unsupported exponential histogram data produces safe warnings;
- existing gauge, sum, histogram, summary, receiver, and live summary behavior
  still passes.

After implementation is complete, run `repowise update` if refreshed indexed
context is needed for follow-on UI work.

## Handoff To UI Work

This spec unblocks but does not start M3 dashboard implementation. The next
design/plan after this slice should cover Overview cards, live charts, Metrics
Explorer filters, and pause/resume/clear controls against the reconciled
`LiveTelemetrySummary` and normalized substrate contracts.

