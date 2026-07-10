---
project: otel-inspector-dashboard
title: "Dogfood Checklist"
type: evidence
status: proposed-draft
created: 2026-07-05
updated: 2026-07-08
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Dogfood Checklist

## Before dogfood

- [x] `POST /v1/metrics` accepts valid protobuf fixture.
- [x] Malformed payloads fail safely.
- [x] Overview dashboard renders no-telemetry, live, paused, and degraded states.
- [x] Metrics Explorer filters by service/resource/metric/attribute text.
- [ ] Payload Inspector can show decoded source for selected chart point.
- [ ] Redaction report appears when sensitive attributes are hidden.
- [ ] Raw capture is disabled by default.
- [ ] Redacted fixture export works.
- [ ] Desktop build starts and shows receiver endpoint.
- [x] Dashboard has been checked at 320px, 375px, 414px, 768px, and desktop docked width.
- [x] Acceptance matrix is updated.
- [ ] P1 traces/logs/proxy work is filed separately.
