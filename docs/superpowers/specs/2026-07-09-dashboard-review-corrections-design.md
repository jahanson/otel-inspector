# Dashboard Review Corrections Design

## Status

- Approved for implementation planning.
- Date: 2026-07-09.
- Scope: dashboard privacy, chart identity, freshness, explorer aggregation, and Inspect source robustness.

## Goal

Correct six dashboard review concerns without changing the public OTLP receiver contract or broadening the dashboard feature set. Dashboard JSON must not expose credential-shaped resource values, charts must not connect unrelated telemetry series, retained data must become visibly stale after refresh failures, explorer rows must describe the newest sample of one distinct series, and every explicit Inspect source action must be honored.

## Confirmed Root Causes

- Metric datapoint attributes are redacted during normalization, but resource attributes are stored and projected unchanged. Their matches are absent from the point-level report aggregated into the dashboard summary.
- `LiveCharts` flattens all projected points into one Recharts dataset and removes `seriesKey`, so one trace connects unrelated services or routes.
- `refreshProjection` retains the last successful projection after an error without changing receiver or card freshness state.
- `explorerRows` overwrites some fields in arrival order, keeps `rate` from the first sample, and increments cardinality for every sample in the same series.
- The currently reported repeated Inspect source sequence remounts `MetricsExplorer`, which resets its local ref. A request identity is still approved as inexpensive hardening so future rendering changes cannot suppress a repeated explicit action.

## Recommended Approach

Use targeted corrections at the boundaries that own each invariant:

1. Redact resource attributes before storing `MetricPoint.resource`, while continuing to use the raw resource attributes only as an input to the internal series-key calculation.
2. Merge resource and datapoint redaction reports into the point report so existing summary aggregation remains authoritative.
3. Prepare chart data as separate traces keyed by the already opaque `seriesKey`, and retain metric, service, and route metadata for tooltip labels.
4. Derive a stale display projection after a refresh failure by marking the retained receiver non-live and all retained cards stale until a successful refresh arrives.
5. Select the newest sample per explorer series and build every sample-derived field from that sample; because each row represents one series, cardinality remains `1` regardless of sample count.
6. Attach a monotonically increasing action ID to each Inspect source click and apply explorer targeting by request identity rather than target equality.

This approach keeps raw values out of persisted normalized display fields, preserves the existing dashboard JSON shape except for UI-local inspection request state, and avoids a broader projection-schema migration.

## Data Contracts

### Resource Redaction

`normalizeMetricsExport` must produce points with:

- `MetricPoint.resource`: redacted resource attributes safe for storage and projection;
- `MetricPoint.seriesKey`: identity derived from raw resource and datapoint attributes before raw resource values are discarded;
- `MetricPoint.redaction`: the merged unique-pattern report and summed hidden-value count for resource and datapoint attributes.

The dashboard projection may read `service.name` only from the redacted resource map. A credential-shaped service name therefore renders as `[REDACTED]`, and the dashboard redaction report is blocked with the matching value pattern.

### Chart Traces

The UI chart preparation step must group points by `seriesKey`. Each prepared trace carries its own ordered points and source metadata. Recharts receives one graphical trace per prepared series, so no line or area path spans two series. Tooltip content includes the trace's metric and available service/route context.

### Stale Display State

Refresh state is separate from clear-action errors. Only a failed dashboard projection refresh marks retained data stale. The stale display projection:

- sets `receiver.live` to `false`;
- sets every retained overview card state to `stale`;
- preserves last-known values for inspection;
- remains stale until a projection refresh succeeds.

Pausing the view does not itself mark data stale and continues to suppress scheduled refreshes.

### Explorer Rows

Rows remain keyed one-to-one with internal series identity and expose an opaque key. The selected point is the one with the greatest `observedAtMs`; equal timestamps may use the later retained point. `latest`, `rate`, `resourceService`, `attributes`, `lastObservedAtMs`, and `status` all come from the selected point. `cardinality` is `1` for every per-series row.

### Inspect Source Requests

The app owns an inspection request `{ actionId, target }`. `actionId` increments for every explicit Inspect source click. `MetricsExplorer` reapplies its query and selection whenever `actionId` changes, even when `target` is value-equal to the previous request.

## Error Handling And Safety

- Raw resource attributes must not be added to `MetricPoint` or dashboard JSON as a new retained field.
- A refresh failure must retain the last successful values rather than replacing them with fabricated empty data.
- Clear-action failures may display an error but must not independently mark successfully refreshed data stale.
- Tooltip labels and explorer fields use only redacted projected metadata and opaque series identifiers.

## Testing

Follow red-green TDD for each correction:

- normalization regression for credential-shaped `service.name`, redacted resource storage, preserved distinct series identity, and merged report counts;
- dashboard projection regressions proving resource service values are safe, newest explorer fields move together, out-of-order samples cannot overwrite them, and repeated samples keep cardinality at `1`;
- pure chart-preparation regression proving two series become two traces with retained metadata and time ordering;
- pure stale-projection regression proving receiver/card freshness changes while values remain available;
- Inspect request regression proving two equal targets with different action IDs both apply.

After focused tests, rebuild generated UI assets and run:

```powershell
deno task ok
```

Complete the DOX pass after implementation. Update backend and UI local contracts where the durable behavior changed, leave unrelated parent docs unchanged, and run `repowise update` after meaningful edits.

## Non-Goals

- Do not change OTLP receiver routes, payload handling, or retention limits.
- Do not expose raw resources for debugging.
- Do not aggregate unrelated chart series into a synthetic metric.
- Do not redesign the dashboard projection API or add historical persistence.
- Do not refactor unrelated dashboard styling or component structure.
