import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildReceiverState, handleReceiverRequest, RECEIVER_CONTRACT } from "../../src/backend/receiver.ts";

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`http://${RECEIVER_CONTRACT.host}:${RECEIVER_CONTRACT.port}${path}`, init);
}

async function readFailure(response: Response): Promise<Record<string, unknown>> {
  assertEquals(response.headers.get("content-type"), "application/json");
  return await response.json();
}

Deno.test("GET /v1/metrics returns method-not-allowed", async () => {
  const response = await handleReceiverRequest(request("/v1/metrics"), buildReceiverState());
  const body = await readFailure(response);

  assertEquals(response.status, 405);
  assertEquals(body["category"], "method-not-allowed");
  assertEquals(body["endpoint"], "/v1/metrics");
});

Deno.test("POST /bad-path returns endpoint-unsupported", async () => {
  const response = await handleReceiverRequest(request("/bad-path", { method: "POST" }), buildReceiverState());
  const body = await readFailure(response);

  assertEquals(response.status, 404);
  assertEquals(body["category"], "endpoint-unsupported");
  assertEquals(body["endpoint"], "/bad-path");
});

Deno.test("POST /v1/traces returns signal-unsupported", async () => {
  const response = await handleReceiverRequest(request("/v1/traces", { method: "POST" }), buildReceiverState());
  const body = await readFailure(response);

  assertEquals(response.status, 404);
  assertEquals(body["category"], "signal-unsupported");
  assertEquals(body["endpoint"], "/v1/traces");
});

Deno.test("POST /v1/logs returns signal-unsupported", async () => {
  const response = await handleReceiverRequest(request("/v1/logs", { method: "POST" }), buildReceiverState());
  const body = await readFailure(response);

  assertEquals(response.status, 404);
  assertEquals(body["category"], "signal-unsupported");
  assertEquals(body["endpoint"], "/v1/logs");
});

Deno.test("POST /v1/metrics with JSON returns content-type-unsupported", async () => {
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    buildReceiverState(),
  );
  const body = await readFailure(response);

  assertEquals(response.status, 415);
  assertEquals(body["category"], "content-type-unsupported");
});

Deno.test("POST /v1/metrics rejects oversize payload before decode", async () => {
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: {
        "content-type": RECEIVER_CONTRACT.contentType,
        "content-length": String(RECEIVER_CONTRACT.maxPayloadBytes + 1),
      },
      body: new Uint8Array(),
    }),
    buildReceiverState(),
  );
  const body = await readFailure(response);

  assertEquals(response.status, 413);
  assertEquals(body["category"], "payload-too-large");
  assertEquals(body["bytesReceived"], RECEIVER_CONTRACT.maxPayloadBytes + 1);
});

Deno.test("POST /v1/metrics with malformed protobuf returns safe decode failure", async () => {
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: new Uint8Array([0, 1, 2, 3]),
    }),
    buildReceiverState(),
  );
  const body = await readFailure(response);

  assertEquals(response.status, 400);
  assertEquals(body["category"], "decode-failed");
  assertEquals(body["endpoint"], "/v1/metrics");
  assertEquals(body["contentType"], RECEIVER_CONTRACT.contentType);
  assertEquals(body["bytesReceived"], 4);
  assertStringIncludes(String(body["message"]), "protobuf");
});
