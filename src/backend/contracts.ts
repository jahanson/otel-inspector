export type ReceiverFailureCategory =
  | "method-not-allowed"
  | "endpoint-unsupported"
  | "signal-unsupported"
  | "content-type-unsupported"
  | "payload-too-large"
  | "decode-failed"
  | "normalize-failed";

export type ReceiverWarning = {
  code: string;
  message: string;
};

export type RedactionReport = {
  status: "passed" | "blocked";
  hiddenAttributeValues: number;
  patternsMatched: string[];
};

export type LiveTelemetrySummary = {
  observedAtMs: number;
  receiver: { endpoint: string; live: boolean; paused: boolean };
  ingest: { exportsPerSec: number; datapointsPerSec: number; bytesPerSec: number; dropped: number };
  overview: {
    p95Ms?: number;
    errorRate?: number;
    activeRequests?: number;
    requestRate?: number;
    topServices: string[];
  };
  redaction: RedactionReport;
  warnings: Array<ReceiverWarning>;
};

export type ReceiverContract = {
  host: "127.0.0.1";
  port: 4318;
  metricsPath: "/v1/metrics";
  tracesPath: "/v1/traces";
  logsPath: "/v1/logs";
  contentType: "application/x-protobuf";
  maxPayloadBytes: number;
};

export const RECEIVER_CONTRACT: ReceiverContract = {
  host: "127.0.0.1",
  port: 4318,
  metricsPath: "/v1/metrics",
  tracesPath: "/v1/traces",
  logsPath: "/v1/logs",
  contentType: "application/x-protobuf",
  maxPayloadBytes: 4 * 1024 * 1024,
};

export function receiverEndpoint(contract: ReceiverContract = RECEIVER_CONTRACT): string {
  return `http://${contract.host}:${contract.port}${contract.metricsPath}`;
}
