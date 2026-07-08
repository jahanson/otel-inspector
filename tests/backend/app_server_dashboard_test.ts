import { assertEquals, assertStringIncludes } from "@std/assert";
import { handleAppRequest } from "../../src/backend/app_server.ts";
import { buildReceiverState } from "../../src/backend/receiver.ts";

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
  assertEquals(css.headers.get("content-type"), "text/css; charset=utf-8");
});

Deno.test("dashboard clear endpoint resets store through explicit boundary", async () => {
  const state = buildReceiverState(1_000);
  const response = await handleAppRequest(
    new Request("http://127.0.0.1:4319/api/dashboard/clear", { method: "POST" }),
    state,
  );

  assertEquals(response.status, 200);
  assertEquals((await response.json()).ok, true);
});
