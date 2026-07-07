import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildReceiverState } from "../../src/backend/receiver.ts";
import { handleAppRequest } from "../../src/backend/app_server.ts";

Deno.test("dashboard app server renders shell and summary API", async () => {
  const state = buildReceiverState(1_000);
  const htmlResponse = await handleAppRequest(new Request("http://127.0.0.1:4319/"), state);
  const summaryResponse = await handleAppRequest(new Request("http://127.0.0.1:4319/api/summary"), state);

  assertEquals(htmlResponse.status, 200);
  assertStringIncludes(await htmlResponse.text(), "OTEL Inspector");
  assertEquals(summaryResponse.headers.get("content-type"), "application/json");
  assertEquals((await summaryResponse.json()).receiver.endpoint, "http://127.0.0.1:4318/v1/metrics");
});
