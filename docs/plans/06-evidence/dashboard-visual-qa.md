---
project: otel-inspector-dashboard
title: "Dashboard Visual QA Notes"
type: evidence
status: implemented
created: 2026-07-08
updated: 2026-07-08
source_method: manual-hallmark-qa
owner: user
---

# Dashboard Visual QA Notes

## Scope

- M3 dashboard workbench only: Overview cards, live charts, Metrics Explorer,
  pause/resume, clear, empty state, live state, and degraded receiver failure
  state.
- Deferred scope remains deferred: Payload Inspector, redaction report, raw
  capture, fixture export, packaging, SQLite persistence, traces, logs, and
  proxy support.

## Checks

- Checked responsive layouts at 320px, 375px, 414px, 768px, and desktop docked
  width in the in-app browser.
- Verified no horizontal page scroll, no clipped or wrapped buttons/tabs, and
  cards/charts stack inside the viewport at mobile widths.
- Verified dashboard controls expose Pause, Clear, and 1m/5m/15m time-window
  buttons without fake chrome, nested cards, or hover-only controls.
- Verified visible focus-ring styling is present for tabs, buttons, table
  detail actions, and the Metrics Explorer filter.
- Verified empty copy explains missing telemetry and degraded copy reports a
  safe OTLP decode failure from the malformed fixture.
- Posted a valid semantic OTLP metrics payload to `127.0.0.1:4318/v1/metrics`
  and verified populated Overview values, Recharts panels, and Metrics Explorer
  rows.
- Verified Overview cards expose source inspection, Metrics Explorer filtering
  by service/resource text, metric name, and attribute text, and the Metrics
  Explorer detail panel shows series, service, rate/delta, cardinality, and
  attributes.
- Verified Pause freezes visible dashboard updates while the receiver endpoint
  continues accepting metrics, Resume refreshes the projection, and confirmed
  Clear resets counters through `/api/dashboard/clear` while recording the
  action in the dashboard.

## Verification

- `deno task ok`
- `git diff --check`
