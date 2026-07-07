# OTLP Metrics Decode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend-only OTLP protobuf decode so valid metrics exports are accepted while malformed payloads still fail safely.

**Architecture:** Vendor the minimal OTLP metrics proto inputs under tooling, generate TypeScript bindings under backend-only source, and keep receiver decoding behind `src/backend/otel/decode.ts`. The receiver records successful exports only after protobuf decode succeeds and returns an empty protobuf `ExportMetricsServiceResponse`.

**Tech Stack:** Deno TypeScript, `@protobuf-ts/runtime@2.11.1`, `@protobuf-ts/protoc@2.11.1`, `@protobuf-ts/plugin@2.11.1`, Deno tests with `@std/assert`.

## Global Constraints

- Follow the DOX chain before editing and run the DOX closeout pass.
- Generated OTLP protobuf types must stay out of UI modules.
- `/v1/metrics` remains the only accepted OTLP signal path.
- Payload size limit remains `4 MiB`.
- Safe failures must not echo request bodies, decoded attributes, credentials, or raw decoder errors.
- No raw OTLP bodies are persisted or exposed by default.
- Use TDD for receiver behavior changes.

---

### Task 1: Receiver Success Contract

**Files:**
- Modify: `tests/backend/receiver_contract_test.ts`

**Interfaces:**
- Consumes: `handleReceiverRequest(request, state)` and `buildLiveTelemetrySummary(state, observedAtMs)`.
- Produces: A failing contract test proving valid protobuf metrics payloads must return `200`.

- [ ] **Step 1: Add failing test**

Add a test that posts the minimal valid protobuf body `new Uint8Array([10, 0])`, which represents one empty `resource_metrics` entry in `ExportMetricsServiceRequest`.

- [ ] **Step 2: Run focused test**

Run: `deno task receiver:test`

Expected before implementation: the new test fails because the receiver still returns `400 decode-failed`.

### Task 2: Backend-Only Protobuf Bindings

**Files:**
- Create: `tools/proto/opentelemetry/proto/collector/metrics/v1/metrics_service.proto`
- Create: `tools/proto/opentelemetry/proto/metrics/v1/metrics.proto`
- Create: `tools/proto/opentelemetry/proto/resource/v1/resource.proto`
- Create: `tools/proto/opentelemetry/proto/common/v1/common.proto`
- Create: `tools/generate_proto.ts`
- Modify: `deno.json`
- Generate: `src/backend/otel/proto/**/*.ts`

**Interfaces:**
- Produces: `deno task proto:gen`, generated `ExportMetricsServiceRequest`, and generated `ExportMetricsServiceResponse`.

- [ ] **Step 1: Add minimal OTLP proto inputs**

Vendor only the messages required to decode metrics request envelopes and encode response envelopes.

- [ ] **Step 2: Add deterministic codegen wrapper**

Create `tools/generate_proto.ts` that runs `@protobuf-ts/protoc` with a temporary `protoc-gen-ts` launcher and writes generated files to `src/backend/otel/proto/`.

- [ ] **Step 3: Add task and import mapping**

Add `proto:gen` to `deno.json` and map `@protobuf-ts/runtime` to `npm:@protobuf-ts/runtime@2.11.1`.

- [ ] **Step 4: Generate bindings**

Run: `deno task proto:gen`

Expected: generated TypeScript appears under `src/backend/otel/proto/`.

### Task 3: Decode Boundary and Receiver Success

**Files:**
- Create: `src/backend/otel/decode.ts`
- Modify: `src/backend/receiver.ts`

**Interfaces:**
- Produces: `decodeMetricsExportRequest(payload: Uint8Array): ExportMetricsServiceRequest`.

- [ ] **Step 1: Add decode wrapper**

Decode with `ExportMetricsServiceRequest.fromBinary(payload)` and let caller classify all thrown errors safely.

- [ ] **Step 2: Wire receiver success path**

After payload read succeeds, decode the payload. On decode success, call `recordReceiverExport(state, payloadRead.payload.byteLength)` and return `ExportMetricsServiceResponse.toBinary({})` with `content-type: application/x-protobuf`.

- [ ] **Step 3: Run focused test**

Run: `deno task receiver:test`

Expected: receiver contract tests pass.

### Task 4: Deterministic Fixture Generation

**Files:**
- Modify: `tools/write_fixtures.ts`
- Add: `fixtures/otlp/valid-minimal-metrics.bin`
- Modify: `fixtures/README.md`

**Interfaces:**
- Produces: `fixtures/otlp/valid-minimal-metrics.bin`.

- [ ] **Step 1: Generate valid fixture through bindings**

Use `ExportMetricsServiceRequest.toBinary({ resourceMetrics: [{}] })` and continue writing `malformed-protobuf.bin`.

- [ ] **Step 2: Update receiver test to read fixture**

Change the success test body to `await Deno.readFile("fixtures/otlp/valid-minimal-metrics.bin")`.

- [ ] **Step 3: Regenerate fixtures**

Run: `deno task fixtures`

Expected: malformed fixture remains invalid and valid fixture is deterministic.

### Task 5: Docs, DOX, and Verification

**Files:**
- Modify if needed: `src/backend/AGENTS.md`
- Modify if needed: `fixtures/AGENTS.md`
- Modify: `docs/plans/04-implementation/02-protobuf-codegen.md`
- Modify: `docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md`

**Interfaces:**
- Produces: updated durable docs for codegen and receiver success behavior.

- [ ] **Step 1: Run DOX pass**

Re-check every changed path against nearest `AGENTS.md` and update owning docs only where contracts changed.

- [ ] **Step 2: Run verification**

Run:

```powershell
deno task proto:gen
deno task fixtures
deno task receiver:test
deno task ok
```

Expected: all commands exit `0`.
