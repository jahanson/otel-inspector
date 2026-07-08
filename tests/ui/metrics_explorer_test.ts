import { assertEquals } from "@std/assert";
import type { ExplorerRow } from "../../src/ui/dashboard/types.ts";

const rows: ExplorerRow[] = [
  {
    cardinality: 2,
    attributes: { env: "prod", route: "/checkout" },
    lastObservedAtMs: 1_700_000_000_000,
    latest: 12,
    metricName: "http.server.request.count",
    metricType: "counter",
    rate: 3,
    resourceService: "checkout-api",
    seriesKey: "svc:checkout-api/http.server.request.count",
    status: "healthy",
    unit: "requests",
  },
  {
    cardinality: 1,
    attributes: { env: "prod", region: "us-central1" },
    lastObservedAtMs: 1_700_000_100_000,
    latest: 98.2,
    metricName: "system.cpu.utilization",
    metricType: "gauge",
    resourceService: "infra-agent",
    seriesKey: "svc:infra-agent/system.cpu.utilization",
    status: "degraded",
    unit: "%",
  },
];

Deno.test("filterExplorerRows returns every row for a blank query", async () => {
  const filterExplorerRows = await loadFilterExplorerRows();

  assertEquals(filterExplorerRows("   ", rows), rows);
});

Deno.test("filterExplorerRows matches metrics, services, types, and attributes", async () => {
  const filterExplorerRows = await loadFilterExplorerRows();

  assertEquals(filterExplorerRows("checkout", rows), [rows[0]]);
  assertEquals(filterExplorerRows("counter", rows), [rows[0]]);
  assertEquals(filterExplorerRows("region", rows), [rows[1]]);
  assertEquals(filterExplorerRows("us-central1", rows), [rows[1]]);
});

async function loadFilterExplorerRows(): Promise<
  typeof import("../../src/ui/dashboard/components/MetricsExplorer.tsx").filterExplorerRows
> {
  const originalProcess = globalThis.process;
  Object.defineProperty(globalThis, "process", {
    configurable: true,
    value: { env: { NODE_ENV: "test" } },
    writable: true,
  });

  try {
    return (await import("../../src/ui/dashboard/components/MetricsExplorer.tsx")).filterExplorerRows;
  } finally {
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      value: originalProcess,
      writable: true,
    });
  }
}
