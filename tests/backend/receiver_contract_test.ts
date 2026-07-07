import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildReceiverState, handleReceiverRequest, RECEIVER_CONTRACT } from "../../src/backend/receiver.ts";
import { buildLiveTelemetrySummary } from "../../src/backend/live_bus.ts";
import { ExportMetricsServiceRequest } from "../../src/backend/otel/proto/opentelemetry/proto/collector/metrics/v1/metrics_service.ts";
import { AggregationTemporality } from "../../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";

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
  assertEquals(summary.ingest.datapointsPerSec, 0);
  assertEquals(summary.ingest.bytesPerSec, payload.byteLength);
  assertEquals(summary.ingest.dropped, 0);
  assertEquals(summary.overview.topServices, []);
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

Deno.test("POST /v1/metrics normalization failures stay safe", async () => {
  const payload = await Deno.readFile("fixtures/otlp/valid-minimal-metrics.bin");
  const state = buildReceiverState(1_000);
  const originalRecordExport = state.store.recordExport.bind(state.store);
  state.store.recordExport = () => {
    throw new Error("secret raw normalization failure");
  };

  try {
    const response = await handleReceiverRequest(
      request("/v1/metrics", {
        method: "POST",
        headers: { "content-type": RECEIVER_CONTRACT.contentType },
        body: toBody(payload),
      }),
      state,
    );
    const body = await readFailure(response);

    assertEquals(response.status, 400);
    assertEquals(body["category"], "normalize-failed");
    assertEquals(body["message"], "OTLP metrics payload could not be normalized safely.");
    assertEquals(JSON.stringify(body).includes("secret"), false);
  } finally {
    state.store.recordExport = originalRecordExport;
  }
});

Deno.test("POST /v1/metrics with HTTP metrics updates datapoints and overview", async () => {
  const payload = httpMetricsExport();
  const state = buildReceiverState(1_000);
  const response = await handleReceiverRequest(
    request("/v1/metrics", {
      method: "POST",
      headers: { "content-type": RECEIVER_CONTRACT.contentType },
      body: toBody(payload),
    }),
    state,
  );
  const summary = buildLiveTelemetrySummary(state, 3_000);

  assertEquals(response.status, 200);
  assertEquals(summary.ingest.exportsPerSec, 0.5);
  assertEquals(summary.ingest.datapointsPerSec, 1.5);
  assertEquals(summary.overview.requestRate, 5);
  assertEquals(summary.overview.errorRate, 0.2);
  assertEquals(summary.overview.p95Ms, 100);
  assertEquals(summary.overview.topServices, ["checkout"]);
});

function metricExportWithHistogramFixed64Count(): Uint8Array {
  const histogramDataPoint = fixed64Field(0x21, 1n);
  const histogram = bytes(0x0a, histogramDataPoint);
  const metric = bytes(0x4a, histogram);
  const scopeMetrics = bytes(0x12, metric);
  const resourceMetrics = bytes(0x12, scopeMetrics);

  return bytes(0x0a, resourceMetrics);
}

function httpMetricsExport(): Uint8Array {
  return ExportMetricsServiceRequest.toBinary({
    resourceMetrics: [
      {
        resource: {
          attributes: [stringAttribute("service.name", "checkout")],
          droppedAttributesCount: 0,
        },
        scopeMetrics: [
          {
            metrics: [
              {
                name: "http.server.request.count",
                description: "",
                unit: "1",
                data: {
                  oneofKind: "sum",
                  sum: {
                    dataPoints: [
                      numberDataPoint(10n, 20n, 8n, [
                        stringAttribute("http.request.method", "GET"),
                        stringAttribute("http.route", "/cart"),
                        intAttribute("http.response.status_code", 200n),
                      ]),
                      numberDataPoint(10n, 20n, 2n, [
                        stringAttribute("http.request.method", "GET"),
                        stringAttribute("http.route", "/cart"),
                        intAttribute("http.response.status_code", 500n),
                      ]),
                    ],
                    aggregationTemporality: AggregationTemporality.DELTA,
                    isMonotonic: true,
                  },
                },
              },
              {
                name: "http.server.duration",
                description: "",
                unit: "ms",
                data: {
                  oneofKind: "histogram",
                  histogram: {
                    dataPoints: [histogramDataPoint()],
                    aggregationTemporality: AggregationTemporality.DELTA,
                  },
                },
              },
            ],
            schemaUrl: "",
          },
        ],
        schemaUrl: "",
      },
    ],
  });
}

function numberDataPoint(
  startTimeUnixNano: bigint,
  timeUnixNano: bigint,
  value: bigint,
  attributes: Array<ReturnType<typeof stringAttribute> | ReturnType<typeof intAttribute>>,
) {
  return {
    attributes,
    startTimeUnixNano,
    timeUnixNano,
    value: { oneofKind: "asInt" as const, asInt: value },
  };
}

function histogramDataPoint() {
  return {
    attributes: [
      stringAttribute("http.request.method", "GET"),
      stringAttribute("http.route", "/cart"),
    ],
    startTimeUnixNano: 10n,
    timeUnixNano: 20n,
    count: 10n,
    sum: 120,
    bucketCounts: [5n, 4n, 1n],
    explicitBounds: [50, 100],
  };
}

function stringAttribute(key: string, value: string) {
  return {
    key,
    value: {
      value: {
        oneofKind: "stringValue" as const,
        stringValue: value,
      },
    },
  };
}

function intAttribute(key: string, value: bigint) {
  return {
    key,
    value: {
      value: {
        oneofKind: "intValue" as const,
        intValue: value,
      },
    },
  };
}

function bytes(tag: number, payload: Uint8Array): Uint8Array {
  const length = encodeVarint(BigInt(payload.byteLength));
  return new Uint8Array([tag, ...length, ...payload]);
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

function encodeVarint(value: bigint): number[] {
  const encoded = [];
  let current = value;
  while (current >= 0x80n) {
    encoded.push(Number((current & 0x7fn) | 0x80n));
    current >>= 7n;
  }
  encoded.push(Number(current));
  return encoded;
}
