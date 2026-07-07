# Telemetry Substrate Design

## Status

- Approved for implementation planning.
- Date: 2026-07-07.
- Scope: backend telemetry substrate for OI-006, OI-007, OI-009, OI-010-lite, OI-011, and OI-012.

## Goal

Build the backend substrate that turns decoded OTLP metrics exports into stable, bounded, dashboard-ready telemetry records. The substrate should unlock the M2 milestone and prepare the M3 dashboard without requiring UI code to understand OTLP protobuf trees.

## Non-Goals

- Do not build the M3 dashboard UI in this slice.
- Do not implement the raw payload inspector, redacted fixture export, SQLite session history, traces, logs, or proxy mode.
- Do not attempt certification-grade histogram quantiles yet.
- Do not persist raw protobuf request bodies by default.

## Recommended Approach

Use a normalized substrate with HTTP-biased derivations:

- Decode OTLP metrics exports at the receiver boundary.
- Normalize `ResourceMetrics -> ScopeMetrics -> Metric -> DataPoint` into stable `MetricPoint` records.
- Store recent points and export metadata in bounded memory with eviction/drop accounting.
- Derive dashboard-ready summaries for HTTP/service signals first.
- Retain unknown or less-useful metric shapes safely with clear unsupported-derivation labels.
- Publish batched live summaries on a controlled cadence.

This favors dogfood dashboard value while preserving enough generic metric structure for later explorer and inspect work.

## Scope And Boundaries

This slice covers OI-006 normalization, OI-007 bounded retention, OI-009 metric derivation, OI-010 safe histogram percentile estimates where possible, OI-011 HTTP semantic metric presets, and OI-012 live bus batching and downsampling.

The receiver remains responsible for HTTP method/path/content-type checks, payload size limits, protobuf decode, and safe failure responses. The substrate owns normalized metric records, bounded retention, derived summaries, and batched live projections.

Histogram percentile work should estimate p50/p95/p99 only when bucket data is usable. Missing or ambiguous histogram data should surface an unavailable state or warning instead of guessed values.

## Architecture

### Receiver Boundary

`src/backend/receiver.ts` should continue enforcing the OTLP HTTP contract. After a request decodes successfully, it should hand the decoded export plus ingest metadata to the substrate instead of only incrementing export counters.

Malformed payloads still return safe `decode-failed` responses. Normalization failures should not expose raw attributes, request bodies, or raw protobuf errors.

### Metric Normalization

Add a normalization boundary that walks decoded metrics exports and produces `MetricPoint` records.

Each point should preserve:

- service/resource context;
- instrumentation scope name and version when available;
- metric name, description, unit, and type;
- datapoint timestamps as string-safe values;
- numeric values for gauges and sums;
- histogram count, sum, and explicit buckets when usable;
- datapoint attributes;
- stable series identity;
- warnings or derivation status for unsupported shapes.

Unsupported or incomplete metric shapes should not drop the whole export when a safe point or warning can be retained.

### Bounded Store

The in-memory store should retain recent `MetricPoint` records and export metadata under configurable bounds.

It should expose query methods for:

- recent points;
- series list;
- selected series window;
- ingest counters;
- dropped/evicted counts.

Eviction must increment dropped counters so degraded dashboard states can distinguish "no data" from "data discarded."

### Derivation Layer

The derivation layer should compute `LiveTelemetrySummary` from the store. It should derive:

- exports/sec;
- datapoints/sec;
- bytes/sec;
- dropped point count;
- latest values;
- rates and deltas where temporality supports them;
- HTTP request rate;
- HTTP latency percentile estimates where histogram buckets support them;
- HTTP error rate from semantic status code signals;
- top service/resource/route hints where available.

Missing temporality, missing units, unsupported metric kinds, and ambiguous semantic attributes should become warnings or unavailable states rather than guessed values.

### Live Bus

The live bus should publish summaries on a configurable cadence rather than per datapoint. Initial implementation can be tested without a browser by directly exercising substrate append and summary build functions.

The design should leave room for paused snapshots, downsampled views, and UI backpressure states, but the first implementation only needs the backend contract and deterministic batching behavior.

## Contracts

### MetricPoint

The implementation plan should refine exact TypeScript names, but the stable contract should include these concepts:

```ts
type MetricPoint = {
  seriesKey: string;
  observedAtMs: number;
  timestampUnixNano?: string;
  startTimeUnixNano?: string;
  resource: Record<string, unknown>;
  scope: { name?: string; version?: string };
  metric: {
    name: string;
    description?: string;
    unit?: string;
    type: "gauge" | "sum" | "histogram" | "exponential_histogram" | "summary" | "unknown";
    temporality?: "delta" | "cumulative" | "unspecified";
    monotonic?: boolean;
  };
  attributes: Record<string, string | number | boolean>;
  value?: number;
  count?: number;
  sum?: number;
  buckets?: Array<{ upperBound: number; count: number }>;
  derivationStatus: "usable" | "unsupported" | "incomplete";
  warnings: Array<{ code: string; message: string }>;
};
```

Use string-safe timestamps and deterministic keys so the records survive JSON and future SSE transport.

### Series Identity

Series identity should be deterministic from:

- resource identity;
- scope identity;
- metric name;
- metric type;
- unit;
- datapoint attributes.

HTTP semantic recognizers should be isolated from generic normalization so dashboard presets can evolve without reshaping the core metric model.

### LiveTelemetrySummary

`LiveTelemetrySummary` should remain the dashboard-facing projection. The substrate may extend it to include datapoints/sec, dropped counts, overview availability, and warning codes needed for empty, degraded, and unsupported states.

## Error Handling

- A malformed protobuf request remains `decode-failed`.
- A bad metric inside an otherwise valid export should produce a retained warning or unsupported point where safe.
- A truly broken normalization path should produce a safe `normalize-failed` category and increment failure accounting.
- Safe failures must not echo request bodies, decoded attributes, credentials, or raw decoder errors.
- Non-HTTP metrics should be retained when possible, even if they do not feed the overview cards.

## Verification

The implementation should be fixture-driven and covered by focused tests:

- series key determinism;
- resource, scope, metric, and datapoint normalization;
- gauges, sums, histograms, and unsupported metric kinds;
- redaction-safe warning messages;
- store capacity, eviction counters, and query methods;
- latest, rate, delta, histogram percentile availability, HTTP request rate, latency, and error-rate derivations;
- receiver integration proving valid protobuf exports update datapoints/sec, dropped counts, and overview fields;
- live bus cadence behavior without browser dependency.

The implementation plan should keep `deno task ok` as the final quality gate and may add focused test tasks for substrate work.

## DOX Notes

This spec is a design artifact under `docs/superpowers/specs/`. Implementation plans derived from it belong under `docs/superpowers/plans/`.
