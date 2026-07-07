---
project: otel-inspector-dashboard
title: "Persistence and Retention"
type: runtime-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Persistence and Retention

## P0

Use bounded memory only. Record dropped/evicted points visibly.

## P1

Optional SQLite retention:

```text
.metric_exports
.metric_series
.metric_points
.resources
.scopes
.redaction_reports
.debug_fixtures
```

## Rules

- Raw payload bodies are not persisted by default.
- Raw capture requires explicit opt-in.
- Retention window and disk cap are visible in Settings.
- Clear session deletes retained local summaries and reports.
- Fixture export is explicit and redacted.
