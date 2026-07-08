---
project: otel-inspector-dashboard
title: "Ingest Pipeline"
type: implementation-plan
status: implemented
created: 2026-07-05
updated: 2026-07-08
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Ingest Pipeline

## Pipeline

```text
HTTP request
→ content-type/method/path/size checks
→ protobuf decode
→ redaction pre-scan where needed
→ normalize resource/scope/metric/datapoint
→ append to bounded store
→ mark dirty derivation windows
→ emit live summary
→ persist export metadata if enabled
```

Valid decoded exports append normalized points and export metadata to `TelemetryStore`.

The implemented backend path currently covers receiver validation, protobuf
decode, metric normalization, bounded store append, safe `normalize-failed`
handling, and live summary derivation. Redaction pre-scan, durable persistence,
and UI controls remain pending.

## Failure classes

- method-not-allowed
- endpoint-unsupported
- signal-unsupported
- content-type-unsupported
- payload-too-large
- decode-failed
- normalize-failed
- redaction-blocked
- retention-dropped
