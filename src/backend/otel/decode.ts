import {
  ExportMetricsServiceRequest,
  type ExportMetricsServiceRequest as ExportMetricsServiceRequestMessage,
  ExportMetricsServiceResponse,
} from "./proto/opentelemetry/proto/collector/metrics/v1/metrics_service.ts";

export type { ExportMetricsServiceRequestMessage };

export function decodeMetricsExportRequest(payload: Uint8Array): ExportMetricsServiceRequestMessage {
  return ExportMetricsServiceRequest.fromBinary(payload);
}

export function encodeMetricsExportResponse(): Uint8Array {
  return ExportMetricsServiceResponse.toBinary({});
}
