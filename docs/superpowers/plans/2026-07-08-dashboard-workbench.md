# Dashboard Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the handoff baseline, reconcile M2 substrate status, and build the M3 docked inspector dashboard as a contract-backed shadcn/Recharts workbench.

**Architecture:** Keep the Deno receiver, store, derivation, and app server as the backend boundary. Add typed dashboard projections over `TelemetryStore`/`LiveTelemetrySummary`, then add a local React asset build for the browser dashboard so shadcn-style components and Recharts can run inside the existing WebView-served app.

**Tech Stack:** Deno TypeScript, Deno tests with `@std/assert`, React, React DOM, Recharts v3-compatible chart components, shadcn-style local component source, CSS custom properties, existing `@webview/webview` shell.

## Global Constraints

- Follow the full DOX chain before editing any file.
- Do not implement the M4 Payload Inspector tree, redaction policy, raw capture opt-in, or redacted fixture export in this slice.
- Do not implement SQLite session history, traces, logs, or proxy-forward mode.
- Do not persist raw protobuf request bodies.
- Do not replace the backend substrate or make the UI parse OTLP protobuf structures directly.
- Do not turn this into a generic marketing dashboard or landing page.
- Exponential histogram percentile derivation remains deferred until a separate safe derivation design lands.
- Use shadcn chart guidance: build charts with Recharts components, keep chart config decoupled from data, use CSS variables for chart colors, and give each chart container a stable height/min-height/aspect.
- Apply Hallmark gates: no fake chrome, no decorative orbs, no gradient headline, no invented metrics, no nested cards, named tokens only, tabular numerals for metric values, visible focus rings, reduced-motion support, no `transition-all`, no hover-only controls, and no wrapping clickable labels from 320px to 1920px.
- `deno task ok` is the final quality gate.
- Leave unrelated working-tree changes alone; an existing unstaged `AGENTS.md` diff may be present.

---

## File Structure

- Modify `.codex/hooks.json` only if the known line-ending format gate still fails.
- Modify `docs/plans/05-linear-issues/OI-009.md`, `OI-010.md`, `OI-011.md`, and `OI-012.md` to reconcile already-implemented M2 substrate status.
- Modify `docs/plans/06-evidence/acceptance-matrix.md` and `docs/plans/04-implementation/04-api-and-event-contracts.md` when projection contracts change release/evidence claims.
- Create `src/backend/dashboard_projection.ts` for M3 projection types and pure projection functions.
- Create `tests/backend/dashboard_projection_test.ts` for projection behavior.
- Modify `src/backend/app_server.ts` to serve dashboard JSON endpoints and static UI assets.
- Create `tests/backend/app_server_dashboard_test.ts` for endpoint/static asset behavior.
- Create `src/ui/dashboard/main.tsx` as the React browser entry.
- Create `src/ui/dashboard/App.tsx` for top-level dashboard state and polling.
- Create `src/ui/dashboard/types.ts` for browser-side projection types.
- Create `src/ui/dashboard/components/*.tsx` for focused UI components.
- Create `src/ui/dashboard/components/ui/*.tsx` for local shadcn-style primitives copied/adapted into this repo.
- Create `src/ui/dashboard/charts/*.tsx` for Recharts chart components.
- Create `src/ui/dashboard/styles.css` for Hallmark/shadcn-compatible tokens and component CSS.
- Create `src/ui/app_shell.ts` to render the HTML shell that loads the built asset.
- Replace `src/ui/app_html.ts` usage with `src/ui/app_shell.ts` or keep `buildAppHtml()` as a compatibility wrapper if fewer tests churn.
- Create generated build output under `src/ui/dist/` through a deterministic `deno task ui:build`; do not hand-edit built files.
- Modify `deno.json` tasks and imports to add `ui:build`, include dashboard TSX in `check`, and run UI build before tests that require built assets.

---

### Task 1: Restore Baseline And Reconcile M2 Status

**Files:**
- Modify: `.codex/hooks.json` only if still CRLF/formatted incorrectly.
- Modify: `docs/plans/05-linear-issues/OI-009.md`
- Modify: `docs/plans/05-linear-issues/OI-010.md`
- Modify: `docs/plans/05-linear-issues/OI-011.md`
- Modify: `docs/plans/05-linear-issues/OI-012.md`
- Modify: `docs/plans/06-evidence/acceptance-matrix.md`
- Modify: `docs/plans/04-implementation/04-api-and-event-contracts.md`

**Interfaces:**
- Consumes: current implemented substrate in `src/backend/metric_derivations.ts`, `src/backend/telemetry_store.ts`, `src/backend/live_bus.ts`, and tests under `tests/backend/`.
- Produces: clean handoff state and docs that mark implemented backend substrate work separately from pending M3 UI work.

- [ ] **Step 1: Confirm current gate and dirty files**

Run:

```powershell
git status --short
git ls-files --eol -- .codex/hooks.json
deno task ok
```

Expected before any fix in the parent checkout:

```text
 M AGENTS.md
...
error: Found 1 not formatted file in 36 files
```

If `deno task ok` already passes, do not edit `.codex/hooks.json`.

- [ ] **Step 2: Normalize `.codex/hooks.json` if required**

Run only if Step 1 failed at `.codex/hooks.json`:

```powershell
deno fmt .codex/hooks.json
deno fmt --check .codex/hooks.json
```

Expected:

```text
Checked 1 file
```

- [ ] **Step 3: Reconcile M2 issue status**

For each of `docs/plans/05-linear-issues/OI-009.md`, `OI-010.md`, `OI-011.md`, and `OI-012.md`, change frontmatter to:

```yaml
status: implemented
updated: 2026-07-08
```

Append this note under each issue's `## Evidence` section:

```md
- Backend substrate behavior is implemented and covered by focused Deno tests.
- M3 dashboard rendering, visual QA, and user-facing controls remain pending in
  the dashboard workbench plan.
```

For `OI-010.md`, also add:

```md
- Exponential histogram percentile derivation remains deferred until a separate
  safe derivation design lands.
```

- [ ] **Step 4: Update acceptance matrix**

In `docs/plans/06-evidence/acceptance-matrix.md`, replace the dashboard-live row with:

```md
| Dashboard is live without datapoint-level rerendering | `tests/backend/live_bus_cadence_test.ts`, `tests/backend/live_bus_substrate_test.ts`; M3 UI projection and visual evidence pending | OI-013, OI-014, OI-015, OI-017 | P0 |
```

Replace the telemetry-normalized row with:

```md
| Telemetry is normalized before UI rendering | `tests/backend/normalize_metrics_test.ts`, `tests/backend/metric_model_test.ts`, `tests/backend/telemetry_store_test.ts` | Dashboard projection still pending | P0 |
```

- [ ] **Step 5: Update API/event contracts doc**

In `docs/plans/04-implementation/04-api-and-event-contracts.md`, add this section after `LiveTelemetrySummary`:

```md
## M3 Dashboard Projections

M3 adds JSON-safe projections over the substrate for Overview cards, chart
series, Metrics Explorer rows, pause/resume view state, and clear-session
behavior. These projections are defined in
`src/backend/dashboard_projection.ts` and served by `src/backend/app_server.ts`.

The UI must consume these projections rather than parsing raw OTLP protobuf
trees or unbounded store snapshots.
```

- [ ] **Step 6: Verify Task 1**

Run:

```powershell
deno task ok
git diff --check
```

Expected:

```text
ok | ... passed | 0 failed
```

`git diff --check` should print no whitespace errors.

- [ ] **Step 7: Commit Task 1**

Run:

```powershell
git status --short
git add -- docs/plans/05-linear-issues/OI-009.md docs/plans/05-linear-issues/OI-010.md docs/plans/05-linear-issues/OI-011.md docs/plans/05-linear-issues/OI-012.md docs/plans/06-evidence/acceptance-matrix.md docs/plans/04-implementation/04-api-and-event-contracts.md
if ((git status --short -- .codex/hooks.json) -ne "") { git add -- .codex/hooks.json }
git commit -m "docs: reconcile dashboard substrate status"
```

Expected: commit succeeds. Do not stage unrelated `AGENTS.md`.

---

### Task 2: Add Dashboard Projection Contracts

**Files:**
- Create: `src/backend/dashboard_projection.ts`
- Create: `tests/backend/dashboard_projection_test.ts`
- Modify: `docs/plans/04-implementation/04-api-and-event-contracts.md`

**Interfaces:**
- Consumes: `LiveTelemetrySummary` from `src/backend/contracts.ts`, `TelemetryStoreSnapshot` and `SeriesSummary` from `src/backend/telemetry_store.ts`, `MetricPoint` from `src/backend/metric_model.ts`, `deriveLiveTelemetrySummary()` from `src/backend/metric_derivations.ts`.
- Produces:
  - `type DashboardProjection`
  - `type DashboardCard`
  - `type ChartSeries`
  - `type ChartPoint`
  - `type ExplorerRow`
  - `function buildDashboardProjection(snapshot: TelemetryStoreSnapshot, summary: LiveTelemetrySummary, options?: DashboardProjectionOptions): DashboardProjection`

- [ ] **Step 1: Write failing projection tests**

Create `tests/backend/dashboard_projection_test.ts`:

```ts
import { assertEquals, assertObjectMatch } from "@std/assert";
import { buildDashboardProjection } from "../../src/backend/dashboard_projection.ts";
import type { LiveTelemetrySummary } from "../../src/backend/contracts.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";
import type { TelemetryStoreSnapshot } from "../../src/backend/telemetry_store.ts";

Deno.test("buildDashboardProjection creates overview cards without inventing missing data", () => {
  const projection = buildDashboardProjection(snapshot([]), summary({
    p95Ms: undefined,
    requestRate: undefined,
    errorRate: undefined,
    topServices: [],
  }));

  assertObjectMatch(projection.cards.latency, {
    id: "latency",
    label: "p95 latency",
    state: "unavailable",
    value: undefined,
    unit: "ms",
    source: "No usable HTTP duration histogram in the selected window.",
  });
  assertObjectMatch(projection.cards.throughput, {
    id: "throughput",
    state: "empty",
    source: "No HTTP request counter in the selected window.",
  });
  assertEquals(projection.charts.latency.points, []);
  assertEquals(projection.explorer.rows, []);
});

Deno.test("buildDashboardProjection creates cards charts and explorer rows from HTTP metrics", () => {
  const points = [
    httpRequestCount(1_000, 8, 200),
    httpRequestCount(2_000, 2, 500),
    httpHistogram(2_000, [
      { upperBound: 50, count: 5 },
      { upperBound: 100, count: 5 },
    ]),
  ];
  const projection = buildDashboardProjection(snapshot(points), summary({
    p95Ms: 100,
    requestRate: 10,
    errorRate: 0.2,
    topServices: ["checkout"],
  }), { observedAtMs: 3_000, windowMs: 60_000 });

  assertObjectMatch(projection.cards.latency, {
    id: "latency",
    state: "healthy",
    value: 100,
    unit: "ms",
  });
  assertObjectMatch(projection.cards.errorRate, {
    id: "error-rate",
    state: "degraded",
    value: 20,
    unit: "%",
  });
  assertEquals(projection.charts.throughput.points.length, 2);
  assertEquals(projection.explorer.rows.length, 2);
  assertEquals(projection.explorer.rows[0].metricName, "http.server.duration");
});

function summary(overview: LiveTelemetrySummary["overview"]): LiveTelemetrySummary {
  return {
    observedAtMs: 3_000,
    receiver: { endpoint: "http://127.0.0.1:4318/v1/metrics", live: true, paused: false },
    ingest: { exportsPerSec: 1, datapointsPerSec: 3, bytesPerSec: 128, dropped: 0 },
    overview,
    warnings: [],
  };
}

function snapshot(points: MetricPoint[]): TelemetryStoreSnapshot {
  return {
    totalExports: points.length > 0 ? 1 : 0,
    totalBytes: points.length * 64,
    totalPoints: points.length,
    droppedPoints: 0,
    recentPoints: points,
    exports: points.length > 0 ? [{ observedAtMs: 2_000, bytesReceived: 128, pointCount: points.length }] : [],
    warnings: points.flatMap((point) => point.warnings),
  };
}

function httpRequestCount(observedAtMs: number, value: number, statusCode: number): MetricPoint {
  return {
    ...basePoint("http.server.request.count", observedAtMs),
    metric: { name: "http.server.request.count", type: "sum", unit: "1", temporality: "delta", monotonic: true },
    attributes: { "http.response.status_code": statusCode, "http.route": "/cart", "http.request.method": "GET" },
    value,
  };
}

function httpHistogram(observedAtMs: number, buckets: Array<{ upperBound: number; count: number }>): MetricPoint {
  return {
    ...basePoint("http.server.duration", observedAtMs),
    metric: { name: "http.server.duration", type: "histogram", unit: "ms", temporality: "delta" },
    attributes: { "http.route": "/cart", "http.request.method": "GET" },
    count: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
    sum: 400,
    buckets,
  };
}

function basePoint(name: string, observedAtMs: number): MetricPoint {
  return {
    seriesKey: `series:${name}:${observedAtMs}`,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: { name: "manual" },
    metric: { name, type: "gauge" },
    attributes: {},
    derivationStatus: "usable",
    warnings: [],
  };
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
deno test tests/backend/dashboard_projection_test.ts
```

Expected: FAIL because `src/backend/dashboard_projection.ts` does not exist.

- [ ] **Step 3: Create projection module**

Create `src/backend/dashboard_projection.ts`:

```ts
import type { LiveTelemetrySummary } from "./contracts.ts";
import type { MetricPoint, PrimitiveAttributeValue } from "./metric_model.ts";
import type { TelemetryStoreSnapshot } from "./telemetry_store.ts";

export type CardState = "healthy" | "empty" | "paused" | "degraded" | "stale" | "unavailable";

export type DashboardCard = {
  id: "latency" | "throughput" | "error-rate" | "active-requests" | "ingest" | "dropped";
  label: string;
  state: CardState;
  value?: number;
  unit?: string;
  source: string;
  detailTarget?: { metricName?: string; seriesKey?: string };
};

export type ChartPoint = {
  observedAtMs: number;
  value: number;
  seriesKey: string;
  metricName: string;
  aggregation: "latest" | "sum" | "bucket-upper-bound" | "rate";
  datapointCount: number;
  service?: string;
  route?: string;
  statusCode?: number;
  state: "exact" | "estimated" | "degraded";
};

export type ChartSeries = {
  id: "latency" | "throughput" | "error-rate" | "ingest";
  label: string;
  unit: string;
  windowMs: number;
  points: ChartPoint[];
  unavailableReason?: string;
};

export type ExplorerRow = {
  seriesKey: string;
  metricName: string;
  metricType: string;
  unit?: string;
  latest?: number;
  rate?: number;
  resourceService?: string;
  attributes: Record<string, PrimitiveAttributeValue>;
  cardinality: number;
  lastObservedAtMs: number;
  status: CardState;
};

export type DashboardProjection = {
  observedAtMs: number;
  windowMs: number;
  receiver: LiveTelemetrySummary["receiver"];
  ingest: LiveTelemetrySummary["ingest"];
  cards: {
    latency: DashboardCard;
    throughput: DashboardCard;
    errorRate: DashboardCard;
    activeRequests: DashboardCard;
    ingest: DashboardCard;
    dropped: DashboardCard;
  };
  charts: {
    latency: ChartSeries;
    throughput: ChartSeries;
    errorRate: ChartSeries;
    ingest: ChartSeries;
  };
  explorer: { rows: ExplorerRow[] };
  warnings: LiveTelemetrySummary["warnings"];
};

export type DashboardProjectionOptions = {
  observedAtMs?: number;
  windowMs?: number;
};

export function buildDashboardProjection(
  snapshot: TelemetryStoreSnapshot,
  summary: LiveTelemetrySummary,
  options: DashboardProjectionOptions = {},
): DashboardProjection {
  const observedAtMs = options.observedAtMs ?? summary.observedAtMs;
  const windowMs = options.windowMs ?? 60_000;
  const points = snapshot.recentPoints.filter((point) => observedAtMs - point.observedAtMs <= windowMs);
  const requestPoints = points.filter(isHttpRequestCount);
  const latencyPoints = points.filter(isHttpDurationHistogram);
  const errorPoints = requestPoints.filter(isErrorStatus);

  return {
    observedAtMs,
    windowMs,
    receiver: summary.receiver,
    ingest: summary.ingest,
    cards: {
      latency: latencyCard(summary, latencyPoints),
      throughput: throughputCard(summary, requestPoints),
      errorRate: errorRateCard(summary, requestPoints),
      activeRequests: activeRequestsCard(points),
      ingest: ingestCard(summary),
      dropped: droppedCard(summary),
    },
    charts: {
      latency: latencyChart(latencyPoints, windowMs),
      throughput: throughputChart(requestPoints, windowMs),
      errorRate: errorRateChart(requestPoints, errorPoints, windowMs),
      ingest: ingestChart(snapshot, summary, windowMs),
    },
    explorer: { rows: explorerRows(points) },
    warnings: summary.warnings,
  };
}

function latencyCard(summary: LiveTelemetrySummary, points: MetricPoint[]): DashboardCard {
  if (summary.receiver.paused) {
    return card("latency", "p95 latency", "paused", summary.overview.p95Ms, "ms", "View is paused; receiver remains live.");
  }
  if (summary.overview.p95Ms === undefined) {
    return card("latency", "p95 latency", points.length === 0 ? "unavailable" : "degraded", undefined, "ms", "No usable HTTP duration histogram in the selected window.");
  }
  return card("latency", "p95 latency", "healthy", summary.overview.p95Ms, "ms", "Bucket-derived from HTTP duration histograms.");
}

function throughputCard(summary: LiveTelemetrySummary, points: MetricPoint[]): DashboardCard {
  if (summary.overview.requestRate === undefined) {
    return card("throughput", "request rate", points.length === 0 ? "empty" : "unavailable", undefined, "req/s", "No HTTP request counter in the selected window.");
  }
  return card("throughput", "request rate", "healthy", summary.overview.requestRate, "req/s", "Derived from delta monotonic HTTP request counters.");
}

function errorRateCard(summary: LiveTelemetrySummary, points: MetricPoint[]): DashboardCard {
  if (summary.overview.errorRate === undefined) {
    return card("error-rate", "error rate", points.length === 0 ? "empty" : "unavailable", undefined, "%", "No HTTP status code attributes in the selected window.");
  }
  const value = Math.round(summary.overview.errorRate * 10_000) / 100;
  return card("error-rate", "error rate", value > 0 ? "degraded" : "healthy", value, "%", "Derived from HTTP status code attributes.");
}

function activeRequestsCard(points: MetricPoint[]): DashboardCard {
  const active = points.find((point) =>
    point.metric.type === "gauge" &&
    (point.metric.name === "http.server.active_requests" || point.metric.name === "http.server.active_requests_count")
  );
  return active?.value === undefined
    ? card("active-requests", "active requests", "unavailable", undefined, "req", "No active request gauge in the selected window.")
    : card("active-requests", "active requests", "healthy", active.value, "req", active.metric.name);
}

function ingestCard(summary: LiveTelemetrySummary): DashboardCard {
  return card("ingest", "ingest", "healthy", summary.ingest.datapointsPerSec, "pts/s", "Datapoints accepted by the local receiver.");
}

function droppedCard(summary: LiveTelemetrySummary): DashboardCard {
  return card("dropped", "dropped", summary.ingest.dropped > 0 ? "degraded" : "healthy", summary.ingest.dropped, "pts", "Points evicted by bounded retention.");
}

function card(id: DashboardCard["id"], label: string, state: CardState, value: number | undefined, unit: string, source: string): DashboardCard {
  return { id, label, state, value, unit, source };
}

function latencyChart(points: MetricPoint[], windowMs: number): ChartSeries {
  return {
    id: "latency",
    label: "Latency",
    unit: "ms",
    windowMs,
    points: points.flatMap((point) => (point.buckets ?? []).filter((bucket) => Number.isFinite(bucket.upperBound)).map((bucket) => chartPoint(point, bucket.upperBound, "bucket-upper-bound", bucket.count))),
    unavailableReason: points.length === 0 ? "No usable HTTP duration histogram in the selected window." : undefined,
  };
}

function throughputChart(points: MetricPoint[], windowMs: number): ChartSeries {
  return { id: "throughput", label: "Throughput", unit: "req", windowMs, points: points.map((point) => chartPoint(point, point.value ?? 0, "sum", 1)) };
}

function errorRateChart(requestPoints: MetricPoint[], errorPoints: MetricPoint[], windowMs: number): ChartSeries {
  return { id: "error-rate", label: "Error count", unit: "errors", windowMs, points: errorPoints.map((point) => chartPoint(point, point.value ?? 0, "sum", 1)), unavailableReason: requestPoints.length === 0 ? "No HTTP request counters in the selected window." : undefined };
}

function ingestChart(snapshot: TelemetryStoreSnapshot, summary: LiveTelemetrySummary, windowMs: number): ChartSeries {
  return {
    id: "ingest",
    label: "Ingest",
    unit: "pts/s",
    windowMs,
    points: snapshot.exports.map((record) => ({
      observedAtMs: record.observedAtMs,
      value: record.pointCount,
      seriesKey: `export:${record.observedAtMs}`,
      metricName: "otel.inspector.ingest.datapoints",
      aggregation: "sum",
      datapointCount: record.pointCount,
      state: "exact",
    })),
    unavailableReason: summary.ingest.datapointsPerSec === 0 ? "No accepted exports yet." : undefined,
  };
}

function explorerRows(points: MetricPoint[]): ExplorerRow[] {
  const bySeries = new Map<string, ExplorerRow>();
  for (const point of points) {
    const existing = bySeries.get(point.seriesKey);
    if (existing) {
      existing.latest = point.value ?? existing.latest;
      existing.lastObservedAtMs = Math.max(existing.lastObservedAtMs, point.observedAtMs);
      existing.cardinality += 1;
      existing.status = statusForPoint(point);
      continue;
    }
    bySeries.set(point.seriesKey, {
      seriesKey: point.seriesKey,
      metricName: point.metric.name,
      metricType: point.metric.type,
      unit: point.metric.unit,
      latest: point.value,
      resourceService: typeof point.resource["service.name"] === "string" ? point.resource["service.name"] : undefined,
      attributes: point.attributes,
      cardinality: 1,
      lastObservedAtMs: point.observedAtMs,
      status: statusForPoint(point),
    });
  }
  return [...bySeries.values()].sort((left, right) => left.metricName.localeCompare(right.metricName) || left.seriesKey.localeCompare(right.seriesKey));
}

function chartPoint(point: MetricPoint, value: number, aggregation: ChartPoint["aggregation"], datapointCount: number): ChartPoint {
  return {
    observedAtMs: point.observedAtMs,
    value,
    seriesKey: point.seriesKey,
    metricName: point.metric.name,
    aggregation,
    datapointCount,
    service: typeof point.resource["service.name"] === "string" ? point.resource["service.name"] : undefined,
    route: typeof point.attributes["http.route"] === "string" ? point.attributes["http.route"] : undefined,
    statusCode: typeof point.attributes["http.response.status_code"] === "number" ? point.attributes["http.response.status_code"] : undefined,
    state: point.derivationStatus === "usable" ? "exact" : "degraded",
  };
}

function statusForPoint(point: MetricPoint): CardState {
  return point.derivationStatus === "usable" ? "healthy" : point.derivationStatus === "incomplete" ? "degraded" : "unavailable";
}

function isHttpRequestCount(point: MetricPoint): boolean {
  return point.metric.type === "sum" &&
    point.metric.temporality === "delta" &&
    point.metric.monotonic === true &&
    point.derivationStatus === "usable" &&
    point.value !== undefined &&
    point.value >= 0 &&
    (point.metric.name === "http.server.request.count" || point.metric.name === "http.server.requests");
}

function isHttpDurationHistogram(point: MetricPoint): boolean {
  return point.metric.type === "histogram" &&
    point.metric.temporality === "delta" &&
    point.derivationStatus === "usable" &&
    point.buckets !== undefined &&
    (point.metric.name === "http.server.duration" || point.metric.name === "http.server.request.duration");
}

function isErrorStatus(point: MetricPoint): boolean {
  const status = point.attributes["http.response.status_code"] ?? point.attributes["http.status_code"];
  return typeof status === "number" && status >= 500;
}
```

- [ ] **Step 4: Run focused projection tests**

Run:

```powershell
deno test tests/backend/dashboard_projection_test.ts
```

Expected:

```text
ok | 2 passed | 0 failed
```

- [ ] **Step 5: Update API contract docs**

In `docs/plans/04-implementation/04-api-and-event-contracts.md`, add a concise type excerpt for `DashboardProjection`:

```md
`DashboardProjection` exposes card states, chart series, explorer rows, receiver
status, ingest counters, and warning summaries. It is JSON-safe and intentionally
does not expose raw protobuf request bodies.
```

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
deno task check
git add -- src/backend/dashboard_projection.ts tests/backend/dashboard_projection_test.ts docs/plans/04-implementation/04-api-and-event-contracts.md
git commit -m "feat: add dashboard projection contracts"
```

Expected: commit succeeds.

---

### Task 3: Serve Dashboard Projection Endpoints And Assets

**Files:**
- Modify: `src/backend/app_server.ts`
- Create: `tests/backend/app_server_dashboard_test.ts`
- Create: `src/ui/app_shell.ts`
- Modify: `src/ui/app_html.ts` or replace imports with `src/ui/app_shell.ts`
- Modify: `tests/ui/app_html_test.ts`

**Interfaces:**
- Consumes: `buildDashboardProjection(snapshot, summary, options)` from Task 2.
- Produces:
  - `GET /api/dashboard?windowMs=60000`
  - `POST /api/dashboard/clear`
  - `GET /assets/app.js`
  - `GET /assets/styles.css`
  - `buildAppShell(initialProjectionJson: unknown): string`

- [ ] **Step 1: Write failing app server endpoint tests**

Create `tests/backend/app_server_dashboard_test.ts`:

```ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { handleAppRequest } from "../../src/backend/app_server.ts";
import { buildReceiverState } from "../../src/backend/receiver.ts";

Deno.test("dashboard app server serves dashboard projection endpoint", async () => {
  const state = buildReceiverState(1_000);
  const response = await handleAppRequest(new Request("http://127.0.0.1:4319/api/dashboard?windowMs=60000"), state);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("cache-control"), "no-store");
  assertEquals(body.receiver.endpoint, "http://127.0.0.1:4318/v1/metrics");
  assertEquals(body.windowMs, 60_000);
  assertEquals(body.cards.latency.state, "unavailable");
});

Deno.test("dashboard app server serves app shell and static asset placeholders", async () => {
  const state = buildReceiverState(1_000);
  const html = await handleAppRequest(new Request("http://127.0.0.1:4319/"), state).then((response) => response.text());
  const script = await handleAppRequest(new Request("http://127.0.0.1:4319/assets/app.js"), state);
  const css = await handleAppRequest(new Request("http://127.0.0.1:4319/assets/styles.css"), state);

  assertStringIncludes(html, "id=\"root\"");
  assertStringIncludes(html, "/assets/app.js");
  assertEquals(script.headers.get("content-type"), "text/javascript; charset=utf-8");
  assertEquals(css.headers.get("content-type"), "text/css; charset=utf-8");
});

Deno.test("dashboard clear endpoint resets store through explicit boundary", async () => {
  const state = buildReceiverState(1_000);
  const response = await handleAppRequest(new Request("http://127.0.0.1:4319/api/dashboard/clear", { method: "POST" }), state);

  assertEquals(response.status, 200);
  assertEquals((await response.json()).ok, true);
});
```

- [ ] **Step 2: Run tests to verify endpoints fail**

Run:

```powershell
deno test tests/backend/app_server_dashboard_test.ts
```

Expected: FAIL because `/api/dashboard`, asset routes, and clear route are not implemented.

- [ ] **Step 3: Add app shell**

Create `src/ui/app_shell.ts`:

```ts
export function buildAppShell(initialProjection: unknown): string {
  const projectionJson = serializeForInlineScript(initialProjection);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OTEL Inspector</title>
    <link rel="stylesheet" href="/assets/styles.css">
  </head>
  <body>
    <div id="root"></div>
    <script>globalThis.__OTEL_INITIAL_PROJECTION__ = ${projectionJson};</script>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
```

- [ ] **Step 4: Add backend reset helper**

In `src/backend/live_bus.ts`, add:

```ts
export function clearReceiverState(state: ReceiverState, observedAtMs = Date.now()): void {
  state.store = createTelemetryStore();
  state.startedAtMs = observedAtMs;
  delete state.lastWarning;
  for (const category of Object.keys(state.failureCounts) as ReceiverFailureCategory[]) {
    state.failureCounts[category] = 0;
  }
}
```

This intentionally resets retained telemetry for local dogfood. It does not stop the receiver.

- [ ] **Step 5: Update app server routes**

Replace the top imports in `src/backend/app_server.ts` with:

```ts
import { buildDashboardProjection } from "./dashboard_projection.ts";
import { clearReceiverState, currentSummary, type ReceiverState } from "./receiver.ts";
import { buildAppShell } from "../ui/app_shell.ts";
```

If `currentSummary` and `clearReceiverState` are not exported from `receiver.ts`, update `src/backend/receiver.ts` exports:

```ts
export { buildReceiverState, clearReceiverState, RECEIVER_CONTRACT, receiverEndpoint };
```

Also update the `src/backend/receiver.ts` import from `./live_bus.ts` so the
re-export has a local binding:

```ts
import {
  buildLiveTelemetrySummary,
  buildReceiverState,
  clearReceiverState,
  ReceiverState,
  recordReceiverExport,
  recordReceiverFailure,
} from "./live_bus.ts";
```

Add constants near `APP_SERVER`:

```ts
const EMPTY_APP_JS = `console.info("OTEL Inspector dashboard asset placeholder");`;
const EMPTY_STYLES = `html,body{margin:0;min-height:100%;overflow-x:clip;background:#23272a;color:#f2f0eb;font-family:system-ui,sans-serif}`;
```

Add the clear route before the existing global `GET` method guard:

```ts
  if (url.pathname === "/api/dashboard/clear") {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    clearReceiverState(state);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }
```

Add the `GET` projection and asset routes after the method guard but before
`/api/summary`:

```ts
  if (url.pathname === "/api/dashboard") {
    const summary = currentSummary(state);
    const windowMs = parseWindowMs(url.searchParams.get("windowMs"));
    return Response.json(buildDashboardProjection(state.store.snapshot(), summary, { windowMs }), {
      headers: { "cache-control": "no-store" },
    });
  }

  if (url.pathname === "/assets/app.js") {
    return new Response(EMPTY_APP_JS, {
      headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (url.pathname === "/assets/styles.css") {
    return new Response(EMPTY_STYLES, {
      headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-store" },
    });
  }
```

Replace the `/` response body with:

```ts
    const summary = currentSummary(state);
    return new Response(buildAppShell(buildDashboardProjection(state.store.snapshot(), summary)), {
```

Add helper at the end:

```ts
function parseWindowMs(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 15 * 60_000) : 60_000;
}
```

- [ ] **Step 6: Run focused app server tests**

Run:

```powershell
deno test tests/backend/app_server_dashboard_test.ts tests/backend/app_server_test.ts tests/ui/app_html_test.ts
```

Expected: app server tests pass. `tests/ui/app_html_test.ts` may fail because it imports `buildAppHtml()`. If so, update it to import `buildAppShell()` and assert the script safety of `__OTEL_INITIAL_PROJECTION__`.

- [ ] **Step 7: Commit Task 3**

Run:

```powershell
deno task check
git add -- src/backend/app_server.ts src/backend/live_bus.ts src/backend/receiver.ts src/ui/app_shell.ts tests/backend/app_server_dashboard_test.ts tests/backend/app_server_test.ts tests/ui/app_html_test.ts
git commit -m "feat: serve dashboard projection endpoints"
```

Expected: commit succeeds.

---

### Task 4: Add Local React Build And shadcn-Style Primitives

**Files:**
- Modify: `deno.json`
- Create: `src/ui/dashboard/main.tsx`
- Create: `src/ui/dashboard/App.tsx`
- Create: `src/ui/dashboard/types.ts`
- Create: `src/ui/dashboard/components/ui/button.tsx`
- Create: `src/ui/dashboard/components/ui/card.tsx`
- Create: `src/ui/dashboard/components/ui/badge.tsx`
- Create: `src/ui/dashboard/components/ui/tabs.tsx`
- Create: `src/ui/dashboard/components/ui/chart.tsx`
- Create: `src/ui/dashboard/styles.css`
- Modify: `src/backend/app_server.ts`

**Interfaces:**
- Consumes: `GET /api/dashboard` from Task 3.
- Produces:
  - `deno task ui:build`
  - `src/ui/dist/app.js`
  - `src/ui/dist/styles.css`
  - local primitives with shadcn-like class composition and Hallmark state/focus requirements.

- [ ] **Step 1: Add failing UI build task**

Modify `deno.json` tasks:

```json
"ui:build": "deno run --allow-read --allow-write=src/ui/dist --allow-env=NODE_ENV --allow-scripts=npm:esbuild@0.25.8 npm:esbuild@0.25.8 src/ui/dashboard/main.tsx --bundle --format=esm --jsx=automatic --outfile=src/ui/dist/app.js --loader:.css=text; Copy-Item src/ui/dashboard/styles.css src/ui/dist/styles.css",
"check": "deno check src/main.ts src/backend/receiver_worker.ts src/ui/dashboard/main.tsx tests/**/*.ts tools/**/*.ts",
"ok": "deno task ui:build && deno task fmt:check && deno task lint && deno task check && deno task test"
```

Run:

```powershell
deno task ui:build
```

Expected: FAIL because `src/ui/dashboard/main.tsx` does not exist.

- [ ] **Step 2: Create browser types**

Create `src/ui/dashboard/types.ts` by copying the JSON-facing projection type names from `src/backend/dashboard_projection.ts` without importing backend files:

```ts
export type CardState = "healthy" | "empty" | "paused" | "degraded" | "stale" | "unavailable";

export type DashboardCard = {
  id: "latency" | "throughput" | "error-rate" | "active-requests" | "ingest" | "dropped";
  label: string;
  state: CardState;
  value?: number;
  unit?: string;
  source: string;
  detailTarget?: { metricName?: string; seriesKey?: string };
};

export type ChartPoint = {
  observedAtMs: number;
  value: number;
  seriesKey: string;
  metricName: string;
  aggregation: "latest" | "sum" | "bucket-upper-bound" | "rate";
  datapointCount: number;
  service?: string;
  route?: string;
  statusCode?: number;
  state: "exact" | "estimated" | "degraded";
};

export type ChartSeries = {
  id: "latency" | "throughput" | "error-rate" | "ingest";
  label: string;
  unit: string;
  windowMs: number;
  points: ChartPoint[];
  unavailableReason?: string;
};

export type ExplorerRow = {
  seriesKey: string;
  metricName: string;
  metricType: string;
  unit?: string;
  latest?: number;
  rate?: number;
  resourceService?: string;
  attributes: Record<string, string | number | boolean>;
  cardinality: number;
  lastObservedAtMs: number;
  status: CardState;
};

export type DashboardProjection = {
  observedAtMs: number;
  windowMs: number;
  receiver: { endpoint: string; live: boolean; paused: boolean };
  ingest: { exportsPerSec: number; datapointsPerSec: number; bytesPerSec: number; dropped: number };
  cards: {
    latency: DashboardCard;
    throughput: DashboardCard;
    errorRate: DashboardCard;
    activeRequests: DashboardCard;
    ingest: DashboardCard;
    dropped: DashboardCard;
  };
  charts: {
    latency: ChartSeries;
    throughput: ChartSeries;
    errorRate: ChartSeries;
    ingest: ChartSeries;
  };
  explorer: { rows: ExplorerRow[] };
  warnings: Array<{ code: string; message: string }>;
};

declare global {
  interface Window {
    __OTEL_INITIAL_PROJECTION__?: DashboardProjection;
  }
}
```

- [ ] **Step 3: Create minimal UI primitives**

Create `src/ui/dashboard/components/ui/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return <button className={`ui-button ${className}`.trim()} {...rest} />;
}
```

Create `src/ui/dashboard/components/ui/card.tsx`:

```tsx
import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`ui-card ${className}`.trim()} {...props} />;
}
```

Create `src/ui/dashboard/components/ui/badge.tsx`:

```tsx
import type { HTMLAttributes } from "react";

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`ui-badge ${className}`.trim()} {...props} />;
}
```

Create `src/ui/dashboard/components/ui/tabs.tsx`:

```tsx
type TabsProps = {
  value: string;
  onValueChange(value: string): void;
  values: Array<{ value: string; label: string; disabled?: boolean }>;
};

export function Tabs({ value, onValueChange, values }: TabsProps) {
  return (
    <div className="ui-tabs" role="tablist" aria-label="Dashboard views">
      {values.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          className="ui-tab"
          aria-selected={item.value === value}
          disabled={item.disabled}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

Create `src/ui/dashboard/components/ui/chart.tsx`:

```tsx
import type { ReactNode } from "react";

export type ChartConfig = Record<string, { label: string; color?: string }>;

export function ChartContainer(props: { config: ChartConfig; className?: string; children: ReactNode }) {
  return <div className={`chart-container ${props.className ?? ""}`.trim()}>{props.children}</div>;
}

export function ChartTooltipContent(props: { label?: string; value?: string }) {
  return (
    <div className="chart-tooltip">
      {props.label && <span className="chart-tooltip__label">{props.label}</span>}
      {props.value && <strong>{props.value}</strong>}
    </div>
  );
}
```

- [ ] **Step 4: Create app entry and root component**

Create `src/ui/dashboard/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { DashboardProjection } from "./types.ts";
import { Button } from "./components/ui/button.tsx";
import { Badge } from "./components/ui/badge.tsx";
import { Tabs } from "./components/ui/tabs.tsx";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "metrics", label: "Metrics" },
  { value: "payload", label: "Payload" },
  { value: "settings", label: "Settings" },
];

export function App() {
  const [projection, setProjection] = useState<DashboardProjection>(() => window.__OTEL_INITIAL_PROJECTION__!);
  const [activeTab, setActiveTab] = useState("overview");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }
    const id = setInterval(async () => {
      const response = await fetch(`/api/dashboard?windowMs=${projection.windowMs}`, { cache: "no-store" });
      setProjection(await response.json());
    }, 1000);
    return () => clearInterval(id);
  }, [paused, projection.windowMs]);

  return (
    <main className="workbench">
      <header className="workbench__header">
        <div>
          <h1>OTEL Inspector</h1>
          <p className="endpoint">{projection.receiver.endpoint}</p>
        </div>
        <div className="toolbar" aria-label="Dashboard controls">
          <Badge data-state={paused ? "paused" : "live"}>{paused ? "Paused view" : "Live"}</Badge>
          <Button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</Button>
          <Button type="button" onClick={async () => {
            await fetch("/api/dashboard/clear", { method: "POST" });
            const response = await fetch(`/api/dashboard?windowMs=${projection.windowMs}`, { cache: "no-store" });
            setProjection(await response.json());
          }}>Clear</Button>
        </div>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab} values={tabs} />
      <section className="workbench__body">
        <p className="empty-state">Dashboard tab: {activeTab}</p>
      </section>
    </main>
  );
}
```

Create `src/ui/dashboard/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import styles from "./styles.css";

const style = document.createElement("style");
style.textContent = styles;
document.head.append(style);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 5: Add Hallmark/shadcn base CSS**

Create `src/ui/dashboard/styles.css`:

```css
/* Hallmark · pre-emit critique: P5 H4 E4 S5 R5 V4
 * Hallmark · macrostructure: Workbench · tone: operator-grade · anchor hue: blue-green · contrast: pass (40-41) · mobile: pass (34,49,50-57)
 */
:root {
  color-scheme: dark;
  --color-paper: #23272a;
  --color-paper-2: #2b3033;
  --color-panel: #30363a;
  --color-ink: #f2f0eb;
  --color-muted: #b9c0bb;
  --color-rule: rgba(242, 240, 235, 0.18);
  --color-live: #6edf98;
  --color-warning: #ff9f3a;
  --color-error: #dc695f;
  --color-selected: #6f8dff;
  --color-focus: #9db1ff;
  --chart-latency: var(--color-selected);
  --chart-throughput: var(--color-live);
  --chart-error: var(--color-error);
  --chart-ingest: var(--color-warning);
  --font-body: "Aptos", "Segoe UI", system-ui, sans-serif;
  --font-mono: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --radius-1: 6px;
  --dur-fast: 120ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

html,
body {
  margin: 0;
  min-height: 100%;
  overflow-x: clip;
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-body);
}

* {
  box-sizing: border-box;
}

button {
  font: inherit;
}

.workbench {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
}

.workbench__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-width: 0;
}

h1 {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.endpoint,
.empty-state {
  margin: var(--space-1) 0 0;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.toolbar,
.ui-tabs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.ui-button,
.ui-tab {
  min-height: 36px;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-1);
  background: var(--color-panel);
  color: var(--color-ink);
  padding: 0 var(--space-3);
  white-space: nowrap;
  transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.ui-button:hover,
.ui-tab:hover {
  background: var(--color-paper-2);
}

.ui-button:active,
.ui-tab:active {
  transform: translateY(1px);
}

.ui-button:focus-visible,
.ui-tab:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.ui-button:disabled,
.ui-tab:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ui-tab[aria-selected="true"],
.ui-badge[data-state="live"] {
  border-color: var(--color-live);
}

.ui-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 1px solid var(--color-rule);
  border-radius: 999px;
  padding: 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  white-space: nowrap;
}

.ui-card {
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-1);
  background: var(--color-panel);
  padding: var(--space-4);
}

.chart-container {
  min-height: 220px;
  width: 100%;
}

@media (max-width: 520px) {
  .workbench__header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
  }
}
```

- [ ] **Step 6: Run UI build**

Run:

```powershell
deno task ui:build
```

Expected:

```text
src/ui/dist/app.js ...
```

- [ ] **Step 7: Serve built assets from disk**

In `src/backend/app_server.ts`, replace placeholder asset constants/routes with disk reads:

```ts
const UI_DIST_DIR = new URL("../ui/dist/", import.meta.url);
```

Replace `/assets/app.js` route:

```ts
    return assetResponse(new URL("app.js", UI_DIST_DIR), "text/javascript; charset=utf-8");
```

Replace `/assets/styles.css` route:

```ts
    return assetResponse(new URL("styles.css", UI_DIST_DIR), "text/css; charset=utf-8");
```

Add helper:

```ts
function assetResponse(url: URL, contentType: string): Response {
  try {
    return new Response(Deno.readFileSync(url), {
      headers: { "content-type": contentType, "cache-control": "no-store" },
    });
  } catch {
    return new Response("Asset not built. Run deno task ui:build.", { status: 503 });
  }
}
```

- [ ] **Step 8: Run checks**

Run:

```powershell
deno task ui:build
deno test tests/backend/app_server_dashboard_test.ts
deno task check
```

Expected: all pass.

- [ ] **Step 9: Commit Task 4**

Run:

```powershell
git add -- deno.json src/backend/app_server.ts src/ui/app_shell.ts src/ui/dashboard src/ui/dist tests/backend/app_server_dashboard_test.ts
git commit -m "feat: add React dashboard asset shell"
```

Expected: commit succeeds.

---

### Task 5: Build Overview Cards

**Files:**
- Create: `src/ui/dashboard/components/OverviewCards.tsx`
- Modify: `src/ui/dashboard/App.tsx`
- Modify: `src/ui/dashboard/styles.css`
- Modify: `tests/ui/app_html_test.ts`

**Interfaces:**
- Consumes: `DashboardProjection["cards"]`.
- Produces: `OverviewCards(props: { cards: DashboardProjection["cards"] })`.

- [ ] **Step 1: Add card render assertions**

In `tests/ui/app_html_test.ts`, add assertions against the shell:

```ts
assertStringIncludes(html, "OTEL Inspector");
assertStringIncludes(html, "__OTEL_INITIAL_PROJECTION__");
assertStringIncludes(html, "/assets/app.js");
```

Browser-rendered card assertions will be covered in manual visual QA until a DOM test runner is introduced.

- [ ] **Step 2: Create OverviewCards component**

Create `src/ui/dashboard/components/OverviewCards.tsx`:

```tsx
import type { DashboardProjection, DashboardCard } from "../types.ts";
import { Card } from "./ui/card.tsx";

type Cards = DashboardProjection["cards"];

const orderedCards: Array<keyof Cards> = ["latency", "throughput", "errorRate", "activeRequests", "ingest", "dropped"];

export function OverviewCards({ cards }: { cards: Cards }) {
  return (
    <section className="overview-grid" aria-label="Overview cards">
      {orderedCards.map((key) => <OverviewCard key={cards[key].id} card={cards[key]} />)}
    </section>
  );
}

function OverviewCard({ card }: { card: DashboardCard }) {
  return (
    <Card className="overview-card" data-state={card.state}>
      <div className="overview-card__topline">
        <p className="overview-card__label">{card.label}</p>
        <span className="overview-card__state">{card.state}</span>
      </div>
      <p className="overview-card__value">
        {card.value === undefined ? "—" : formatValue(card.value)}
        {card.unit && <span>{card.unit}</span>}
      </p>
      <p className="overview-card__source">{card.source}</p>
    </Card>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}
```

- [ ] **Step 3: Wire cards into App**

In `src/ui/dashboard/App.tsx`, import and render:

```tsx
import { OverviewCards } from "./components/OverviewCards.tsx";
```

Replace the body placeholder with:

```tsx
        {activeTab === "overview" && <OverviewCards cards={projection.cards} />}
        {activeTab !== "overview" && <p className="empty-state">Dashboard tab: {activeTab}</p>}
```

- [ ] **Step 4: Add card CSS**

Append to `src/ui/dashboard/styles.css`:

```css
.overview-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-3);
}

.overview-card {
  min-height: 136px;
  display: grid;
  gap: var(--space-2);
}

.overview-card[data-state="degraded"] {
  border-color: color-mix(in srgb, var(--color-warning) 60%, var(--color-rule));
}

.overview-card[data-state="unavailable"],
.overview-card[data-state="empty"] {
  color: var(--color-muted);
}

.overview-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.overview-card__label,
.overview-card__source,
.overview-card__state {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.overview-card__state {
  font-family: var(--font-mono);
  white-space: nowrap;
}

.overview-card__value {
  margin: 0;
  font-variant-numeric: tabular-nums;
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  line-height: 1;
}

.overview-card__value span {
  margin-inline-start: var(--space-1);
  font-size: 0.875rem;
  color: var(--color-muted);
}

@media (max-width: 1100px) {
  .overview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Verify cards**

Run:

```powershell
deno task ui:build
deno test tests/ui/app_html_test.ts
deno task check
```

Expected: all pass.

- [ ] **Step 6: Commit Task 5**

Run:

```powershell
git add -- src/ui/dashboard/App.tsx src/ui/dashboard/components/OverviewCards.tsx src/ui/dashboard/styles.css src/ui/dist tests/ui/app_html_test.ts
git commit -m "feat: render dashboard overview cards"
```

Expected: commit succeeds.

---

### Task 6: Build Live Charts With Recharts

**Files:**
- Create: `src/ui/dashboard/charts/LiveCharts.tsx`
- Modify: `src/ui/dashboard/App.tsx`
- Modify: `src/ui/dashboard/styles.css`
- Modify: `deno.json`

**Interfaces:**
- Consumes: `DashboardProjection["charts"]`.
- Produces: `LiveCharts(props: { charts: DashboardProjection["charts"] })`.

- [ ] **Step 1: Add Recharts imports to UI**

Modify `src/ui/dashboard/charts/LiveCharts.tsx`:

```tsx
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "../types.ts";
import { Card } from "../components/ui/card.tsx";
import { ChartContainer } from "../components/ui/chart.tsx";

export function LiveCharts({ charts }: { charts: { latency: ChartSeries; throughput: ChartSeries; errorRate: ChartSeries; ingest: ChartSeries } }) {
  return (
    <section className="chart-grid" aria-label="Live charts">
      <TelemetryChart title="Latency" series={charts.latency} kind="line" color="var(--chart-latency)" />
      <TelemetryChart title="Throughput" series={charts.throughput} kind="area" color="var(--chart-throughput)" />
      <TelemetryChart title="Errors" series={charts.errorRate} kind="line" color="var(--chart-error)" />
      <TelemetryChart title="Ingest" series={charts.ingest} kind="area" color="var(--chart-ingest)" />
    </section>
  );
}

function TelemetryChart(props: { title: string; series: ChartSeries; kind: "line" | "area"; color: string }) {
  const data = props.series.points.map((point) => ({
    time: new Date(point.observedAtMs).toLocaleTimeString(),
    value: point.value,
    route: point.route ?? "",
    service: point.service ?? "",
  }));

  return (
    <Card className="chart-card">
      <div className="chart-card__header">
        <h2>{props.title}</h2>
        <span>{props.series.windowMs / 60_000}m</span>
      </div>
      {data.length === 0 ? (
        <p className="empty-state">{props.series.unavailableReason ?? "No chart data in this window."}</p>
      ) : (
        <ChartContainer config={{ value: { label: props.title, color: props.color } }} className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            {props.kind === "line" ? (
              <LineChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} stroke="var(--color-rule)" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={42} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={props.color} strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <AreaChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} stroke="var(--color-rule)" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={42} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke={props.color} fill={props.color} fillOpacity={0.18} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Build to verify Recharts dependency is missing or resolves**

Run:

```powershell
deno task ui:build
```

Expected before import map update: FAIL if `recharts` is not resolved.

- [ ] **Step 3: Add Deno import for Recharts**

In `deno.json` imports, add:

```json
"react": "npm:react@^19.1.0",
"react-dom/client": "npm:react-dom@^19.1.0/client",
"recharts": "npm:recharts@^3.0.0"
```

If Deno reports a newer incompatible React peer requirement from Recharts, keep React/Recharts on the same supported major versions Deno resolves and record the exact versions in `deno.lock`.

- [ ] **Step 4: Wire charts under overview**

In `src/ui/dashboard/App.tsx`, import:

```tsx
import { LiveCharts } from "./charts/LiveCharts.tsx";
```

Render after `OverviewCards`:

```tsx
        {activeTab === "overview" && (
          <>
            <OverviewCards cards={projection.cards} />
            <LiveCharts charts={projection.charts} />
          </>
        )}
```

- [ ] **Step 5: Add chart CSS**

Append to `src/ui/dashboard/styles.css`:

```css
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin-block-start: var(--space-3);
}

.chart-card {
  min-height: 300px;
}

.chart-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-block-end: var(--space-3);
}

.chart-card__header h2 {
  margin: 0;
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.chart-card__header span {
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Verify charts build**

Run:

```powershell
deno task ui:build
deno task check
```

Expected: both pass.

- [ ] **Step 7: Commit Task 6**

Run:

```powershell
git add -- deno.json deno.lock src/ui/dashboard/App.tsx src/ui/dashboard/charts/LiveCharts.tsx src/ui/dashboard/styles.css src/ui/dist
git commit -m "feat: add dashboard live charts"
```

Expected: commit succeeds.

---

### Task 7: Build Metrics Explorer And Filters

**Files:**
- Create: `src/ui/dashboard/components/MetricsExplorer.tsx`
- Modify: `src/ui/dashboard/App.tsx`
- Modify: `src/ui/dashboard/styles.css`

**Interfaces:**
- Consumes: `DashboardProjection["explorer"]["rows"]`.
- Produces: `MetricsExplorer(props: { rows: ExplorerRow[] })`.

- [ ] **Step 1: Create MetricsExplorer component**

Create `src/ui/dashboard/components/MetricsExplorer.tsx`:

```tsx
import { useMemo, useState } from "react";
import type { ExplorerRow } from "../types.ts";

export function MetricsExplorer({ rows }: { rows: ExplorerRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((row) =>
      row.metricName.toLowerCase().includes(needle) ||
      row.metricType.toLowerCase().includes(needle) ||
      (row.resourceService ?? "").toLowerCase().includes(needle) ||
      JSON.stringify(row.attributes).toLowerCase().includes(needle)
    );
  }, [query, rows]);

  return (
    <section className="explorer" aria-label="Metrics Explorer">
      <label className="filter-label">
        <span>Filter metrics</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="service, metric, attribute"
          aria-label="Filter metrics"
        />
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Latest</th>
              <th>Service</th>
              <th>Status</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.seriesKey}>
                <td>{row.metricName}</td>
                <td>{row.metricType}</td>
                <td>{row.unit ?? "—"}</td>
                <td>{row.latest === undefined ? "—" : row.latest}</td>
                <td>{row.resourceService ?? "—"}</td>
                <td>{row.status}</td>
                <td>{new Date(row.lastObservedAtMs).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="empty-state">No metrics match the current filter.</p>}
    </section>
  );
}
```

- [ ] **Step 2: Wire explorer tab**

In `src/ui/dashboard/App.tsx`, import:

```tsx
import { MetricsExplorer } from "./components/MetricsExplorer.tsx";
```

Render:

```tsx
        {activeTab === "metrics" && <MetricsExplorer rows={projection.explorer.rows} />}
        {activeTab !== "overview" && activeTab !== "metrics" && <p className="empty-state">Dashboard tab: {activeTab}</p>}
```

- [ ] **Step 3: Add explorer CSS**

Append to `src/ui/dashboard/styles.css`:

```css
.explorer {
  display: grid;
  gap: var(--space-3);
}

.filter-label {
  display: grid;
  gap: var(--space-1);
  max-width: 420px;
}

.filter-label span {
  color: var(--color-muted);
  font-size: 0.75rem;
}

.filter-label input {
  min-height: 40px;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-1);
  outline: 2px solid transparent;
  outline-offset: 1px;
  background: var(--color-panel);
  color: var(--color-ink);
  padding: 0 var(--space-3);
}

.filter-label input:focus-visible {
  outline-color: var(--color-focus);
}

.table-wrap {
  overflow: auto;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-1);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-rule);
  text-align: left;
  white-space: nowrap;
}

th {
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

@media (max-width: 640px) {
  .table-wrap {
    border: 0;
  }

  table,
  thead,
  tbody,
  tr,
  th,
  td {
    display: block;
  }

  thead {
    display: none;
  }

  tr {
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-1);
    margin-block-end: var(--space-2);
  }

  td {
    border-bottom: 0;
    white-space: normal;
  }
}
```

- [ ] **Step 4: Verify explorer**

Run:

```powershell
deno task ui:build
deno task check
```

Expected: both pass.

- [ ] **Step 5: Commit Task 7**

Run:

```powershell
git add -- src/ui/dashboard/App.tsx src/ui/dashboard/components/MetricsExplorer.tsx src/ui/dashboard/styles.css src/ui/dist
git commit -m "feat: add metrics explorer"
```

Expected: commit succeeds.

---

### Task 8: Final Visual QA, DOX, And Evidence Closeout

**Files:**
- Modify: `docs/plans/06-evidence/acceptance-matrix.md`
- Modify: `docs/plans/06-evidence/dogfood-checklist.md`
- Modify: `docs/plans/05-linear-issues/OI-013.md`
- Modify: `docs/plans/05-linear-issues/OI-014.md`
- Modify: `docs/plans/05-linear-issues/OI-015.md`
- Modify: `docs/plans/05-linear-issues/OI-017.md`
- Modify: closest applicable `AGENTS.md` only if the implementation changes durable contracts or child indexes.

**Interfaces:**
- Consumes: all previous M3 tasks.
- Produces: verification evidence, issue status closeout, and refreshed DOX only if contracts changed.

- [ ] **Step 1: Run final automated gates**

Run:

```powershell
deno task ok
git diff --check
```

Expected: all pass with no whitespace errors.

- [ ] **Step 2: Start local app for visual QA**

Run:

```powershell
deno task dev
```

Expected:

```text
OTEL Inspector receiver listening at http://127.0.0.1:4318/v1/metrics
OTEL Inspector dashboard listening at http://127.0.0.1:4319/
```

Keep the server running only for visual QA. Stop it before final response.

- [ ] **Step 3: Run Hallmark manual QA checklist**

Open `http://127.0.0.1:4319/` in the WebView or browser and check:

```text
[ ] 320px width: no horizontal scroll, no wrapped tabs/buttons.
[ ] 375px width: no horizontal scroll, cards stack cleanly.
[ ] 414px width: no horizontal scroll, controls remain reachable.
[ ] 768px width: charts and explorer remain readable.
[ ] Desktop docked width: dense but readable, no fake chrome, no nested cards.
[ ] Focus ring appears immediately on tabs, buttons, and filter input.
[ ] Pause freezes UI updates while receiver endpoint still reads live.
[ ] Clear resets visible counters through /api/dashboard/clear.
[ ] Empty/degraded states explain missing telemetry without invented values.
[ ] Recharts panels have stable height and do not render blank.
```

If any item fails, fix the relevant CSS/component and repeat `deno task ui:build`.

- [ ] **Step 4: Update issue docs**

For `docs/plans/05-linear-issues/OI-013.md`, `OI-014.md`, `OI-015.md`, and `OI-017.md`, set:

```yaml
status: implemented
updated: 2026-07-08
```

Add this Evidence bullet to each:

```md
- M3 dashboard implementation covered by `deno task ok` plus manual Hallmark
  visual QA at 320px, 375px, 414px, 768px, and desktop docked width.
```

- [ ] **Step 5: Update evidence docs**

In `docs/plans/06-evidence/acceptance-matrix.md`, update M3 rows to cite:

```md
`tests/backend/dashboard_projection_test.ts`, `tests/backend/app_server_dashboard_test.ts`, dashboard visual QA notes
```

In `docs/plans/06-evidence/dogfood-checklist.md`, mark:

```md
- [x] Overview dashboard renders no-telemetry, live, paused, and degraded states.
- [x] Metrics Explorer filters by service/resource/metric/attribute text.
- [x] Dashboard has been checked at 320px, 375px, 414px, 768px, and desktop docked width.
```

Do not mark Payload Inspector, redaction, fixture export, packaging, SQLite, traces, logs, or proxy work complete.

- [ ] **Step 6: DOX pass**

Review the DOX chain for changed paths:

```powershell
Get-Content -Raw AGENTS.md
Get-Content -Raw docs/AGENTS.md
Get-Content -Raw docs/superpowers/AGENTS.md
Get-Content -Raw src/AGENTS.md
Get-Content -Raw src/backend/AGENTS.md
Get-Content -Raw src/ui/AGENTS.md
Get-Content -Raw tests/AGENTS.md
```

Update only the nearest owning `AGENTS.md` if the implementation changed durable purpose, workflow, contracts, child indexes, or operating rules. If no durable DOX contract changed, leave docs unchanged and report that the DOX pass found no required update.

- [ ] **Step 7: Refresh Repowise**

Run after final code/docs changes:

```powershell
repowise update
```

Expected: update succeeds and indexes the current commit/worktree state.

- [ ] **Step 8: Final commit**

Run:

```powershell
deno task ok
git status --short
git add -- docs/plans/06-evidence/acceptance-matrix.md docs/plans/06-evidence/dogfood-checklist.md docs/plans/05-linear-issues/OI-013.md docs/plans/05-linear-issues/OI-014.md docs/plans/05-linear-issues/OI-015.md docs/plans/05-linear-issues/OI-017.md
git add -- src tests deno.json deno.lock
git commit -m "feat: build dashboard workbench"
```

Expected: commit succeeds. Add any changed `AGENTS.md` only if Step 6 intentionally changed it.

---

## Final Closeout

- [ ] `deno task ok` passes.
- [ ] Visual QA checklist passes at 320px, 375px, 414px, 768px, and desktop docked width.
- [ ] `git status --short` contains no accidental unstaged generated output.
- [ ] Unrelated `AGENTS.md` changes are either intentionally committed or explicitly left alone.
- [ ] M3 issue/evidence docs are updated, while M4/M5 work remains pending.
- [ ] Repowise has been refreshed after meaningful implementation.

## Execution Options

Plan complete when this file is saved. Recommended execution is
Subagent-Driven: one fresh implementation subagent per task, with review between
tasks and `deno task ok` at the end. Inline execution is acceptable if the user
wants one continuous session instead.
