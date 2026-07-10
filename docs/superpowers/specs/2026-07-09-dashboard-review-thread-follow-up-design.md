# Dashboard Review Thread Follow-up Design

## Status

- Approved for implementation planning.
- Date: 2026-07-09.
- Scope: three unresolved review threads on PR #5 at commit `1b5ffd82`.

## Goal

Correct the one validated dashboard projection bug and close two invalid review threads with reproducible evidence, without expanding the dashboard API or misrepresenting aggregate metrics as single-series values.

## Thread Validation

### Esbuild Materialization

The claim that a clean checkout cannot materialize the esbuild binary is invalid for the committed repository state. A temporary checkout with no `node_modules` and an empty `DENO_DIR` ran `deno task ui:build` successfully. Deno downloaded the locked `npm:esbuild@0.25.8` specifier, initialized `@esbuild/win32-x64@0.25.8`, produced the dashboard bundle, and exited `0`.

No production change is required. Reply with the clean-checkout command conditions and observed successful materialization, then resolve the thread as demonstrably invalid.

### Window-scoped Redaction

The projection filters points and exports into a selected window and derives `windowSummary`, but returns `summary.redaction` from the full retained session. This can show a blocked redaction banner when every redacted point is outside the visible window.

Change the projection to return `windowSummary.redaction`, keeping redaction metadata aligned with cards, charts, explorer rows, ingest values, and warnings derived from the same window snapshot.

### Inspect Source Series Identity

The request to attach one series key to overview card detail targets is invalid because overview cards are aggregate projections:

- latency merges histogram buckets across every usable duration series;
- throughput sums request counters across every usable request series;
- error rate divides aggregate error counts by aggregate status-coded request counts;
- active requests sums the newest usable gauge from every retained series.

No single retained series truthfully represents these values. The metric-name target intentionally filters the explorer to all contributing rows for the selected semantic metric. Attaching the newest series key would hide contributors and falsely present one series as the aggregate source.

No production change is required. Reply with these aggregation paths and resolve the thread as demonstrably invalid.

## Implementation

Add a dashboard projection regression containing a redacted point outside the selected window and a clean point inside it. The source summary remains blocked, while the built projection must report:

```ts
{
  status: "passed",
  hiddenAttributeValues: 0,
  patternsMatched: [],
}
```

Verify the test fails against `summary.redaction`, change the return field to `windowSummary.redaction`, and rerun the focused projection tests plus `deno task ok`.

## DOX And Publication

The backend contract already defines dashboard projection from the selected window and redaction aggregation; no DOX text or child index changes are expected. Re-check the DOX chain after editing and update it only if the executable contract requires new durable wording.

After verification, commit and push the fix. Reply to all three inline threads with the commit/test or runtime evidence, resolve them, and re-query live `reviewThreads` to confirm no unresolved threads remain.
