import { assertEquals } from "@std/assert";
import { createTelemetryStore } from "../../src/backend/telemetry_store.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";

Deno.test("TelemetryStore appends export metadata and retained points", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });

  store.recordExport({
    observedAtMs: 1_000,
    bytesReceived: 64,
    points: [point("http.server.request.count", 1_000, 2)],
    warnings: [],
  });

  const snapshot = store.snapshot();
  assertEquals(snapshot.totalExports, 1);
  assertEquals(snapshot.totalBytes, 64);
  assertEquals(snapshot.totalPoints, 1);
  assertEquals(snapshot.droppedPoints, 0);
  assertEquals(snapshot.recentPoints.length, 1);
  assertEquals(snapshot.exports.length, 1);
});

Deno.test("TelemetryStore evicts old points and counts dropped records", () => {
  const store = createTelemetryStore({ maxPoints: 2, maxExports: 5 });

  store.recordExport({ observedAtMs: 1_000, bytesReceived: 10, points: [point("a", 1_000, 1)], warnings: [] });
  store.recordExport({ observedAtMs: 2_000, bytesReceived: 10, points: [point("b", 2_000, 2)], warnings: [] });
  store.recordExport({ observedAtMs: 3_000, bytesReceived: 10, points: [point("c", 3_000, 3)], warnings: [] });

  const snapshot = store.snapshot();
  assertEquals(snapshot.totalPoints, 3);
  assertEquals(snapshot.droppedPoints, 1);
  assertEquals(snapshot.recentPoints.map((item: MetricPoint) => item.metric.name), ["b", "c"]);
});

Deno.test("TelemetryStore exposes deterministic series list and selected series window", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });
  const first = point("http.server.duration", 1_000, 25, "series:duration");
  const second = point("http.server.duration", 2_000, 50, "series:duration");
  const third = point("queue.depth", 3_000, 7, "series:queue");

  store.recordExport({ observedAtMs: 1_000, bytesReceived: 10, points: [first, second, third], warnings: [] });

  assertEquals(store.seriesList().map((series: { seriesKey: string }) => series.seriesKey), ["series:duration", "series:queue"]);
  assertEquals(store.pointsForSeries("series:duration", 1_500, 2_500), [second]);
});

function point(name: string, observedAtMs: number, value: number, seriesKey = `series:${name}`): MetricPoint {
  return {
    seriesKey,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: {},
    metric: { name, type: "gauge" },
    attributes: {},
    value,
    derivationStatus: "usable",
    warnings: [],
  };
}
