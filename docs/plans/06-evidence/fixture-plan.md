---
project: otel-inspector-dashboard
title: "Fixture Plan"
type: evidence
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Fixture Plan

## Fixture classes

| Fixture | Purpose |
|---|---|
| valid-gauge-export.pb | baseline decode |
| valid-sum-export.pb | temporality/rate tests |
| valid-histogram-export.pb | latency percentile tests |
| exponential-histogram-export.pb | unknown/advanced metric path |
| malformed-protobuf.bin | decode failure |
| wrong-content-type.http | content-type failure |
| high-cardinality-export.pb | warning/degraded state |
| sensitive-attributes-export.pb | redaction tests |
| missing-duration-metrics.pb | dashboard empty state |
| dropped-points-session.json | retention accounting |

## Fixture export shape

```yaml
fixture_id: fx_otel_...
source: selected-chart-point | last-export | last-failure
endpoint: /v1/metrics
content_type: application/x-protobuf
signal: metrics
failure_category: none | decode-failed | redaction-blocked | normalize-failed
redaction_status: passed
includes:
  - provider/receiver contract summary
  - decoded resource/scope/metric summary
  - reproduction steps
excludes:
  - credentials
  - raw private attributes
  - raw payload unless explicitly approved
```
