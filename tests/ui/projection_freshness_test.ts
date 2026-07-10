import { assertEquals } from "@std/assert";
import { markProjectionStale } from "../../src/ui/dashboard/projection_freshness.ts";
import type { DashboardCard, DashboardProjection } from "../../src/ui/dashboard/types.ts";

Deno.test("markProjectionStale marks retained receiver and cards stale without losing values or mutating input", () => {
  const projection = dashboardProjection();

  const stale = markProjectionStale(projection);

  assertEquals(stale.receiver.live, false);
  assertEquals(Object.values(stale.cards).every((card) => card.state === "stale"), true);
  assertEquals(stale.cards.throughput.value, projection.cards.throughput.value);
  assertEquals(projection.receiver.live, true);
  assertEquals(projection.cards.throughput.state, "healthy");
});

function dashboardProjection(): DashboardProjection {
  const chart = (id: "latency" | "throughput" | "error-rate" | "ingest") => ({
    id,
    label: id,
    unit: "1",
    windowMs: 60_000,
    points: [],
  });
  const card = (id: DashboardCard["id"], value: number): DashboardCard => ({
    id,
    label: id,
    state: "healthy",
    value,
    unit: "1",
    source: "fixture",
  });

  return {
    observedAtMs: 3_000,
    windowMs: 60_000,
    receiver: { endpoint: "http://127.0.0.1:4318/v1/metrics", live: true, paused: false },
    ingest: { exportsPerSec: 1, datapointsPerSec: 2, bytesPerSec: 3, dropped: 0 },
    cards: {
      latency: card("latency", 10),
      throughput: card("throughput", 20),
      errorRate: card("error-rate", 0),
      activeRequests: card("active-requests", 2),
      ingest: card("ingest", 2),
      dropped: card("dropped", 0),
    },
    charts: {
      latency: chart("latency"),
      throughput: chart("throughput"),
      errorRate: chart("error-rate"),
      ingest: chart("ingest"),
    },
    explorer: { rows: [] },
    redaction: { status: "passed", hiddenAttributeValues: 0, patternsMatched: [] },
    warnings: [],
  };
}
