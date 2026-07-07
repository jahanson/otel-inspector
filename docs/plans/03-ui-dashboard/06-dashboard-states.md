---
project: otel-inspector-dashboard
title: "Dashboard States"
type: ui-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Dashboard States

## State badges

- Live
- Paused
- No telemetry
- Backpressure
- Dropping points
- Decode errors
- Redaction active
- Raw capture disabled
- Raw capture enabled
- High cardinality
- Unsupported signal
- Proxy unavailable (P1)

## Empty states

### No telemetry

```text
No OTLP metrics received yet.
Listening on http://localhost:4318/v1/metrics
Expected content type: application/x-protobuf
```

### Latency unavailable

```text
Latency unavailable.
Received metrics, but no duration histogram was found.
```

### Active requests unavailable

```text
Active requests unavailable.
No active request gauge has been received for the selected service/window.
```

## Degraded states

- Payload decoded with unknown metric type.
- Histogram percentile unavailable.
- Percentile estimated from coarse buckets.
- UI snapshot downsampled.
- Attribute value redacted.
- Points dropped due to retention cap.
