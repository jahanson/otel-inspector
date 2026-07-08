import { assertEquals, assertFalse, assertNotEquals, assertStringIncludes } from "@std/assert";
import { assertSpyCalls, stub } from "jsr:@std/testing@^1.0.2/mock";
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

Deno.test("dashboard app server returns build hint when dashboard assets are unavailable", async () => {
  const state = buildReceiverState(1_000);
  const readStub = stub(Deno, "readFileSync", () => {
    throw new Deno.errors.NotFound("missing");
  });

  try {
    for (const pathname of ["/assets/app.js", "/assets/styles.css"]) {
      const response = handleAppRequest(new Request(`http://127.0.0.1:4319${pathname}`), state);
      assertEquals(response.status, 503);
      assertEquals(await response.text(), "Asset not built. Run deno task ui:build.");
    }

    assertSpyCalls(readStub, 2);
  } finally {
    readStub.restore();
  }
});

Deno.test({
  name: "dashboard app server serves app shell and built asset responses",
  async fn() {
    const state = buildReceiverState(1_000);
    const htmlResponse = handleAppRequest(new Request("http://127.0.0.1:4319/"), state);
    const html = await htmlResponse.text();
    const encoder = new TextEncoder();
    const readStub = stub(Deno, "readFileSync", (path) => {
      const href = path instanceof URL ? path.href : String(path);
      if (href.includes("src/ui/dist/app.js")) {
        return encoder.encode('createRoot(document.getElementById("root"));');
      }
      if (href.includes("src/ui/dist/styles.css")) {
        return encoder.encode(".workbench { display: grid; }");
      }
      throw new Deno.errors.NotFound("missing");
    });

    try {
      const script = await handleAppRequest(new Request("http://127.0.0.1:4319/assets/app.js"), state);
      const css = await handleAppRequest(new Request("http://127.0.0.1:4319/assets/styles.css"), state);
      const scriptText = await script.text();
      const cssText = await css.text();

      assertStringIncludes(html, 'id="root"');
      assertStringIncludes(html, "__OTEL_DASHBOARD_ACTION_TOKEN__");
      assertStringIncludes(html, "/assets/styles.css");
      assertStringIncludes(html, "/assets/app.js");
      assertSpyCalls(readStub, 2);
      assertStringIncludes(String(readStub.calls[0].args[0]), "src/ui/dist/app.js");
      assertStringIncludes(String(readStub.calls[1].args[0]), "src/ui/dist/styles.css");
      assertEquals(script.headers.get("content-type"), "text/javascript; charset=utf-8");
      assertEquals(script.headers.get("cache-control"), "no-store");
      assertStringIncludes(scriptText, "createRoot(");
      assertFalse(scriptText.includes("placeholder"));
      assertEquals(css.headers.get("content-type"), "text/css; charset=utf-8");
      assertEquals(css.headers.get("cache-control"), "no-store");
      assertStringIncludes(cssText, ".workbench");
    } finally {
      readStub.restore();
    }
  },
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
  const token = dashboardActionToken();

  const beforeClearResponse = handleAppRequest(new Request("http://127.0.0.1:4319/api/dashboard"), state);
  const beforeClear = await beforeClearResponse.json();
  assertEquals(beforeClear.explorer.rows.length, 1);
  assertEquals(beforeClear.warnings.length, 2);

  const response = await handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard/clear", {
      headers: { "x-otel-inspector-action": token },
      method: "POST",
    }),
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

Deno.test("dashboard clear endpoint requires the dashboard action token", () => {
  const state = buildReceiverState(1_000);
  seedDashboardState(state);
  const missingToken = handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard/clear", { method: "POST" }),
    state,
  );
  const wrongToken = handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard/clear", {
      headers: { "x-otel-inspector-action": "not-the-dashboard-token" },
      method: "POST",
    }),
    state,
  );

  assertEquals(missingToken.status, 403);
  assertEquals(wrongToken.status, 403);
  assertNotEquals(currentSummary(state).overview.topServices, []);
});

function dashboardActionToken(): string {
  const html = handleAppRequest(new Request("http://127.0.0.1:4319/"), buildReceiverState(1_000));
  // The token is process-local, so reading it from any served shell mirrors the browser bootstrap.
  return String((html as Response).headers.get("x-otel-inspector-action-token"));
}

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
