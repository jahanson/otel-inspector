import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildReceiverState, handleReceiverRequest, RECEIVER_CONTRACT } from "../../src/backend/receiver.ts";
import { buildLiveTelemetrySummary } from "../../src/backend/live_bus.ts";

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

Deno.test("POST /v1/metrics rejects oversize streamed payload without buffering past the limit", async () => {
  let chunksPulled = 0;
  const chunk = new Uint8Array(1024);
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      chunksPulled += 1;
      controller.enqueue(chunk);
    },
    cancel() {
      chunksPulled = -chunksPulled;
    },
  });

  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: stream,
    }),
    buildReceiverState(),
  );
  const body = await readFailure(response);

  assertEquals(response.status, 413);
  assertEquals(body["category"], "payload-too-large");
  assertEquals(body["bytesReceived"], RECEIVER_CONTRACT.maxPayloadBytes + 1);
  assertEquals(Math.abs(chunksPulled), RECEIVER_CONTRACT.maxPayloadBytes / chunk.byteLength + 1);
});

Deno.test("POST /v1/metrics with valid protobuf records successful export", async () => {
  const payload = await Deno.readFile("fixtures/otlp/valid-minimal-metrics.bin");
  const state = buildReceiverState(1_000);
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: toBody(payload),
    }),
    state,
  );
  const body = new Uint8Array(await response.arrayBuffer());
  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("content-type"), RECEIVER_CONTRACT.contentType);
  assertEquals(body.byteLength, 0);
  assertEquals(summary.ingest.exportsPerSec, 1);
  assertEquals(summary.ingest.bytesPerSec, payload.byteLength);
  assertEquals(summary.warnings, []);
});

Deno.test("POST /v1/metrics with empty protobuf body returns safe decode failure", async () => {
  const state = buildReceiverState(1_000);
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: new Uint8Array(),
    }),
    state,
  );
  const body = await readFailure(response);
  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(response.status, 400);
  assertEquals(body["category"], "decode-failed");
  assertEquals(body["bytesReceived"], 0);
  assertEquals(summary.ingest.exportsPerSec, 0);
});

Deno.test("POST /v1/metrics clears stale warning after successful export", async () => {
  const state = buildReceiverState(1_000);
  const malformedPayload = await Deno.readFile("fixtures/otlp/malformed-protobuf.bin");
  const validPayload = await Deno.readFile("fixtures/otlp/valid-minimal-metrics.bin");

  await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: malformedPayload,
    }),
    state,
  );
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: validPayload,
    }),
    state,
  );
  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(response.status, 200);
  assertEquals(summary.warnings, []);
  assertEquals(summary.ingest.exportsPerSec, 1);
});

Deno.test("POST /v1/metrics accepts OTLP histogram fixed64 count payload", async () => {
  const payload = metricExportWithHistogramFixed64Count();
  const state = buildReceiverState(1_000);
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: toBody(payload),
    }),
    state,
  );
  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(response.status, 200);
  assertEquals(summary.ingest.exportsPerSec, 1);
  assertEquals(summary.ingest.bytesPerSec, payload.byteLength);
});

Deno.test("POST /v1/metrics with malformed protobuf returns safe decode failure", async () => {
  const payload = await Deno.readFile("fixtures/otlp/malformed-protobuf.bin");
  const state = buildReceiverState(1_000);
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: payload,
    }),
    state,
  );
  const body = await readFailure(response);
  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(response.status, 400);
  assertEquals(body["category"], "decode-failed");
  assertEquals(body["endpoint"], "/v1/metrics");
  assertEquals(body["contentType"], RECEIVER_CONTRACT.contentType);
  assertEquals(body["bytesReceived"], payload.byteLength);
  assertStringIncludes(String(body["message"]), "protobuf");
  assertEquals(summary.ingest.exportsPerSec, 0);
  assertEquals(summary.ingest.bytesPerSec, 0);
});

function metricExportWithHistogramFixed64Count(): Uint8Array {
  const histogramDataPoint = fixed64Field(0x21, 1n);
  const histogram = bytes(0x0a, histogramDataPoint);
  const metric = bytes(0x4a, histogram);
  const scopeMetrics = bytes(0x12, metric);
  const resourceMetrics = bytes(0x12, scopeMetrics);

  return bytes(0x0a, resourceMetrics);
}

function bytes(tag: number, payload: Uint8Array): Uint8Array {
  return new Uint8Array([tag, payload.byteLength, ...payload]);
}

function fixed64Field(tag: number, value: bigint): Uint8Array {
  return new Uint8Array([tag, ...fixed64(value)]);
}

function fixed64(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, value, true);
  return bytes;
}

function toBody(payload: Uint8Array): ArrayBuffer {
  return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer;
}
