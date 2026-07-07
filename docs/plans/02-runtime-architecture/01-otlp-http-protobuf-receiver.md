---
project: otel-inspector-dashboard
title: "OTLP HTTP Protobuf Receiver"
type: runtime-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# OTLP HTTP/protobuf Receiver

## P0 contract

```text
POST /v1/metrics
Content-Type: application/x-protobuf
Body: ExportMetricsServiceRequest protobuf bytes
Response: ExportMetricsServiceResponse protobuf bytes or safe failure
```

## Rejections

| Case | Status | Failure category |
|---|---:|---|
| Wrong method | 405 | method-not-allowed |
| Wrong path | 404 | endpoint-unsupported |
| Unsupported content type | 415 | content-type-unsupported |
| Oversize payload | 413 | payload-too-large |
| Malformed protobuf | 400 | decode-failed |
| Unsupported signal path | 404 | signal-unsupported |

## Signals

P0 accepts metrics only:

```text
/v1/metrics  accepted
/v1/traces   P1 placeholder, rejected with signal-unsupported
/v1/logs     P1 placeholder, rejected with signal-unsupported
```

## Safe response posture

Do not echo request bodies, credentials, raw attributes, or raw decode errors. Safe failures should include endpoint, content type, bytes received, failure category, and next safe action.
