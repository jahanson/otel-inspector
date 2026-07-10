# Dashboard Review Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard projection and rendering private, series-correct, freshness-aware, sample-correct, and robust to repeated Inspect source actions.

**Architecture:** Redact resource attributes at normalization while using their raw values only transiently for local series identity. Keep dashboard API types stable, add pure UI helpers for chart preparation, stale projection derivation, and inspection request identity, then wire those helpers into the existing React components.

**Tech Stack:** Deno TypeScript, React 19, Recharts 3, `@std/assert`, esbuild UI bundle.

## Global Constraints

- Follow red-green TDD: every production behavior change begins with a regression that fails for the reviewed reason.
- Do not retain a raw resource attribute map or expose raw resource values through display fields after normalization.
- Preserve internal series identity from raw resource and datapoint attributes and expose only existing opaque dashboard series keys.
- Do not change OTLP receiver routes, payload handling, retention limits, or the dashboard JSON schema.
- Do not aggregate unrelated chart series into a synthetic metric.
- Keep generated files under `src/ui/dist/` build-owned; never hand-edit them.
- Run the nearest DOX verification commands and `deno task ok` before closeout.

---

### Task 1: Redact Resource Attributes During Normalization

**Files:**
- Modify: `tests/backend/normalize_metrics_test.ts`
- Modify: `src/backend/redaction.ts`
- Modify: `tests/backend/redaction_test.ts`
- Modify: `src/backend/normalize_metrics.ts`

**Interfaces:**
- Consumes: raw OTLP resource and datapoint attribute maps.
- Produces: `mergeRedactionReports(...reports: Array<RedactionReport | undefined>): RedactionReport` and normalized points whose `resource` and `redaction` fields are safe.

- [ ] **Step 1: Add failing report-merge coverage**

Extend the redaction test import and add:

```ts
import { mergeRedactionReports, redactAttributes, redactionReport } from "../../src/backend/redaction.ts";

Deno.test("mergeRedactionReports sums hidden values and keeps unique patterns", () => {
  assertEquals(
    mergeRedactionReports(
      { status: "blocked", hiddenAttributeValues: 1, patternsMatched: ["authorization-value"] },
      { status: "blocked", hiddenAttributeValues: 2, patternsMatched: ["password", "authorization-value"] },
    ),
    {
      status: "blocked",
      hiddenAttributeValues: 3,
      patternsMatched: ["authorization-value", "password"],
    },
  );
});
```

- [ ] **Step 2: Verify the report test fails because the merge API is missing**

Run:

```powershell
deno test tests/backend/redaction_test.ts
```

Expected: type-check failure stating that `mergeRedactionReports` is not exported.

- [ ] **Step 3: Implement the minimal merge helper**

Add to `src/backend/redaction.ts`:

```ts
export function mergeRedactionReports(
  ...reports: Array<RedactionReport | undefined>
): RedactionReport {
  const present = reports.filter((report): report is RedactionReport => report !== undefined);
  const hiddenAttributeValues = present.reduce((total, report) => total + report.hiddenAttributeValues, 0);
  const patternsMatched = [...new Set(present.flatMap((report) => report.patternsMatched))];
  return {
    status: hiddenAttributeValues > 0 ? "blocked" : "passed",
    hiddenAttributeValues,
    patternsMatched,
  };
}
```

- [ ] **Step 4: Verify the merge helper is green**

Run `deno test tests/backend/redaction_test.ts`.

Expected: all redaction tests pass.

- [ ] **Step 5: Add a failing normalization regression for resource values**

Add a test that creates two otherwise identical gauge exports with credential-shaped service names and asserts:

```ts
assertEquals(first.points[0].resource["service.name"], "[REDACTED]");
assertEquals(first.points[0].redaction, {
  status: "blocked",
  hiddenAttributeValues: 1,
  patternsMatched: ["authorization-value"],
});
assertNotEquals(first.points[0].seriesKey, second.points[0].seriesKey);
```

Use `Bearer top-secret` and `Bearer another-secret` as the two resource values, the existing `stringAttribute` helper, and the same `gaugeMetric` in each request. Add `assertNotEquals` to the existing `@std/assert` import. The internal series key remains an identity implementation detail; the dashboard projection test continues to prove its public key is opaque.

- [ ] **Step 6: Verify the resource regression fails on raw `MetricPoint.resource`**

Run `deno test tests/backend/normalize_metrics_test.ts`.

Expected: the new assertion receives `Bearer top-secret` instead of `[REDACTED]`.

- [ ] **Step 7: Redact only at the normalization boundary**

Import `mergeRedactionReports`. In `basePoint`, calculate the safe resource and combined report while retaining the raw `resource` parameter for `buildSeriesKey`:

```ts
const safeResource = redactAttributes(resource);
const redaction = mergeRedactionReports(redactionReport(resource), options.redaction);

return {
  seriesKey: buildSeriesKey({ resource, scope, metricName: metric.name, metricType, unit, rawAttributes }),
  observedAtMs,
  resource: safeResource,
  // existing fields unchanged
  redaction,
};
```

Do not add a raw-resource field to `MetricPoint`.

- [ ] **Step 8: Verify normalization and projection safety tests**

Run:

```powershell
deno test tests/backend/redaction_test.ts tests/backend/normalize_metrics_test.ts tests/backend/dashboard_projection_test.ts
```

Expected: all tests pass.

### Task 2: Select the Newest Explorer Sample and Preserve Series Cardinality

**Files:**
- Modify: `tests/backend/dashboard_projection_test.ts`
- Modify: `src/backend/dashboard_projection.ts`

**Interfaces:**
- Consumes: retained `MetricPoint[]` in arbitrary arrival order.
- Produces: one `ExplorerRow` per raw `seriesKey`, populated from that series' newest point with `cardinality: 1`.

- [ ] **Step 1: Add failing newest-sample and cardinality regressions**

Add one test with the same `seriesKey` at timestamps `2_000`, `3_000`, and then `1_000`. Give the points distinct values, services, attributes, and derivation statuses. Assert the sole row is:

```ts
assertObjectMatch(projection.explorer.rows[0], {
  latest: 30,
  rate: 30,
  resourceService: "newest-service",
  attributes: { "http.route": "/newest" },
  cardinality: 1,
  lastObservedAtMs: 3_000,
  status: "healthy",
});
```

Construct the newest point from `explorerPoint`, override its resource and attributes, and make the final appended older point `derivationStatus: "incomplete"` so the existing implementation also demonstrates its stale status overwrite.

- [ ] **Step 2: Verify the explorer regression fails for the reviewed fields**

Run `deno test tests/backend/dashboard_projection_test.ts`.

Expected: `latest`, `rate`, `cardinality`, or `status` differs from the asserted newest row.

- [ ] **Step 3: Select newest points first, then map rows**

Replace `explorerRows` with a two-phase implementation:

```ts
function explorerRows(points: MetricPoint[]): ExplorerRow[] {
  const newestBySeries = new Map<string, MetricPoint>();
  for (const point of points) {
    const newest = newestBySeries.get(point.seriesKey);
    if (newest === undefined || point.observedAtMs >= newest.observedAtMs) {
      newestBySeries.set(point.seriesKey, point);
    }
  }

  return [...newestBySeries.values()].map((point) => ({
    seriesKey: opaqueSeriesKey(point.seriesKey),
    metricName: point.metric.name,
    metricType: point.metric.type,
    unit: point.metric.unit,
    latest: point.value,
    rate: isHttpRequestCount(point) ? point.value : undefined,
    resourceService: typeof point.resource["service.name"] === "string" ? point.resource["service.name"] : undefined,
    attributes: point.attributes,
    cardinality: 1,
    lastObservedAtMs: point.observedAtMs,
    status: statusForPoint(point),
  })).sort((left, right) =>
    left.metricName.localeCompare(right.metricName) || left.seriesKey.localeCompare(right.seriesKey)
  );
}
```

- [ ] **Step 4: Verify explorer projection is green**

Run `deno test tests/backend/dashboard_projection_test.ts`.

Expected: all projection tests pass.

### Task 3: Prepare and Render Separate Chart Traces

**Files:**
- Create: `src/ui/dashboard/charts/chart_data.ts`
- Create: `tests/ui/chart_data_test.ts`
- Modify: `src/ui/dashboard/charts/LiveCharts.tsx`
- Modify: `tests/ui/dashboard_bundle_test.ts`

**Interfaces:**
- Consumes: `ChartSeries["points"]`.
- Produces: `prepareChartTraces(points): PreparedChartTrace[]`, each with one `seriesKey`, ordered points, and safe tooltip metadata.

- [ ] **Step 1: Write a failing pure chart-preparation test**

Create `tests/ui/chart_data_test.ts` with two interleaved opaque series. Assert:

```ts
const traces = prepareChartTraces(points);
assertEquals(traces.length, 2);
assertEquals(traces[0].seriesKey, "series:opaque:a");
assertEquals(traces[0].points.map((point) => point.value), [1, 3]);
assertEquals(traces[0].detailLabel, "requests · checkout / /cart");
assertEquals(traces[1].points.map((point) => point.value), [2, 4]);
```

Import `ChartPoint` from the UI types and populate every required field.

- [ ] **Step 2: Verify the chart-data test fails because the module is missing**

Run `deno test tests/ui/chart_data_test.ts`.

Expected: module-not-found for `chart_data.ts`.

- [ ] **Step 3: Implement the pure grouping helper**

Create `chart_data.ts`:

```ts
import type { ChartPoint } from "../types.ts";

export type PreparedChartPoint = ChartPoint & { timeLabel: string };
export type PreparedChartTrace = {
  seriesKey: string;
  detailLabel: string;
  points: PreparedChartPoint[];
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function prepareChartTraces(points: ChartPoint[]): PreparedChartTrace[] {
  const grouped = new Map<string, ChartPoint[]>();
  for (const point of points) {
    const series = grouped.get(point.seriesKey) ?? [];
    series.push(point);
    grouped.set(point.seriesKey, series);
  }

  return [...grouped.entries()].map(([seriesKey, seriesPoints]) => {
    const ordered = [...seriesPoints].sort((left, right) => left.observedAtMs - right.observedAtMs);
    const metadata = ordered.at(-1)!;
    const source = [metadata.service, metadata.route].filter(Boolean).join(" / ");
    return {
      seriesKey,
      detailLabel: [metadata.metricName, source].filter(Boolean).join(" · "),
      points: ordered.map((point) => ({ ...point, timeLabel: timeFormatter.format(point.observedAtMs) })),
    };
  });
}
```

- [ ] **Step 4: Verify the pure helper is green**

Run `deno test tests/ui/chart_data_test.ts`.

- [ ] **Step 5: Add a failing bundle/source contract for trace rendering**

Replace the old single-series assumptions in `dashboard_bundle_test.ts` with assertions that `LiveCharts.tsx` imports `prepareChartTraces`, maps `traces`, supplies each trace's own `data`, uses `trace.seriesKey` as the graphical key, and includes `trace.detailLabel` in the tooltip.

- [ ] **Step 6: Verify the source contract fails on the flattened dataset**

Run `deno task test:dashboard-bundle`.

Expected: missing `prepareChartTraces` or trace mapping assertion.

- [ ] **Step 7: Render one Recharts path per trace**

In `TelemetryChart`, replace the flattened `data` with `const traces = prepareChartTraces(series.points)`. Keep one chart container per dashboard chart, map a `<Line>` or `<Area>` for each trace, and give each graphical item:

```tsx
key={trace.seriesKey}
data={trace.points}
dataKey="value"
name={trace.detailLabel}
isAnimationActive={false}
```

Use the first trace's ordered points for the X axis only as needed by Recharts, set `connectNulls={false}`, and make the tooltip read the payload item's `name` plus its point time. Do not rebuild a single flattened array or discard `seriesKey`.

- [ ] **Step 8: Verify chart preparation, bundle contract, and UI build**

Run:

```powershell
deno test tests/ui/chart_data_test.ts
deno task ui:build
deno task test:dashboard-bundle
```

Expected: all commands pass and `src/ui/dist/app.js` is regenerated.

### Task 4: Derive Stale Display State After Refresh Failures

**Files:**
- Create: `src/ui/dashboard/projection_freshness.ts`
- Create: `tests/ui/projection_freshness_test.ts`
- Modify: `src/ui/dashboard/App.tsx`
- Modify: `tests/ui/dashboard_bundle_test.ts`

**Interfaces:**
- Consumes: last successful `DashboardProjection` and a refresh-failed boolean.
- Produces: `markProjectionStale(projection): DashboardProjection` without mutating the retained projection.

- [ ] **Step 1: Write the failing stale-projection test**

Create a minimal complete `DashboardProjection` fixture and assert:

```ts
const stale = markProjectionStale(projection);
assertEquals(stale.receiver.live, false);
assertEquals(Object.values(stale.cards).every((card) => card.state === "stale"), true);
assertEquals(stale.cards.throughput.value, projection.cards.throughput.value);
assertEquals(projection.receiver.live, true);
assertEquals(projection.cards.throughput.state, "healthy");
```

- [ ] **Step 2: Verify the stale test fails because the helper is missing**

Run `deno test tests/ui/projection_freshness_test.ts`.

- [ ] **Step 3: Implement immutable stale projection derivation**

Create `projection_freshness.ts`:

```ts
import type { DashboardProjection } from "./types.ts";

export function markProjectionStale(projection: DashboardProjection): DashboardProjection {
  return {
    ...projection,
    receiver: { ...projection.receiver, live: false },
    cards: {
      latency: { ...projection.cards.latency, state: "stale" },
      throughput: { ...projection.cards.throughput, state: "stale" },
      errorRate: { ...projection.cards.errorRate, state: "stale" },
      activeRequests: { ...projection.cards.activeRequests, state: "stale" },
      ingest: { ...projection.cards.ingest, state: "stale" },
      dropped: { ...projection.cards.dropped, state: "stale" },
    },
  };
}
```

- [ ] **Step 4: Verify the helper is green**

Run `deno test tests/ui/projection_freshness_test.ts`.

- [ ] **Step 5: Add a failing App source contract**

Assert `App.tsx` owns separate `refreshFailed` state, passes its setter only to `refreshProjection`, renders a `displayProjection` from `markProjectionStale`, and clears the flag only after successful JSON refresh. Also assert clear-action catch does not call `setRefreshFailed(true)` directly.

- [ ] **Step 6: Verify the source contract fails on current refresh handling**

Run `deno task test:dashboard-bundle`.

- [ ] **Step 7: Wire freshness state into refresh behavior**

In `App.tsx`:

```ts
const [refreshFailed, setRefreshFailed] = useState(false);
const displayProjection = refreshFailed ? markProjectionStale(projection) : projection;
```

Render receiver, cards, charts, explorer, redaction, and warnings from `displayProjection`. Extend `refreshProjection` with `setRefreshFailed`, set it `false` after `setProjection(await response.json())`, and set it `true` in the catch block. Keep clear-action errors on `refreshError` only.

- [ ] **Step 8: Verify freshness behavior and bundle**

Run:

```powershell
deno test tests/ui/projection_freshness_test.ts
deno task ui:build
deno task test:dashboard-bundle
```

### Task 5: Give Every Inspect Source Click an Action Identity

**Files:**
- Create: `src/ui/dashboard/inspection_request.ts`
- Create: `tests/ui/inspection_request_test.ts`
- Modify: `src/ui/dashboard/App.tsx`
- Modify: `src/ui/dashboard/components/MetricsExplorer.tsx`
- Modify: `tests/ui/dashboard_bundle_test.ts`

**Interfaces:**
- Produces: `InspectionRequest` and `nextInspectionRequest(current, target)`.
- Consumes: an inspection request in `MetricsExplorer`; applies targeting whenever `actionId` changes.

- [ ] **Step 1: Write the failing inspection identity test**

Create a test that calls `nextInspectionRequest` twice with the same target and asserts IDs `1` then `2`, value-equal targets, and distinct request objects.

- [ ] **Step 2: Verify the test fails because the helper is missing**

Run `deno test tests/ui/inspection_request_test.ts`.

- [ ] **Step 3: Implement the request helper**

Create:

```ts
import type { DashboardCard } from "./types.ts";

export type InspectionRequest = {
  actionId: number;
  target: NonNullable<DashboardCard["detailTarget"]>;
};

export function nextInspectionRequest(
  current: InspectionRequest | undefined,
  target: NonNullable<DashboardCard["detailTarget"]>,
): InspectionRequest {
  return { actionId: (current?.actionId ?? 0) + 1, target };
}
```

- [ ] **Step 4: Verify request identity is green**

Run `deno test tests/ui/inspection_request_test.ts`.

- [ ] **Step 5: Add a failing source contract for action IDs**

Update the dashboard bundle test to assert App uses functional `setMetricsRequest((current) => nextInspectionRequest(current, card.detailTarget!))`, passes `request={metricsRequest}`, and MetricsExplorer's effect depends on `request?.actionId` without `targetSame` or `appliedTarget`.

- [ ] **Step 6: Verify the source contract fails on target equality suppression**

Run `deno task test:dashboard-bundle`.

- [ ] **Step 7: Wire action identity into App and MetricsExplorer**

Replace `metricsTarget` with `InspectionRequest | undefined`. Only create a request when `card.detailTarget` exists. Change the explorer prop to `request?: InspectionRequest`, derive `target = request?.target`, and remove the equality ref. The effect dependency must include `request?.actionId`, `request?.target`, and `rows`; each new ID reapplies query and selection.

- [ ] **Step 8: Verify inspection request and bundle behavior**

Run:

```powershell
deno test tests/ui/inspection_request_test.ts
deno task ui:build
deno task test:dashboard-bundle
```

### Task 6: DOX Closeout and Full Verification

**Files:**
- Modify: `src/backend/AGENTS.md`
- Modify: `src/ui/AGENTS.md`
- Modify: `tests/AGENTS.md` only if new focused test commands need durable documentation
- Generated: `src/ui/dist/app.js`
- Generated: `src/ui/dist/styles.css` only if the build changes it

**Interfaces:**
- Produces: durable local contracts aligned with the corrected runtime behavior and a clean verified worktree diff.

- [ ] **Step 1: Update backend DOX contracts**

Record that resource and datapoint attributes are redacted before `MetricPoint` storage, raw resource values are transient series-identity inputs only, and dashboard explorer rows represent one distinct series using its newest retained sample.

- [ ] **Step 2: Update UI DOX contracts**

Record that chart rendering preserves opaque series identity, refresh failures render retained data stale until recovery, and explicit Inspect source actions carry request identity.

- [ ] **Step 3: Re-check all changed paths against the DOX chain**

Read root, source, backend, UI, tests, docs, and Superpowers AGENTS files again. Leave parent docs unchanged if no parent-level structure, ownership, or child index changed.

- [ ] **Step 4: Run formatting and focused verification**

Run:

```powershell
deno fmt
deno test tests/backend/redaction_test.ts tests/backend/normalize_metrics_test.ts tests/backend/dashboard_projection_test.ts
deno test tests/ui/chart_data_test.ts tests/ui/projection_freshness_test.ts tests/ui/inspection_request_test.ts
deno task ui:build
deno task test:dashboard-bundle
```

Expected: all commands exit `0` with no failures.

- [ ] **Step 5: Run the full quality gate**

Run:

```powershell
deno task ok
```

Expected: UI build, format check, lint, type check, complete test suite, and dashboard bundle regression all pass.

- [ ] **Step 6: Inspect the final diff and update Repowise**

Run:

```powershell
git diff --check
git status --short
git diff --stat
repowise update
```

Expected: only planned source, tests, generated UI assets, and local DOX files are changed; `git diff --check` and `repowise update` exit `0`.

- [ ] **Step 7: Perform a requirement-by-requirement self-review**

Confirm the final diff proves:

- resource values are redacted and counted before dashboard projection;
- chart paths cannot connect two series;
- failed refreshes show stale retained data until recovery;
- explorer fields come from the newest sample and cardinality remains one per row;
- repeated equal Inspect source targets get distinct action IDs;
- no raw resource field or unrelated refactor was introduced.
