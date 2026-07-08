import { assertEquals, assertStringIncludes } from "@std/assert";
import { handleAppRequest } from "../../src/backend/app_server.ts";
import { buildReceiverState, currentSummary } from "../../src/backend/receiver.ts";
import { recordReceiverFailure } from "../../src/backend/live_bus.ts";
import type { MetricPoint } from "../../src/backend/metric_model.ts";

Deno.test("dashboard app server serves dashboard projection endpoint", async () => {
  const state = buildReceiverState(1_000);
  const response = await handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard?windowMs=60000"),
    state,
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("cache-control"), "no-store");
  assertEquals(body.receiver.endpoint, "http://127.0.0.1:4318/v1/metrics");
  assertEquals(body.windowMs, 60_000);
  assertEquals(body.cards.latency.state, "unavailable");
});

Deno.test("dashboard app server serves app shell and static asset placeholders", async () => {
  const state = buildReceiverState(1_000);
  const htmlResponse = handleAppRequest(new Request("http://127.0.0.1:4319/"), state);
  const html = await htmlResponse.text();
  const script = await handleAppRequest(new Request("http://127.0.0.1:4319/assets/app.js"), state);
  const css = await handleAppRequest(new Request("http://127.0.0.1:4319/assets/styles.css"), state);

  assertStringIncludes(html, 'id="root"');
  assertStringIncludes(html, "/assets/app.js");
  assertEquals(script.headers.get("content-type"), "text/javascript; charset=utf-8");
  assertEquals(script.headers.get("cache-control"), "no-store");
  assertEquals(css.headers.get("content-type"), "text/css; charset=utf-8");
  assertEquals(css.headers.get("cache-control"), "no-store");
});

Deno.test("dashboard app server guards unsupported dashboard methods", async () => {
  const state = buildReceiverState(1_000);
  const clearGet = await handleAppRequest(new Request("http://127.0.0.1:4319/api/dashboard/clear"), state);
  const dashboardPost = await handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard", { method: "POST" }),
    state,
  );

  assertEquals(clearGet.status, 405);
  assertEquals(dashboardPost.status, 405);
});

Deno.test("dashboard clear endpoint resets projection summary and warnings", async () => {
  const state = buildReceiverState(1_000);
  seedDashboardState(state);

  const beforeClearResponse = handleAppRequest(new Request("http://127.0.0.1:4319/api/dashboard"), state);
  const beforeClear = await beforeClearResponse.json();
  assertEquals(beforeClear.explorer.rows.length, 1);
  assertEquals(beforeClear.warnings.length, 2);

  const response = await handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard/clear", { method: "POST" }),
    state,
  );
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("cache-control"), "no-store");
  assertEquals((await response.json()).ok, true);

  const projectionResponse = handleAppRequest(new Request("http://127.0.0.1:4319/api/dashboard"), state);
  const projection = await projectionResponse.json();
  const summary = currentSummary(state);

  assertEquals(projection.cards.ingest.state, "empty");
  assertEquals(projection.explorer.rows, []);
  assertEquals(projection.warnings, []);
  assertEquals(summary.warnings, []);
  assertEquals(summary.overview.topServices, []);
});

function seedDashboardState(state: ReturnType<typeof buildReceiverState>): void {
  const observedAtMs = Date.now();

  state.store.recordExport({
    observedAtMs,
    bytesReceived: 64,
    points: [dashboardPoint(observedAtMs)],
    warnings: [{ code: "retained-warning", message: "keep this until clear runs" }],
  });

  recordReceiverFailure(state, "decode-failed", "OTLP protobuf payload could not be decoded safely.");
}

function dashboardPoint(observedAtMs: number): MetricPoint {
  return {
    seriesKey: "series:dashboard:request-count",
    observedAtMs,
    resource: { "service.name": "checkout" },
    scope: { name: "dashboard-test", version: "1.0.0" },
    metric: {
      name: "http.server.request.count",
      type: "sum",
      unit: "1",
      temporality: "delta",
      monotonic: true,
    },
    attributes: {
      "http.request.method": "GET",
      "http.route": "/checkout",
      "http.response.status_code": 500,
    },
    value: 4,
    derivationStatus: "usable",
    warnings: [],
  };
}
