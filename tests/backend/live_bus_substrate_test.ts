import { assertEquals } from "@std/assert";
import {
  buildLiveTelemetrySummary,
  buildReceiverState,
  recordReceiverExport,
  recordReceiverFailure,
} from "../../src/backend/live_bus.ts";
import { AggregationTemporality } from "../../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";

Deno.test("recordReceiverExport normalizes decoded exports into live summary data", () => {
  const state = buildReceiverState(1_000);

  recordReceiverExport(state, {
    exportRequest: {
      resourceMetrics: [{
        resource: {
          attributes: [{ key: "service.name", value: { value: { oneofKind: "stringValue", stringValue: "checkout" } } }],
          droppedAttributesCount: 0,
        },
        scopeMetrics: [{
          scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
          schemaUrl: "",
          metrics: [{
            name: "http.server.request.count",
            description: "",
            unit: "1",
            data: {
              oneofKind: "sum",
              sum: {
                aggregationTemporality: AggregationTemporality.DELTA,
                isMonotonic: true,
                dataPoints: [{
                  attributes: [
                    { key: "http.response.status_code", value: { value: { oneofKind: "intValue", intValue: 200n } } },
                  ],
                  startTimeUnixNano: 0n,
                  timeUnixNano: 10n,
                  value: { oneofKind: "asInt", asInt: 4n },
                }],
              },
            },
          }],
        }],
        schemaUrl: "",
      }],
    },
    bytesReceived: 128,
    observedAtMs: 2_000,
  });

  const summary = buildLiveTelemetrySummary(state, 3_000);

  assertEquals(summary.ingest.exportsPerSec, 0.5);
  assertEquals(summary.ingest.datapointsPerSec, 0.5);
  assertEquals(summary.ingest.bytesPerSec, 64);
  assertEquals(summary.overview.requestRate, 2);
  assertEquals(summary.overview.errorRate, 0);
  assertEquals(summary.overview.topServices, ["checkout"]);
});

Deno.test("buildLiveTelemetrySummary keeps receiver failures ahead of substrate warnings", () => {
  const state = buildReceiverState(1_000);

  recordReceiverFailure(state, "decode-failed", "OTLP protobuf payload could not be decoded safely.");

  const summary = buildLiveTelemetrySummary(state, 2_000);

  assertEquals(summary.warnings[0], {
    code: "decode-failed",
    message: "OTLP protobuf payload could not be decoded safely.",
  });
});
