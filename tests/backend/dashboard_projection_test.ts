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
  assertEquals(projection.explorer.rows.length, 3);
  assertEquals(
    projection.explorer.rows.map((row) => row.seriesKey).sort(),
    [
      "series:http.server.duration:2000",
      "series:http.server.request.count:1000",
      "series:http.server.request.count:2000",
    ].sort(),
  );
  assertEquals(projection.explorer.rows[0].metricName, "http.server.duration");
});

Deno.test("buildDashboardProjection only reports error rate when request points carry status codes", () => {
  const projection = buildDashboardProjection(
    snapshot([httpRequestCountWithoutStatus(2_000, 10)]),
    summary({
      p95Ms: undefined,
      requestRate: 10,
      errorRate: 0,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

  assertObjectMatch(projection.cards.errorRate, {
    id: "error-rate",
    state: "unavailable",
    value: undefined,
    unit: "%",
    source: "No HTTP status code attributes in the selected window.",
  });
});

Deno.test("buildDashboardProjection links overview cards to retained source aliases", () => {
  const projection = buildDashboardProjection(
    snapshot([
      httpRequestAlias(2_000, 8, 200),
      httpHistogramAlias(2_000, [
        { upperBound: 50, count: 5 },
        { upperBound: 100, count: 5 },
      ]),
      activeRequestsAlias(2_000, 4),
    ]),
    summary({
      p95Ms: 100,
      requestRate: 8,
      errorRate: 0,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

  assertEquals(projection.cards.latency.detailTarget, { metricName: "http.server.request.duration" });
  assertEquals(projection.cards.throughput.detailTarget, { metricName: "http.server.requests" });
  assertEquals(projection.cards.errorRate.detailTarget, { metricName: "http.server.requests" });
  assertEquals(projection.cards.activeRequests.detailTarget, { metricName: "http.server.active_requests_count" });
  assertEquals(projection.cards.ingest.detailTarget, undefined);
});

Deno.test("buildDashboardProjection labels ingest chart points as export counts", () => {
  const projection = buildDashboardProjection(
    snapshot([], [
      { observedAtMs: 1_000, bytesReceived: 64, pointCount: 5 },
      { observedAtMs: 11_000, bytesReceived: 64, pointCount: 500 },
    ]),
    summary({
      p95Ms: undefined,
      requestRate: undefined,
      errorRate: undefined,
      topServices: [],
    }),
    { observedAtMs: 11_000, windowMs: 60_000 },
  );

  assertObjectMatch(projection.charts.ingest, {
    id: "ingest",
    label: "Ingest per export",
    unit: "pts/export",
  });
  assertEquals(
    projection.charts.ingest.points.map((point) => [point.value, point.aggregation]),
    [[5, "sum"], [500, "sum"]],
  );
});

Deno.test("buildDashboardProjection plots estimated latency percentiles instead of bucket definitions", () => {
  const projection = buildDashboardProjection(
    snapshot([
      httpHistogram(2_000, [
        { upperBound: 50, count: 95 },
        { upperBound: 100, count: 5 },
      ]),
      httpHistogram(3_000, [
        { upperBound: 50, count: 5 },
        { upperBound: 100, count: 95 },
      ]),
    ]),
    summary({
      p95Ms: 100,
      requestRate: undefined,
      errorRate: undefined,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

  assertEquals(projection.charts.latency.points.length, 2);
  assertEquals(projection.charts.latency.points.map((point) => point.value), [50, 100]);
  assertEquals(projection.charts.latency.points.map((point) => point.aggregation), ["latest", "latest"]);
  assertEquals(projection.charts.latency.points.map((point) => point.state), ["estimated", "estimated"]);
});

Deno.test("buildDashboardProjection converts seconds latency histograms to milliseconds", () => {
  const projection = buildDashboardProjection(
    snapshot([
      httpHistogramSeconds(2_000, [
        { upperBound: 0.05, count: 94 },
        { upperBound: 0.1, count: 6 },
      ]),
    ]),
    summary({
      p95Ms: 100,
      requestRate: undefined,
      errorRate: undefined,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

  assertEquals(projection.charts.latency.points.map((point) => point.value), [100]);
  assertEquals(projection.charts.latency.unit, "ms");
});

Deno.test("buildDashboardProjection skips latency points with p95 in the +Inf bucket", () => {
  const projection = buildDashboardProjection(
    snapshot([
      httpHistogram(2_000, [
        { upperBound: 50, count: 94 },
        { upperBound: Number.POSITIVE_INFINITY, count: 6 },
      ]),
    ]),
    summary({
      p95Ms: undefined,
      requestRate: undefined,
      errorRate: undefined,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

  assertEquals(projection.charts.latency.points, []);
});

Deno.test("buildDashboardProjection keeps only points inside the selected window", () => {
  const projection = buildDashboardProjection(
    snapshot(
      [
        httpRequestCount(1_499, 1, 200),
        httpRequestCount(1_500, 2, 200),
        httpHistogram(1_500, [
          { upperBound: 50, count: 3 },
          { upperBound: 100, count: 5 },
        ]),
        httpRequestCount(3_001, 4, 500),
      ],
      [
        { observedAtMs: 1_499, bytesReceived: 64, pointCount: 1 },
        { observedAtMs: 1_500, bytesReceived: 64, pointCount: 2 },
        { observedAtMs: 3_001, bytesReceived: 64, pointCount: 4 },
      ],
    ),
    summary({
      p95Ms: 88,
      requestRate: 2,
      errorRate: 0.1,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 1_500 },
  );

  assertEquals(projection.charts.throughput.points.map((point) => point.observedAtMs), [1_500]);
  assertEquals(projection.charts.ingest.points.map((point) => point.observedAtMs), [1_500]);
  assertEquals(projection.explorer.rows.map((row) => row.lastObservedAtMs), [1_500, 1_500]);
});

Deno.test("buildDashboardProjection keeps distinct series keys separate in the explorer", () => {
  const projection = buildDashboardProjection(
    snapshot([
      explorerPoint("series-a", 2_000, 7),
      explorerPoint("series-b", 2_000, 11),
    ]),
    summary({
      p95Ms: 88,
      requestRate: 2,
      errorRate: 0.1,
      topServices: ["checkout"],
    }),
  );

  assertEquals(projection.explorer.rows.length, 2);
  assertEquals(
    projection.explorer.rows.map((row) => row.seriesKey).sort(),
    ["series-a", "series-b"],
  );
  assertEquals(projection.explorer.rows[0].latest, 7);
  assertEquals(projection.explorer.rows[1].latest, 11);
});

Deno.test("buildDashboardProjection keeps cards and ingest empty-state within the selected window", () => {
  const projection = buildDashboardProjection(
    snapshot([
      httpRequestCount(1_000, 8, 200),
      httpHistogram(1_000, [
        { upperBound: 50, count: 5 },
        { upperBound: 100, count: 5 },
      ]),
    ], [
      { observedAtMs: 1_000, bytesReceived: 128, pointCount: 2 },
    ]),
    summary({
      p95Ms: 100,
      requestRate: 10,
      errorRate: 0.2,
      topServices: ["checkout"],
    }),
    { observedAtMs: 10_000, windowMs: 500 },
  );

  assertObjectMatch(projection.cards.latency, {
    state: "unavailable",
    value: undefined,
    source: "No usable HTTP duration histogram in the selected window.",
  });
  assertObjectMatch(projection.cards.throughput, {
    state: "empty",
    value: undefined,
    source: "No HTTP request counter in the selected window.",
  });
  assertObjectMatch(projection.cards.errorRate, {
    state: "empty",
    value: undefined,
    source: "No HTTP status code attributes in the selected window.",
  });
  assertObjectMatch(projection.cards.ingest, {
    state: "empty",
    value: undefined,
    source: "No accepted exports yet.",
  });
  assertEquals(projection.charts.latency.points, []);
  assertEquals(projection.charts.throughput.points, []);
  assertEquals(projection.charts.errorRate.points, []);
  assertEquals(projection.charts.ingest.points, []);
  assertObjectMatch(projection.charts.ingest, {
    unavailableReason: "No accepted exports yet.",
  });
  assertEquals(projection.explorer.rows, []);
});

Deno.test("buildDashboardProjection uses the newest active request gauge in the selected window", () => {
  const projection = buildDashboardProjection(
    snapshot([
      activeRequestsGauge(1_000, 2),
      activeRequestsGauge(2_000, 7),
    ]),
    summary({
      p95Ms: 88,
      requestRate: 2,
      errorRate: 0.1,
      topServices: ["checkout"],
    }),
    { observedAtMs: 3_000, windowMs: 60_000 },
  );

  assertObjectMatch(projection.cards.activeRequests, {
    id: "active-requests",
    state: "healthy",
    value: 7,
    unit: "req",
    source: "http.server.active_requests",
  });
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

function snapshot(
  points: MetricPoint[],
  exports: TelemetryStoreSnapshot["exports"] = points.length > 0
    ? [{ observedAtMs: 2_000, bytesReceived: 128, pointCount: points.length }]
    : [],
): TelemetryStoreSnapshot {
  return {
    totalExports: points.length > 0 ? 1 : 0,
    totalBytes: points.length * 64,
    totalPoints: points.length,
    droppedPoints: 0,
    recentPoints: points,
    exports,
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

function httpRequestCountWithoutStatus(observedAtMs: number, value: number): MetricPoint {
  return {
    ...basePoint("http.server.request.count", observedAtMs),
    metric: { name: "http.server.request.count", type: "sum", unit: "1", temporality: "delta", monotonic: true },
    attributes: { "http.route": "/cart", "http.request.method": "GET" },
    value,
  };
}

function httpRequestAlias(observedAtMs: number, value: number, statusCode: number): MetricPoint {
  return {
    ...httpRequestCount(observedAtMs, value, statusCode),
    seriesKey: `series:http.server.requests:${observedAtMs}`,
    metric: { name: "http.server.requests", type: "sum", unit: "1", temporality: "delta", monotonic: true },
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

function httpHistogramSeconds(
  observedAtMs: number,
  buckets: Array<{ upperBound: number; count: number }>,
): MetricPoint {
  return {
    ...httpHistogram(observedAtMs, buckets),
    metric: { name: "http.server.request.duration", type: "histogram", unit: "s", temporality: "delta" },
  };
}

function httpHistogramAlias(observedAtMs: number, buckets: Array<{ upperBound: number; count: number }>): MetricPoint {
  return {
    ...httpHistogram(observedAtMs, buckets),
    seriesKey: `series:http.server.request.duration:${observedAtMs}`,
    metric: { name: "http.server.request.duration", type: "histogram", unit: "ms", temporality: "delta" },
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

function explorerPoint(seriesKey: string, observedAtMs: number, value: number): MetricPoint {
  return {
    seriesKey,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: { name: "manual" },
    metric: { name: "http.server.request.count", type: "sum", unit: "1", temporality: "delta", monotonic: true },
    attributes: { "http.request.method": "GET", "http.route": "/cart" },
    derivationStatus: "usable",
    warnings: [],
    value,
  };
}

function activeRequestsGauge(observedAtMs: number, value: number): MetricPoint {
  return {
    ...basePoint("http.server.active_requests", observedAtMs),
    metric: { name: "http.server.active_requests", type: "gauge", unit: "req" },
    value,
  };
}

function activeRequestsAlias(observedAtMs: number, value: number): MetricPoint {
  return {
    ...activeRequestsGauge(observedAtMs, value),
    seriesKey: `series:http.server.active_requests_count:${observedAtMs}`,
    metric: { name: "http.server.active_requests_count", type: "gauge", unit: "req" },
  };
}
