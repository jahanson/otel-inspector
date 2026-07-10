import { assertEquals } from "@std/assert";
import { prepareChartTraces } from "../../src/ui/dashboard/charts/chart_data.ts";
import type { ChartPoint } from "../../src/ui/dashboard/types.ts";

Deno.test("prepareChartTraces keeps interleaved telemetry series separate and ordered", () => {
  const points: ChartPoint[] = [
    chartPoint("series:opaque:a", 3_000, 3, "checkout", "/cart"),
    chartPoint("series:opaque:b", 4_000, 4, "payments", "/pay"),
    chartPoint("series:opaque:a", 1_000, 1, "checkout", "/cart"),
    chartPoint("series:opaque:b", 2_000, 2, "payments", "/pay"),
  ];

  const traces = prepareChartTraces(points);

  assertEquals(traces.length, 2);
  assertEquals(traces[0].seriesKey, "series:opaque:a");
  assertEquals(traces[0].points.map((point) => point.value), [1, 3]);
  assertEquals(traces[0].detailLabel, "http.server.requests · checkout / /cart");
  assertEquals(traces[1].seriesKey, "series:opaque:b");
  assertEquals(traces[1].points.map((point) => point.value), [2, 4]);
  assertEquals(traces[1].detailLabel, "http.server.requests · payments / /pay");
});

function chartPoint(
  seriesKey: string,
  observedAtMs: number,
  value: number,
  service: string,
  route: string,
): ChartPoint {
  return {
    observedAtMs,
    value,
    seriesKey,
    metricName: "http.server.requests",
    aggregation: "sum",
    datapointCount: 1,
    service,
    route,
    state: "exact",
  };
}
