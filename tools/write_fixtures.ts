import { ExportMetricsServiceRequest } from "../src/backend/otel/proto/opentelemetry/proto/collector/metrics/v1/metrics_service.ts";
import { ResourceMetrics } from "../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";

const malformedFixture = new TextEncoder().encode("not-a-protobuf");
const validMinimalMetricsFixture = ExportMetricsServiceRequest.toBinary({
  resourceMetrics: [ResourceMetrics.create()],
});

await Deno.mkdir("fixtures/otlp", { recursive: true });
await Deno.writeFile("fixtures/otlp/malformed-protobuf.bin", malformedFixture);
await Deno.writeFile("fixtures/otlp/valid-minimal-metrics.bin", validMinimalMetricsFixture);

console.log("Wrote fixtures/otlp/malformed-protobuf.bin");
console.log("Wrote fixtures/otlp/valid-minimal-metrics.bin");
