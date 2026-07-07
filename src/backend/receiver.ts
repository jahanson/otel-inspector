import { RECEIVER_CONTRACT, ReceiverContract, receiverEndpoint, ReceiverFailureCategory } from "./contracts.ts";
import {
  buildLiveTelemetrySummary,
  buildReceiverState,
  ReceiverState,
  recordReceiverExport,
  recordReceiverFailure,
} from "./live_bus.ts";

export { buildReceiverState, RECEIVER_CONTRACT, receiverEndpoint };
export type { ReceiverState };

type SafeFailureBody = {
  category: ReceiverFailureCategory;
  endpoint: string;
  contentType: string | null;
  bytesReceived: number;
  message: string;
  nextAction: string;
};

export async function handleReceiverRequest(
  request: Request,
  state: ReceiverState,
  contract: ReceiverContract = RECEIVER_CONTRACT,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method !== "POST") {
    return failureResponse(state, 405, "method-not-allowed", request, path, 0, "Send OTLP metrics with POST.");
  }

  if (path === contract.tracesPath || path === contract.logsPath) {
    return failureResponse(
      state,
      404,
      "signal-unsupported",
      request,
      path,
      0,
      "The MVP accepts metrics only. Keep traces and logs disabled for this receiver.",
    );
  }

  if (path !== contract.metricsPath) {
    return failureResponse(
      state,
      404,
      "endpoint-unsupported",
      request,
      path,
      0,
      "Send metric exports to /v1/metrics.",
    );
  }

  const contentType = request.headers.get("content-type");
  if (!isSupportedContentType(contentType, contract.contentType)) {
    return failureResponse(
      state,
      415,
      "content-type-unsupported",
      request,
      path,
      0,
      "Use Content-Type: application/x-protobuf.",
    );
  }

  const contentLength = parseContentLength(request.headers.get("content-length"));
  if (contentLength !== undefined && contentLength > contract.maxPayloadBytes) {
    return failureResponse(
      state,
      413,
      "payload-too-large",
      request,
      path,
      contentLength,
      "Reduce the OTLP export body below 4 MiB.",
    );
  }

  const payload = new Uint8Array(await request.arrayBuffer());
  if (payload.byteLength > contract.maxPayloadBytes) {
    return failureResponse(
      state,
      413,
      "payload-too-large",
      request,
      path,
      payload.byteLength,
      "Reduce the OTLP export body below 4 MiB.",
    );
  }

  recordReceiverExport(state, payload.byteLength);

  return failureResponse(
    state,
    400,
    "decode-failed",
    request,
    path,
    payload.byteLength,
    "Protobuf decoding will be enabled by the OTLP type generation slice.",
  );
}

export function startReceiver(state: ReceiverState = buildReceiverState()): Deno.HttpServer<Deno.NetAddr> {
  return Deno.serve(
    {
      hostname: RECEIVER_CONTRACT.host,
      port: RECEIVER_CONTRACT.port,
      onListen({ hostname, port }) {
        console.log(`OTEL Inspector receiver listening at http://${hostname}:${port}${RECEIVER_CONTRACT.metricsPath}`);
      },
    },
    (request) => handleReceiverRequest(request, state),
  );
}

export function currentSummary(state: ReceiverState) {
  return buildLiveTelemetrySummary(state);
}

function failureResponse(
  state: ReceiverState,
  status: number,
  category: ReceiverFailureCategory,
  request: Request,
  endpoint: string,
  bytesReceived: number,
  nextAction: string,
): Response {
  const contentType = request.headers.get("content-type");
  const message = safeFailureMessage(category);
  recordReceiverFailure(state, category, message);

  const body: SafeFailureBody = {
    category,
    endpoint,
    contentType,
    bytesReceived,
    message,
    nextAction,
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function isSupportedContentType(actual: string | null, expected: string): boolean {
  if (actual === null) {
    return false;
  }

  return actual.toLowerCase().split(";")[0].trim() === expected;
}

function parseContentLength(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function safeFailureMessage(category: ReceiverFailureCategory): string {
  switch (category) {
    case "method-not-allowed":
      return "Unsupported method for the OTLP metrics receiver.";
    case "endpoint-unsupported":
      return "Unsupported OTLP endpoint.";
    case "signal-unsupported":
      return "Unsupported OTLP signal for the metrics-first MVP.";
    case "content-type-unsupported":
      return "Unsupported content type for protobuf OTLP metrics.";
    case "payload-too-large":
      return "OTLP protobuf payload is larger than the receiver limit.";
    case "decode-failed":
      return "OTLP protobuf payload could not be decoded safely.";
  }
}
