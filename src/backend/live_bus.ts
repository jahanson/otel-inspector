import { LiveTelemetrySummary, RECEIVER_CONTRACT, receiverEndpoint, ReceiverFailureCategory } from "./contracts.ts";

export type ReceiverState = {
  startedAtMs: number;
  totalExports: number;
  totalBytes: number;
  failureCounts: Record<ReceiverFailureCategory, number>;
  lastWarning?: { code: string; message: string };
};

export function buildReceiverState(startedAtMs = Date.now()): ReceiverState {
  return {
    startedAtMs,
    totalExports: 0,
    totalBytes: 0,
    failureCounts: {
      "method-not-allowed": 0,
      "endpoint-unsupported": 0,
      "signal-unsupported": 0,
      "content-type-unsupported": 0,
      "payload-too-large": 0,
      "decode-failed": 0,
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

export function recordReceiverExport(state: ReceiverState, bytesReceived: number): void {
  state.totalExports += 1;
  state.totalBytes += bytesReceived;
  delete state.lastWarning;
}

export function buildLiveTelemetrySummary(
  state: ReceiverState,
  observedAtMs = Date.now(),
): LiveTelemetrySummary {
  const elapsedSeconds = Math.max((observedAtMs - state.startedAtMs) / 1000, 1);
  const warnings = state.lastWarning ? [state.lastWarning] : [];

  return {
    observedAtMs,
    receiver: {
      endpoint: receiverEndpoint(RECEIVER_CONTRACT),
      live: true,
      paused: false,
    },
    ingest: {
      exportsPerSec: roundRate(state.totalExports / elapsedSeconds),
      datapointsPerSec: 0,
      bytesPerSec: roundRate(state.totalBytes / elapsedSeconds),
      dropped: 0,
    },
    overview: {
      requestRate: roundRate(state.totalExports / elapsedSeconds),
    },
    warnings,
  };
}

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}
