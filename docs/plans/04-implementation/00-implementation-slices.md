---
project: otel-inspector-dashboard
title: "Implementation Slices"
type: implementation-plan
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Implementation Slices

## Slice 0 — Project packet and scaffold

- Project docs.
- Deno desktop shell.
- React/shadcn app.
- Synthetic telemetry fixture path.

## Slice 1 — Receiver walking skeleton

- `/v1/metrics` endpoint.
- Protobuf decode fixtures.
- Safe error handling.
- Normalized records.

## Slice 2 — Telemetry substrate

- Ring buffer.
- Derived metrics.
- Live bus.
- Downsampling.

## Slice 3 — Dashboard projections

- Overview cards.
- Charts.
- Metrics Explorer.
- Pause/resume/clear.

## Slice 4 — Payload inspect and privacy

- Decoded payload tree.
- Redaction policy.
- Raw capture opt-in.
- Fixture export.

## Slice 5 — Dogfood evidence

- Packaging.
- Acceptance matrix.
- UI snapshots.
- Fixture inventory.
- Follow-on issues.
