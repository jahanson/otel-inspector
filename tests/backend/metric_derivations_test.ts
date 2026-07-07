import { assertEquals } from "@std/assert";
import { deriveLiveTelemetrySummary } from "../../src/backend/metric_derivations.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";
import type { TelemetryStoreSnapshot } from "../../src/backend/telemetry_store.ts";

Deno.test("deriveLiveTelemetrySummary computes ingest rates and dropped counts", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      gauge("queue.depth", 2_000, 7),
      gauge("queue.depth", 3_000, 8),
    ], { totalExports: 2, totalBytes: 256, totalPoints: 2, droppedPoints: 1 }),
    1_000,
    3_000,
  );

  assertEquals(summary.ingest.exportsPerSec, 1);
  assertEquals(summary.ingest.datapointsPerSec, 1);
  assertEquals(summary.ingest.bytesPerSec, 128);
  assertEquals(summary.ingest.dropped, 1);
});

Deno.test("deriveLiveTelemetrySummary computes HTTP request rate and error rate from semantic sums", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      httpRequestCount(2_000, 8, 200),
      httpRequestCount(2_000, 2, 500),
    ], { totalExports: 1, totalBytes: 64, totalPoints: 2, droppedPoints: 0 }),
    1_000,
    3_000,
  );

  assertEquals(summary.overview.requestRate, 5);
  assertEquals(summary.overview.errorRate, 0.2);
  assertEquals(summary.overview.topServices, ["checkout"]);
});

Deno.test("deriveLiveTelemetrySummary ignores cumulative HTTP sums for request and error rates", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      httpRequestCount(2_000, 8, 200, "delta"),
      httpRequestCount(2_000, 2, 500, "delta"),
      httpRequestCount(2_000, 100, 200, "cumulative"),
      httpRequestCount(2_000, 50, 500, "cumulative"),
    ], { totalExports: 1, totalBytes: 64, totalPoints: 4, droppedPoints: 0 }),
    1_000,
    3_000,
  );

  assertEquals(summary.overview.requestRate, 5);
  assertEquals(summary.overview.errorRate, 0.2);
});

Deno.test("deriveLiveTelemetrySummary estimates p95 from usable HTTP histogram buckets", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      {
        ...basePoint("http.server.duration", 2_000),
        metric: { name: "http.server.duration", type: "histogram", unit: "ms", temporality: "delta" },
        count: 10,
        sum: 120,
        buckets: [
          { upperBound: 50, count: 5 },
          { upperBound: 100, count: 4 },
          { upperBound: Number.POSITIVE_INFINITY, count: 1 },
        ],
      },
    ], { totalExports: 1, totalBytes: 64, totalPoints: 1, droppedPoints: 0 }),
    1_000,
    3_000,
  );

  assertEquals(summary.overview.p95Ms, 100);
  assertEquals(summary.warnings, []);
});

Deno.test("deriveLiveTelemetrySummary ignores cumulative HTTP histograms for p95", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      {
        ...basePoint("http.server.request.duration", 2_000),
        metric: { name: "http.server.request.duration", type: "histogram", unit: "ms", temporality: "cumulative" },
        count: 10,
        sum: 120,
        buckets: [
          { upperBound: 50, count: 5 },
          { upperBound: 100, count: 4 },
          { upperBound: Number.POSITIVE_INFINITY, count: 1 },
        ],
      },
    ], { totalExports: 1, totalBytes: 64, totalPoints: 1, droppedPoints: 0 }),
    1_000,
    3_000,
  );

  assertEquals(summary.overview.p95Ms, undefined);
});

Deno.test("deriveLiveTelemetrySummary converts second-based HTTP duration histograms to milliseconds", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      {
        ...basePoint("http.server.request.duration", 2_000),
        metric: { name: "http.server.request.duration", type: "histogram", unit: "s", temporality: "delta" },
        count: 10,
        sum: 0.12,
        buckets: [
          { upperBound: 0.05, count: 5 },
          { upperBound: 0.1, count: 4 },
          { upperBound: Number.POSITIVE_INFINITY, count: 1 },
        ],
      },
    ], { totalExports: 1, totalBytes: 64, totalPoints: 1, droppedPoints: 0 }),
    1_000,
    3_000,
  );

  assertEquals(summary.overview.p95Ms, 100);
});

Deno.test("deriveLiveTelemetrySummary reports unavailable overview data without guessing", () => {
  const summary = deriveLiveTelemetrySummary(
    snapshot([
      {
        ...basePoint("http.server.duration", 2_000),
        metric: { name: "http.server.duration", type: "histogram", unit: "ms", temporality: "delta" },
        derivationStatus: "incomplete",
        warnings: [{
          code: "histogram-incomplete",
          message: "Histogram datapoint cannot produce safe percentile estimates.",
        }],
      },
    ], { totalExports: 1, totalBytes: 64, totalPoints: 1, droppedPoints: 0 }),
    1_000,
    3_000,
  );

  assertEquals(summary.overview.p95Ms, undefined);
  assertEquals(summary.warnings[0].code, "histogram-incomplete");
});

function snapshot(
  points: MetricPoint[],
  counters: { totalExports: number; totalBytes: number; totalPoints: number; droppedPoints: number },
): TelemetryStoreSnapshot {
  return {
    ...counters,
    recentPoints: points,
    exports: [],
    warnings: points.flatMap((point) => point.warnings),
  };
}

function gauge(name: string, observedAtMs: number, value: number): MetricPoint {
  return { ...basePoint(name, observedAtMs), value };
}

function httpRequestCount(
  observedAtMs: number,
  value: number,
  statusCode: number,
  temporality: "delta" | "cumulative" = "delta",
): MetricPoint {
  return {
    ...basePoint("http.server.request.count", observedAtMs),
    metric: { name: "http.server.request.count", type: "sum", unit: "1", temporality, monotonic: true },
    attributes: {
      "http.response.status_code": statusCode,
      "http.request.method": "GET",
      "http.route": "/cart",
    },
    value,
  };
}

function basePoint(name: string, observedAtMs: number): MetricPoint {
  return {
    seriesKey: `series:${name}:${observedAtMs}`,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: {},
    metric: { name, type: "gauge" },
    attributes: {},
    derivationStatus: "usable",
    warnings: [],
  };
}
