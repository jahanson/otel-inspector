import { assertEquals } from "@std/assert";
import { createTelemetryStore } from "../../src/backend/telemetry_store.ts";
import type { MetricPoint, MetricWarning } from "../../src/backend/metric_model.ts";

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

  assertEquals(store.seriesList().map((series: { seriesKey: string }) => series.seriesKey), [
    "series:duration",
    "series:queue",
  ]);
  assertEquals(store.pointsForSeries("series:duration", 1_500, 2_500), [second]);
});

Deno.test("TelemetryStore sorts equal metric names by series key", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });

  store.recordExport({
    observedAtMs: 1_000,
    bytesReceived: 10,
    points: [
      point("cpu.usage", 1_000, 2, "series:z"),
      point("cpu.usage", 2_000, 1, "series:a"),
    ],
    warnings: [],
  });

  assertEquals(store.seriesList().map((series: { seriesKey: string }) => series.seriesKey), ["series:a", "series:z"]);
});

Deno.test("TelemetryStore clones input points and warnings before storing them", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });
  const inputPoint = point("cpu.usage", 1_000, 2, "series:cpu", [warning("point warning")]);
  const inputWarning = warning("original warning");

  store.recordExport({
    observedAtMs: 1_000,
    bytesReceived: 10,
    points: [inputPoint],
    warnings: [inputWarning],
  });

  inputPoint.metric.name = "mutated metric";
  inputPoint.resource["service.name"] = "mutated service";
  inputPoint.warnings[0].message = "mutated nested warning";
  inputWarning.message = "mutated warning";

  const snapshot = store.snapshot();
  assertEquals(snapshot.recentPoints[0].metric.name, "cpu.usage");
  assertEquals(snapshot.recentPoints[0].resource["service.name"], "checkout");
  assertEquals(snapshot.recentPoints[0].warnings[0].message, "point warning");
  assertEquals(snapshot.warnings[0].message, "original warning");
});

Deno.test("TelemetryStore returns cloned history from readback", () => {
  const store = createTelemetryStore({ maxPoints: 10, maxExports: 5 });

  store.recordExport({
    observedAtMs: 1_000,
    bytesReceived: 10,
    points: [point("cpu.usage", 1_000, 2, "series:cpu", [warning("point warning")])],
    warnings: [warning("original warning")],
  });

  const snapshot = store.snapshot();
  snapshot.recentPoints[0].metric.name = "mutated snapshot metric";
  snapshot.recentPoints[0].resource["service.name"] = "mutated snapshot service";
  snapshot.recentPoints[0].warnings[0].message = "mutated nested warning";
  snapshot.warnings[0].message = "mutated snapshot warning";

  const queriedPoints = store.pointsForSeries("series:cpu");
  queriedPoints[0].metric.name = "mutated queried metric";
  queriedPoints[0].resource["service.name"] = "mutated queried service";
  queriedPoints[0].warnings[0].message = "mutated queried warning";

  const freshSnapshot = store.snapshot();
  assertEquals(freshSnapshot.recentPoints[0].metric.name, "cpu.usage");
  assertEquals(freshSnapshot.recentPoints[0].resource["service.name"], "checkout");
  assertEquals(freshSnapshot.recentPoints[0].warnings[0].message, "point warning");
  assertEquals(freshSnapshot.warnings[0].message, "original warning");
});

function point(
  name: string,
  observedAtMs: number,
  value: number,
  seriesKey = `series:${name}`,
  warnings: MetricWarning[] = [],
): MetricPoint {
  return {
    seriesKey,
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: {},
    metric: { name, type: "gauge" },
    attributes: {},
    value,
    derivationStatus: "usable",
    warnings,
  };
}

function warning(message: string): MetricWarning {
  return {
    code: "warning",
    message,
  };
}
