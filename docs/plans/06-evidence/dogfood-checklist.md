---
project: otel-inspector-dashboard
title: "Dogfood Checklist"
type: evidence
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Dogfood Checklist

## Before dogfood

- [ ] `POST /v1/metrics` accepts valid protobuf fixture.
- [ ] Malformed payloads fail safely.
- [ ] Overview dashboard renders no-telemetry, live, paused, and degraded states.
- [ ] Metrics Explorer filters by service/resource/metric.
- [ ] Payload Inspector can show decoded source for selected chart point.
- [ ] Redaction report appears when sensitive attributes are hidden.
- [ ] Raw capture is disabled by default.
- [ ] Redacted fixture export works.
- [ ] Desktop build starts and shows receiver endpoint.
- [ ] Acceptance matrix is updated.
- [ ] P1 traces/logs/proxy work is filed separately.
