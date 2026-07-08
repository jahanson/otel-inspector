---
project: otel-inspector-dashboard
title: "Acceptance Matrix"
type: evidence
status: proposed-draft
created: 2026-07-05
updated: 2026-07-08
source_method: LINEAR_METHOD_v2.md
owner: user
---
# Acceptance Matrix

| Claim | Evidence | Blocking issues | P0/P1 |
|---|---|---|---|
| Receiver accepts OTLP metrics over HTTP/protobuf | `tests/backend/receiver_contract_test.ts`, `fixtures/otlp/valid-minimal-metrics.bin`, `fixtures/otlp/malformed-protobuf.bin` | Full dogfood still depends on remaining payload safety gates | P0 |
| Telemetry is normalized before UI rendering | `tests/backend/normalize_metrics_test.ts`, `tests/backend/metric_model_test.ts`, `tests/backend/telemetry_store_test.ts`, `tests/backend/dashboard_projection_test.ts` | Full dogfood still depends on remaining payload safety gates | P0 |
| Dashboard is live without datapoint-level rerendering | `tests/backend/dashboard_projection_test.ts`, `tests/backend/app_server_dashboard_test.ts`, `docs/plans/06-evidence/dashboard-visual-qa.md` | OI-010 percentile derivation remains deferred | P0 |
| Latency/throughput/error charts are source-explainable | `tests/backend/dashboard_projection_test.ts`, `tests/backend/app_server_dashboard_test.ts`, `docs/plans/06-evidence/dashboard-visual-qa.md` | OI-010 percentile derivation remains deferred; OI-016 payload inspector pending | P0 |
| Metrics Explorer supports filters and metric detail | `tests/backend/dashboard_projection_test.ts`, `tests/backend/app_server_dashboard_test.ts`, `docs/plans/06-evidence/dashboard-visual-qa.md` | Attribute filtering covered; payload inspector remains OI-016 | P0 |
| Payload Inspector is safe by default | redaction tests, payload tree snapshots | OI-016, OI-018 | P0 |
| Raw capture is opt-in | settings snapshot, policy tests | OI-019 | P0 |
| Debug fixture export is redacted and reproducible | fixture inventory, redaction report | OI-020 | P0 |
| Desktop app is dogfoodable | packaging notes, manual probes | OI-025 | P0 |
| Release claims are evidence-backed | acceptance bundle | OI-026 | P0 |

## P0 dogfood gate

Dogfood only when every P0 row has at least one test, fixture, snapshot, or explicit descoping note.
