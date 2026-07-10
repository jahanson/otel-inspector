# Dashboard Workbench Design

## Status

- Approved for implementation planning.
- Date: 2026-07-08.
- Scope: prep lane plus M3 docked inspector dashboard work.

## Goal

Restore a clean implementation handoff, reconcile M2 substrate status, and build
the M3 dashboard as a contract-backed observability workbench.

The dashboard should feel like a local DevTools panel for telemetry: dense,
calm, exact, and safe. It should use the implemented telemetry substrate rather
than raw OTLP protobuf trees, use shadcn-style components for the visible
surface, and meet Hallmark anti-slop quality gates before it is considered
done.

## Non-Goals

- Do not implement the M4 Payload Inspector tree, redaction policy, raw capture
  opt-in, or redacted fixture export in this slice.
- Do not implement SQLite session history, traces, logs, or proxy-forward mode.
- Do not persist raw protobuf request bodies.
- Do not replace the backend substrate or make the UI parse OTLP protobuf
  structures directly.
- Do not turn this into a generic marketing dashboard or landing page.

## Recommended Approach

Use a contract-backed dashboard workbench:

1. Restore the verification baseline and reconcile substrate docs/status.
2. Define dashboard projection contracts over `TelemetryStore` and
   `LiveTelemetrySummary`.
3. Implement Overview cards, live charts, Metrics Explorer, and
   pause/resume/clear controls against those projections.
4. Apply shadcn component patterns and Hallmark design gates as acceptance
   criteria, not as optional polish.

This keeps the next work visible while preserving the repo's contract-first
shape. The UI becomes a disciplined projection of telemetry state instead of a
decorative shell over raw data.

## Prep Lane

### Verification Baseline

The first implementation step should restore `deno task ok`. The current known
blocker is `.codex/hooks.json` line endings causing `deno fmt --check` to fail.
Treat this as hygiene only; do not change hook behavior.

Verification:

```powershell
deno task ok
git status --short
```

### M2 Status Reconciliation

Before starting M3 code, reconcile durable docs and Linear issue docs for the
substrate work that is already implemented. Update only documents whose claims
are now stale.

Expected documents to review:

- `docs/plans/05-linear-issues/OI-009.md`
- `docs/plans/05-linear-issues/OI-010.md`
- `docs/plans/05-linear-issues/OI-011.md`
- `docs/plans/05-linear-issues/OI-012.md`
- `docs/plans/06-evidence/acceptance-matrix.md`
- `docs/plans/04-implementation/04-api-and-event-contracts.md`

Docs should say what is implemented, what remains approximate, and what is
still intentionally deferred. Exponential histogram percentile derivation
remains deferred until a separate safe derivation design lands.

## Architecture

The M3 data flow should be:

```text
receiver
-> normalizeMetricsExport
-> TelemetryStore
-> derivation/projection layer
-> app server endpoints or bridge helpers
-> shadcn dashboard surface
```

The substrate owns normalized points, bounded retention, derived summary
values, warnings, and dropped-point accounting. The dashboard owns rendering,
view state, filtering, selected time window, pause/resume, and local interaction
state.

The dashboard must not interpret OTLP protobuf details directly. If the UI needs
a concept such as a chart point source, top route, metric row, or unavailable
reason, expose that concept through a projection contract.

## Projection Contracts

### Live Summary

Continue using `LiveTelemetrySummary` as the top-level status and overview
projection. M3 may extend it only when the field is broadly useful to more than
one visible dashboard element.

Required visible uses:

- receiver endpoint and live/paused state;
- exports/sec, datapoints/sec, bytes/sec, and dropped count;
- p95 latency when bucket-derived data is safe;
- request rate and error rate when semantic HTTP signals are present;
- top services;
- warning codes and degraded state summaries.

### Overview Card Projection

Add or derive a card-level projection for:

- latency;
- throughput;
- error rate;
- active requests when present;
- ingest health;
- dropped points.

Each card should include:

- `state`: `healthy`, `empty`, `paused`, `degraded`, `stale`, or
  `unavailable`;
- display value and unit when available;
- comparison/window label when meaningful;
- source metric or source reason;
- warning/degraded reason when not healthy;
- optional target for opening metric detail once detail views exist.

Cards must not invent data. Missing values render an explicit unavailable or
empty state.

### Chart Projection

Add chart-ready projections for the P0 graph inventory:

- latency over time using p50/p95/p99 when available;
- request throughput;
- request rate plus error rate;
- ingest bytes/sec and datapoints/sec;
- dropped point count or ratio;
- top routes/resources when attributes are present.

Each chart point should carry enough metadata for future drilldown:

- observed time bucket;
- metric name and series key;
- aggregation method;
- datapoint count;
- service/resource/route/status context when present;
- estimate/unavailable/degraded marker;
- source export or source context identifier if retained by the substrate.

Charts should support at least `1m`, `5m`, and `15m` windows. If the store does
not retain enough data for a requested window, the projection must say so.

### Metrics Explorer Projection

Expose a table-oriented metric explorer projection with:

- metric name;
- type;
- unit;
- latest value when usable;
- rate or delta when derivable;
- resource/service;
- attribute summary;
- cardinality or series count;
- last observed time;
- status.

Filtering should support service/resource, metric name, metric type, and
attribute text. Filter state belongs to the UI, but filterable fields should be
provided by the projection so the UI does not scrape raw point internals.

### Pause, Resume, And Clear

Pause freezes the browser's displayed dashboard snapshot. It does not stop the
receiver, reject exports, or mutate the backend store. The header must make this
clear by showing paused view state separately from receiver live state.

Resume returns the UI to the latest projection.

Clear resets the visible session/store state through an explicit backend
boundary. If clear is reversible only in the UI, use undo. If it destroys
retained telemetry, require a clear label and test that counters/state reset
predictably.

## UI Design Direction

### Product Stance

The dashboard is an operational workbench, not a landing page. It should be
dense but readable, optimized for repeated scanning, and quiet enough to sit
beside another app.

Use the existing Mabel-inspired token direction as a starting point:

- dark neutral base;
- restrained light foreground;
- small accent footprint;
- green for live/healthy;
- orange for warning/degraded;
- coral for error;
- blue for selection.

Implementation may translate these into shadcn-compatible theme tokens, but it
must keep tokens named and centralized.

### shadcn Component Direction

Use the repo's documented shadcn map:

- `Sheet` and `ResizablePanelGroup` for docked/full mode;
- `Tabs` for primary navigation;
- `ScrollArea` for dense scroll bodies;
- `Badge`, `Tooltip`, `Button`, and `ToggleGroup` for header status and
  controls;
- `Alert` and `Card` for empty/degraded states and KPI cards;
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, and Recharts
  primitives for charts;
- DataTable-style `Table` patterns for rankings and Metrics Explorer;
- `Command`, `Combobox`, `Select`, and `Input` for filtering.

shadcn chart guidance should be followed directly: build charts with Recharts
components, bring in shadcn chart helpers only where they add value, keep chart
configuration decoupled from data, use CSS variables for chart colors, and give
`ChartContainer` a stable height/min-height/aspect so responsive measurement
works on first render.

The dashboard block examples are useful as composition references, especially
the cards plus chart plus data table rhythm. Do not copy their shell blindly:
this product is a docked telemetry inspector with tabs, not a generic admin
sidebar.

References for implementation refresh:

- shadcn Chart docs: `https://ui.shadcn.com/docs/components/chart`
- shadcn Blocks: `https://ui.shadcn.com/blocks`

### Hallmark Design Gates

The implementation must pass these Hallmark-derived gates before closeout:

- no purple/blue gradient hero treatment, gradient headline, fake chrome,
  decorative orbs, or generic SaaS card soup;
- no nested cards or cards inside decorative outer cards;
- no invented metrics, testimonials, or fake proof values;
- every color and font comes from named tokens;
- chart colors use token references rather than one-off values;
- no clickable tab, button, or toolbar label wraps to two lines from 320px to
  1920px;
- root/page surfaces prevent horizontal scroll with `overflow-x: clip`;
- display and dashboard headings can wrap long words safely;
- metric values use tabular numerals;
- interactive controls include default, hover, focus-visible, active, disabled,
  loading, error, and success states where applicable;
- focus rings are visible immediately and meet contrast requirements;
- hover interactions have focus/touch equivalents;
- reduced-motion mode is supported for chart/control motion;
- body text, muted text, icons, and focus rings pass contrast against their
  computed backgrounds;
- no hover-only source context, tooltip, filter, or drilldown affordance;
- no `transition-all`, layout-property animation, or universal hover scale.

### Empty And Degraded States

Empty/degraded states are first-class dashboard content. Required examples:

- no telemetry yet, with endpoint and content type;
- latency unavailable because no duration histogram was found;
- active requests unavailable because the gauge is absent;
- histogram percentile unavailable or estimated from coarse buckets;
- points dropped due to retention cap;
- unsupported signal for traces/logs P1 placeholders;
- paused view while receiver remains live.

Each state should say what happened, why it matters, and what the user can do
next when there is a clear action.

## Error Handling And Safety

- Failure and warning text must not echo raw request bodies, sensitive
  attributes, credentials, cookies, tokens, API keys, or raw decoder errors.
- Charts and cards should show unavailable/degraded states instead of blank
  panels when source data is missing or ambiguous.
- Projection endpoints should return safe JSON only.
- UI rendering must keep inline data script-safe.
- Payload Inspector tab remains a placeholder or non-M4-safe preview until
  redaction policy work lands.

## Verification

The implementation plan should require focused gates per slice plus the final
quality gate.

Baseline and docs:

```powershell
deno task ok
```

Backend/projection tests:

- overview card states from deterministic store snapshots;
- chart windows for 1m/5m/15m with available and insufficient retention cases;
- metrics explorer rows and filters from deterministic metric points;
- pause/resume/clear semantics;
- warnings and unavailable reasons remain safe;
- no raw payload persistence or exposure is introduced.

UI tests:

- dashboard shell renders the approved tabs and controls;
- summary/projection data renders without unsafe inline script output;
- empty/degraded states render with concrete text;
- chart/explorer placeholders do not invent values;
- pause freezes the visible projection while receiver state remains honest;
- clear resets visible session state through the intended boundary.

Visual and interaction QA:

- check desktop docked width and full dashboard width;
- check 320px, 375px, 414px, and 768px responsive widths;
- confirm no horizontal scrolling;
- confirm tabs/buttons do not wrap;
- confirm focus rings, keyboard tab order, and reduced-motion behavior;
- confirm contrast for text, icons, chart labels, and focus rings;
- confirm charts have stable dimensions and do not render blank.

Final gate:

```powershell
deno task ok
git status --short
```

Run `repowise update` after meaningful implementation if refreshed context is
needed for follow-on M4 work.

## Handoff To Implementation Planning

The implementation plan should split this design into small, reviewable tasks:

1. Restore verification baseline and reconcile M2 docs/status.
2. Add dashboard projection contracts and tests.
3. Build the M3 shell, header status, tabs, and control state.
4. Build Overview cards.
5. Build live chart projections and chart components.
6. Build Metrics Explorer table and filters.
7. Add pause/resume/clear behavior.
8. Run Hallmark visual QA and close evidence gaps.

M4 work should start only after M3 has a stable dashboard surface and a clear
boundary for safe source/drilldown metadata.
