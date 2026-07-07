import { LiveTelemetrySummary, RECEIVER_CONTRACT, receiverEndpoint } from "./contracts.ts";
import type { MetricPoint, PrimitiveAttributeValue } from "./metric_model.ts";
import type { TelemetryStoreSnapshot } from "./telemetry_store.ts";

export function deriveLiveTelemetrySummary(
  snapshot: TelemetryStoreSnapshot,
  startedAtMs: number,
  observedAtMs: number,
): LiveTelemetrySummary {
  const elapsedSeconds = Math.max((observedAtMs - startedAtMs) / 1000, 1);
  const requestCount = sumValues(snapshot.recentPoints.filter(isHttpRequestCount));
  const errorCount = sumValues(snapshot.recentPoints.filter((point) => isHttpRequestCount(point) && isErrorStatus(point)));

  return {
    observedAtMs,
    receiver: {
      endpoint: receiverEndpoint(RECEIVER_CONTRACT),
      live: true,
      paused: false,
    },
    ingest: {
      exportsPerSec: roundRate(snapshot.totalExports / elapsedSeconds),
      datapointsPerSec: roundRate(snapshot.totalPoints / elapsedSeconds),
      bytesPerSec: roundRate(snapshot.totalBytes / elapsedSeconds),
      dropped: snapshot.droppedPoints,
    },
    overview: {
      requestRate: requestCount > 0 ? roundRate(requestCount / elapsedSeconds) : undefined,
      errorRate: requestCount > 0 ? roundRate(errorCount / requestCount) : undefined,
      p95Ms: percentileFromHistograms(snapshot.recentPoints.filter(isHttpDurationHistogram), 0.95),
      topServices: topServices(snapshot.recentPoints),
    },
    warnings: snapshot.warnings,
  };
}

function isHttpRequestCount(point: MetricPoint): boolean {
  return point.metric.type === "sum" &&
    point.derivationStatus === "usable" &&
    point.value !== undefined &&
    (point.metric.name === "http.server.request.count" || point.metric.name === "http.server.requests");
}

function isHttpDurationHistogram(point: MetricPoint): boolean {
  return point.metric.type === "histogram" &&
    point.derivationStatus === "usable" &&
    point.buckets !== undefined &&
    (point.metric.name === "http.server.duration" || point.metric.name === "http.server.request.duration");
}

function isErrorStatus(point: MetricPoint): boolean {
  const status = attributeNumber(point.attributes["http.response.status_code"] ?? point.attributes["http.status_code"]);
  return status !== undefined && status >= 500;
}

function attributeNumber(value: PrimitiveAttributeValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sumValues(points: MetricPoint[]): number {
  return points.reduce((sum, point) => sum + (point.value ?? 0), 0);
}

function percentileFromHistograms(points: MetricPoint[], quantile: number): number | undefined {
  const buckets = new Map<number, number>();
  let totalCount = 0;

  for (const point of points) {
    for (const bucket of point.buckets ?? []) {
      buckets.set(bucket.upperBound, (buckets.get(bucket.upperBound) ?? 0) + bucket.count);
      totalCount += bucket.count;
    }
  }

  if (totalCount === 0) {
    return undefined;
  }

  const rank = Math.ceil(totalCount * quantile);
  let seen = 0;
  let lastFiniteUpperBound: number | undefined;
  for (const [upperBound, count] of [...buckets.entries()].sort((left, right) => left[0] - right[0])) {
    seen += count;
    if (Number.isFinite(upperBound)) {
      lastFiniteUpperBound = upperBound;
    }
    if (seen >= rank) {
      return Number.isFinite(upperBound) ? upperBound : lastFiniteUpperBound;
    }
  }

  return undefined;
}

function topServices(points: MetricPoint[]): string[] {
  const counts = new Map<string, number>();
  for (const point of points) {
    const serviceName = point.resource["service.name"];
    if (typeof serviceName === "string" && serviceName.length > 0) {
      counts.set(serviceName, (counts.get(serviceName) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([serviceName]) => serviceName);
}

function roundRate(value: number): number {
  return Math.round(value * 100) / 100;
}
