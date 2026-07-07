import {
  LiveTelemetrySummary,
  RECEIVER_CONTRACT,
  receiverEndpoint,
  ReceiverFailureCategory,
  ReceiverWarning,
} from "./contracts.ts";
import type { ExportMetricsServiceRequestMessage } from "./otel/decode.ts";
import { deriveLiveTelemetrySummary } from "./metric_derivations.ts";
import { normalizeMetricsExport } from "./normalize_metrics.ts";
import { createTelemetryStore, TelemetryStore } from "./telemetry_store.ts";

export type ReceiverState = {
  startedAtMs: number;
  store: TelemetryStore;
  failureCounts: Record<ReceiverFailureCategory, number>;
  lastWarning?: ReceiverWarning;
};

export function buildReceiverState(startedAtMs = Date.now()): ReceiverState {
  return {
    startedAtMs,
    store: createTelemetryStore(),
    failureCounts: {
      "method-not-allowed": 0,
      "endpoint-unsupported": 0,
      "signal-unsupported": 0,
      "content-type-unsupported": 0,
      "payload-too-large": 0,
      "decode-failed": 0,
      "normalize-failed": 0,
    },
  };
}

export function recordReceiverFailure(
  state: ReceiverState,
  category: ReceiverFailureCategory,
  message: string,
): void {
  state.failureCounts[category] += 1;
  state.lastWarning = { code: category, message };
}

export function recordReceiverExport(
  state: ReceiverState,
  input:
    | number
    | {
      exportRequest: ExportMetricsServiceRequestMessage;
      bytesReceived: number;
      observedAtMs?: number;
    },
): void {
  if (typeof input === "number") {
    state.store.recordExport({
      observedAtMs: Date.now(),
      bytesReceived: input,
      points: [],
      warnings: [],
    });
    delete state.lastWarning;
    return;
  }

  const observedAtMs = input.observedAtMs ?? Date.now();
  const normalized = normalizeMetricsExport(input.exportRequest, observedAtMs);
  state.store.recordExport({
    observedAtMs,
    bytesReceived: input.bytesReceived,
    points: normalized.points,
    warnings: normalized.warnings,
  });
  delete state.lastWarning;
}

export function buildLiveTelemetrySummary(
  state: ReceiverState,
  observedAtMs = Date.now(),
): LiveTelemetrySummary {
  const summary = deriveLiveTelemetrySummary(
    state.store.snapshot(),
    state.startedAtMs,
    observedAtMs,
  );
  const warnings = state.lastWarning ? [state.lastWarning, ...summary.warnings] : summary.warnings;

  return {
    ...summary,
    receiver: {
      endpoint: receiverEndpoint(RECEIVER_CONTRACT),
      live: true,
      paused: false,
    },
    warnings,
  };
}
