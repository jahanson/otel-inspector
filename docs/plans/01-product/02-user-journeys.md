---
project: otel-inspector-dashboard
title: "User Journeys"
type: user-journeys
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# User Journeys

## UJ-001 — Start local inspector

**As a local app builder**, I launch the desktop inspector and see that it is listening for OTLP metrics on localhost.

Acceptance:

- Status shows receiver endpoint and supported signals.
- Unsupported signals are labeled P1, not silently accepted.
- Empty state tells me exactly how to send metrics.

## UJ-002 — Debug a latency spike

**As a developer**, I see p95 latency spike and click into the contributing route/series.

Acceptance:

- Chart point shows time window, metric source, aggregation, service, route, and datapoint count.
- Detail view links to decoded payload/source export.
- Percentile estimate is labeled as histogram-derived when applicable.

## UJ-003 — Inspect payload safely

**As a privacy-conscious builder**, I inspect telemetry without leaking secrets.

Acceptance:

- Sensitive attributes are redacted by default.
- Raw payload capture is visibly off unless enabled.
- Redaction report shows hidden counts and categories.

## UJ-004 — Export a bug fixture

**As a contributor**, I export a redacted fixture for a malformed histogram or decode failure.

Acceptance:

- Fixture includes endpoint, content type, decoded summary/failure, redaction report, reproduction steps, and expected behavior.
- Fixture excludes credentials, raw private payloads, and sensitive attributes.

## UJ-005 — Use the inspector as a side panel

**As an app builder**, I keep the inspector docked next to my app while iterating.

Acceptance:

- Docked Sheet/ResizablePanel mode works.
- Dashboard can expand to full window when needed.
- Pause/resume lets me inspect without losing receiver state.
