---
project: otel-inspector-dashboard
title: "Protobuf Codegen"
type: implementation-plan
status: implemented
created: 2026-07-05
updated: 2026-07-07
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Protobuf Codegen

## Goal

Generate or vendor TypeScript bindings for OTLP metric export requests and responses.

## Acceptance

- Codegen is deterministic.
- Fixture payloads decode in tests.
- Generated code is isolated under a clear path.
- Unknown fields do not crash normalization.
- No UI code imports protobuf types directly.

## Candidate paths

```text
src/backend/otel/proto/
src/backend/otel/decode.ts
src/backend/otel/normalize.ts
```

## Implemented paths

```text
tools/proto/opentelemetry/proto/
tools/generate_proto.ts
src/backend/otel/proto/
src/backend/otel/decode.ts
```

Run `deno task proto:gen` to regenerate checked-in TypeScript bindings from
the local proto inputs.

## Boundary

Generated protobuf code is backend-only. UI code must consume normalized
contracts such as `LiveTelemetrySummary` and must not import from
`src/backend/otel/proto/`.

## First handoff fixture

`fixtures/otlp/malformed-protobuf.bin` is intentionally invalid and should keep
exercising the safe `decode-failed` path after real OTLP decoding is added.

`fixtures/otlp/valid-minimal-metrics.bin` is a deterministic valid
`ExportMetricsServiceRequest` used by receiver tests to prove successful decode
and export accounting.
