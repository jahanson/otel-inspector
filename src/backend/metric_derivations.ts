import { LiveTelemetrySummary, RECEIVER_CONTRACT, receiverEndpoint } from "./contracts.ts";
import type { MetricPoint, PrimitiveAttributeValue } from "./metric_model.ts";
import type { TelemetryStoreSnapshot } from "./telemetry_store.ts";

export function deriveLiveTelemetrySummary(
  snapshot: TelemetryStoreSnapshot,
  startedAtMs: number,
  observedAtMs: number,
): LiveTelemetrySummary {
  const elapsedSeconds = Math.max((observedAtMs - startedAtMs) / 1000, 1);
  const requestPoints = snapshot.recentPoints.filter(isHttpRequestCount);
  const requestCount = sumValues(requestPoints);
  const errorCount = sumValues(
    requestPoints.filter(isErrorStatus),
  );
  const requestWindowSeconds = retainedWindowSeconds(requestPoints, observedAtMs);
  const redaction = aggregateRedaction(snapshot.recentPoints);

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
      requestRate: requestCount > 0 ? roundRate(requestCount / requestWindowSeconds) : undefined,
      errorRate: requestCount > 0 ? roundRate(errorCount / requestCount) : undefined,
      p95Ms: percentileFromHistograms(snapshot.recentPoints.filter(isHttpDurationHistogram), 0.95),
      topServices: topServices(snapshot.recentPoints),
    },
    redaction,
    warnings: snapshot.warnings,
  };
}

function isHttpRequestCount(point: MetricPoint): boolean {
  return point.metric.type === "sum" &&
    point.metric.temporality === "delta" &&
    point.metric.monotonic === true &&
    point.derivationStatus === "usable" &&
    point.value !== undefined &&
    point.value >= 0 &&
    (point.metric.name === "http.server.request.count" || point.metric.name === "http.server.requests");
}

function isHttpDurationHistogram(point: MetricPoint): boolean {
  return point.metric.type === "histogram" &&
    point.metric.temporality === "delta" &&
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

function retainedWindowSeconds(points: MetricPoint[], observedAtMs: number): number {
  if (points.length === 0) {
    return 1;
  }

  let earliest = Number.POSITIVE_INFINITY;
  let latest = observedAtMs;
  for (const point of points) {
    earliest = Math.min(earliest, point.observedAtMs);
    latest = Math.max(latest, point.observedAtMs);
  }

  return Math.max((latest - earliest) / 1000, 1);
}

function percentileFromHistograms(points: MetricPoint[], quantile: number): number | undefined {
  const buckets = new Map<number, number>();
  let totalCount = 0;

  for (const point of points) {
    for (const bucket of point.buckets ?? []) {
      const upperBound = normalizeDurationUpperBound(bucket.upperBound, point.metric.unit);
      if (upperBound === undefined) {
        return undefined;
      }
      buckets.set(upperBound, (buckets.get(upperBound) ?? 0) + bucket.count);
      totalCount += bucket.count;
    }
  }

  if (totalCount === 0) {
    return undefined;
  }

  const rank = Math.ceil(totalCount * quantile);
  let seen = 0;
  for (const [upperBound, count] of [...buckets.entries()].sort((left, right) => left[0] - right[0])) {
    seen += count;
    if (seen >= rank) {
      return Number.isFinite(upperBound) ? upperBound : undefined;
    }
  }

  return undefined;
}

export function normalizeDurationUpperBound(upperBound: number, unit: string | undefined): number | undefined {
  if (!Number.isFinite(upperBound)) {
    return upperBound;
  }

  if (unit === "s") {
    return upperBound * 1000;
  }

  if (unit === "ms") {
    return upperBound;
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

function aggregateRedaction(points: MetricPoint[]): import("./contracts.ts").RedactionReport {
  let hiddenAttributeValues = 0;
  const patternsMatched: string[] = [];

  for (const point of points) {
    if (!point.redaction) {
      continue;
    }
    hiddenAttributeValues += point.redaction.hiddenAttributeValues;
    for (const pattern of point.redaction.patternsMatched) {
      if (!patternsMatched.includes(pattern)) {
        patternsMatched.push(pattern);
      }
    }
  }

  return {
    status: hiddenAttributeValues > 0 ? "blocked" : "passed",
    hiddenAttributeValues,
    patternsMatched,
  };
}
