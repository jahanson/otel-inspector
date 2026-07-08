import { assertEquals, assertObjectMatch } from "@std/assert";
import { buildDashboardProjection } from "../../src/backend/dashboard_projection.ts";
import type { LiveTelemetrySummary } from "../../src/backend/contracts.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";
import type { TelemetryStoreSnapshot } from "../../src/backend/telemetry_store.ts";

Deno.test("buildDashboardProjection creates overview cards without inventing missing data", () => {
  const projection = buildDashboardProjection(
    snapshot([]),
    summary({
      p95Ms: undefined,
      requestRate: undefined,
      errorRate: undefined,
      topServices: [],
    }),
  );

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
  const projection = buildDashboardProjection(
    snapshot(points),
    summary({
      p95Ms: 100,
      requestRate: 10,
      errorRate: 0.2,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

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
