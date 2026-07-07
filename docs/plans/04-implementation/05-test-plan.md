---
project: otel-inspector-dashboard
title: "Test Plan"
type: test-plan
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Test Plan

## Receiver tests

- Valid OTLP metrics protobuf decodes.
- Wrong method/path/content type fails safely.
- Oversize payload fails before decode.
- Malformed protobuf fails safely.
- Unsupported traces/logs endpoints fail as P1.

## Normalization tests

- Resource attributes preserved/redacted.
- Scope metadata preserved.
- Gauge/sum/histogram shapes normalized; exponential histogram coverage is a follow-up after proto/codegen support exposes that OTLP oneof arm.
- Unknown metric type labels unknown.

## Derivation tests

- Rate/delta math from fixture windows.
- Histogram percentile estimates from internally consistent buckets.
- Missing temporality/unit labels unavailable.
- Dropped point accounting.

## UI snapshot tests

- No telemetry.
- Live healthy.
- Paused.
- Decode errors.
- Redaction active.
- Missing latency histogram.
- High cardinality warning.

## Privacy tests

- Sensitive attribute values redacted.
- Raw capture off by default.
- Fixture export excludes secrets.
- Redaction report included.
