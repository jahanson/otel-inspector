import { createHmac } from "node:crypto";
import type { LiveTelemetrySummary } from "./contracts.ts";
import type { MetricPoint, PrimitiveAttributeValue } from "./metric_model.ts";
import { deriveLiveTelemetrySummary, normalizeDurationUpperBound } from "./metric_derivations.ts";
import type { TelemetryStoreSnapshot } from "./telemetry_store.ts";

const DASHBOARD_SERIES_KEY = crypto.getRandomValues(new Uint8Array(32));

export type CardState = "healthy" | "empty" | "paused" | "degraded" | "stale" | "unavailable";

export type DashboardCard = {
  id: "latency" | "throughput" | "error-rate" | "active-requests" | "ingest" | "dropped";
  label: string;
  state: CardState;
  value?: number;
  unit?: string;
  source: string;
  detailTarget?: { metricName?: string; seriesKey?: string };
};

export type ChartPoint = {
  observedAtMs: number;
  value: number;
  seriesKey: string;
  metricName: string;
  aggregation: "latest" | "sum" | "rate";
  datapointCount: number;
  service?: string;
  route?: string;
  statusCode?: number;
  state: "exact" | "estimated" | "degraded";
};

export type ChartSeries = {
  id: "latency" | "throughput" | "error-rate" | "ingest";
  label: string;
  unit: string;
  windowMs: number;
  points: ChartPoint[];
  unavailableReason?: string;
};

export type ExplorerRow = {
  seriesKey: string;
  metricName: string;
  metricType: string;
  unit?: string;
  latest?: number;
  rate?: number;
  resourceService?: string;
  attributes: Record<string, PrimitiveAttributeValue>;
  cardinality: number;
  lastObservedAtMs: number;
  status: CardState;
};

export type DashboardProjection = {
  observedAtMs: number;
  windowMs: number;
  receiver: LiveTelemetrySummary["receiver"];
  ingest: LiveTelemetrySummary["ingest"];
  cards: {
    latency: DashboardCard;
    throughput: DashboardCard;
    errorRate: DashboardCard;
    activeRequests: DashboardCard;
    ingest: DashboardCard;
    dropped: DashboardCard;
  };
  charts: {
    latency: ChartSeries;
    throughput: ChartSeries;
    errorRate: ChartSeries;
    ingest: ChartSeries;
  };
  explorer: { rows: ExplorerRow[] };
  redaction: LiveTelemetrySummary["redaction"];
  warnings: LiveTelemetrySummary["warnings"];
};

export type DashboardProjectionOptions = {
  observedAtMs?: number;
  windowMs?: number;
};

export function buildDashboardProjection(
  snapshot: TelemetryStoreSnapshot,
  summary: LiveTelemetrySummary,
  options: DashboardProjectionOptions = {},
): DashboardProjection {
  // `summary` supplies receiver state, warnings, and the observed timestamp;
  // overview and ingest values are recomputed from the selected window snapshot.
  const observedAtMs = options.observedAtMs ?? summary.observedAtMs;
  const windowMs = options.windowMs ?? 60_000;
  const points = snapshot.recentPoints.filter((point) => isPointInWindow(point.observedAtMs, observedAtMs, windowMs));
  const exportsInWindow = snapshot.exports.filter((record) =>
    isPointInWindow(record.observedAtMs, observedAtMs, windowMs)
  );
  const windowSnapshot = buildWindowSnapshot(snapshot, points, exportsInWindow);
  const windowSummary = {
    ...deriveLiveTelemetrySummary(windowSnapshot, observedAtMs - windowMs, observedAtMs),
    receiver: summary.receiver,
    warnings: summary.warnings,
  };
  const requestPoints = points.filter(isHttpRequestCount);
  const latencyPoints = points.filter(isHttpDurationHistogram);
  const errorPoints = requestPoints.filter(isErrorStatus);
  const statusPoints = requestPoints.filter(hasHttpStatus);

  return {
    observedAtMs,
    windowMs,
    receiver: summary.receiver,
    ingest: windowSummary.ingest,
    cards: {
      latency: latencyCard(windowSummary, latencyPoints),
      throughput: throughputCard(windowSummary, requestPoints),
      errorRate: errorRateCard(requestPoints, statusPoints),
      activeRequests: activeRequestsCard(points),
      ingest: ingestCard(windowSummary),
      dropped: droppedCard(windowSummary),
    },
    charts: {
      latency: latencyChart(latencyPoints, windowMs),
      throughput: throughputChart(requestPoints, windowMs),
      errorRate: errorRateChart(requestPoints, errorPoints, windowMs),
      ingest: ingestChart(exportsInWindow, windowSummary, windowMs),
    },
    explorer: { rows: explorerRows(points) },
    redaction: summary.redaction,
    warnings: windowSummary.warnings,
  };
}

function latencyCard(summary: LiveTelemetrySummary, points: MetricPoint[]): DashboardCard {
  const detailTarget = metricDetailTarget(points);
  if (summary.receiver.paused) {
    return card(
      "latency",
      "p95 latency",
      "paused",
      summary.overview.p95Ms,
      "ms",
      "View is paused; receiver remains live.",
      detailTarget,
    );
  }
  if (summary.overview.p95Ms === undefined) {
    return card(
      "latency",
      "p95 latency",
      points.length === 0 ? "unavailable" : "degraded",
      undefined,
      "ms",
      "No usable HTTP duration histogram in the selected window.",
      detailTarget,
    );
  }
  return card(
    "latency",
    "p95 latency",
    "healthy",
    summary.overview.p95Ms,
    "ms",
    "Bucket-derived from HTTP duration histograms.",
    detailTarget,
  );
}

function throughputCard(summary: LiveTelemetrySummary, points: MetricPoint[]): DashboardCard {
  const detailTarget = metricDetailTarget(points);
  if (summary.overview.requestRate === undefined) {
    return card(
      "throughput",
      "request rate",
      points.length === 0 ? "empty" : "unavailable",
      undefined,
      "req/s",
      "No HTTP request counter in the selected window.",
      detailTarget,
    );
  }
  return card(
    "throughput",
    "request rate",
    "healthy",
    summary.overview.requestRate,
    "req/s",
    "Derived from delta monotonic HTTP request counters.",
    detailTarget,
  );
}

function errorRateCard(
  points: MetricPoint[],
  statusPoints: MetricPoint[],
): DashboardCard {
  const detailTarget = metricDetailTarget(statusPoints);
  const statusTotal = statusPoints.reduce((total, point) => total + (point.value ?? 0), 0);
  if (statusPoints.length === 0 || statusTotal <= 0) {
    return card(
      "error-rate",
      "error rate",
      points.length === 0 ? "empty" : "unavailable",
      undefined,
      "%",
      "No HTTP status code attributes in the selected window.",
      detailTarget,
    );
  }
  const errorTotal = statusPoints.filter(isErrorStatus).reduce((total, point) => total + (point.value ?? 0), 0);
  const value = Math.round((errorTotal / statusTotal) * 10_000) / 100;
  return card(
    "error-rate",
    "error rate",
    value > 0 ? "degraded" : "healthy",
    value,
    "%",
    "Derived from HTTP status code attributes.",
    detailTarget,
  );
}

function activeRequestsCard(points: MetricPoint[]): DashboardCard {
  const latestBySeries = new Map<string, MetricPoint>();
  for (const point of points) {
    if (!isActiveRequestsGauge(point)) {
      continue;
    }
    const latest = latestBySeries.get(point.seriesKey);
    if (latest === undefined || point.observedAtMs >= latest.observedAtMs) {
      latestBySeries.set(point.seriesKey, point);
    }
  }
  const active = [...latestBySeries.values()];
  return active.length === 0
    ? card(
      "active-requests",
      "active requests",
      "unavailable",
      undefined,
      "req",
      "No active request gauge in the selected window.",
    )
    : card(
      "active-requests",
      "active requests",
      "healthy",
      active.reduce((total, point) => total + point.value!, 0),
      "req",
      "Latest value from each active request series.",
      metricDetailTarget(active),
    );
}

function isActiveRequestsGauge(point: MetricPoint): boolean {
  return point.metric.type === "gauge" && point.derivationStatus === "usable" && point.value !== undefined &&
    Number.isFinite(point.value) && point.value >= 0 &&
    (point.metric.name === "http.server.active_requests" || point.metric.name === "http.server.active_requests_count");
}

function ingestCard(summary: LiveTelemetrySummary): DashboardCard {
  if (summary.ingest.datapointsPerSec === 0) {
    return card("ingest", "ingest", "empty", undefined, "pts/s", "No accepted exports yet.");
  }
  return card(
    "ingest",
    "ingest",
    "healthy",
    summary.ingest.datapointsPerSec,
    "pts/s",
    "Datapoints accepted by the local receiver.",
  );
}

function droppedCard(summary: LiveTelemetrySummary): DashboardCard {
  return card(
    "dropped",
    "dropped",
    summary.ingest.dropped > 0 ? "degraded" : "healthy",
    summary.ingest.dropped,
    "pts",
    "Points evicted by bounded retention.",
  );
}

function card(
  id: DashboardCard["id"],
  label: string,
  state: CardState,
  value: number | undefined,
  unit: string,
  source: string,
  detailTarget?: DashboardCard["detailTarget"],
): DashboardCard {
  return { id, label, state, value, unit, source, detailTarget };
}

function latencyChart(points: MetricPoint[], windowMs: number): ChartSeries {
  return {
    id: "latency",
    label: "Latency",
    unit: "ms",
    windowMs,
    points: points.flatMap((point) => {
      const p95 = percentileUpperBound(point, 0.95);
      return p95 === undefined ? [] : [chartPoint(point, p95.value, "latest", p95.count, "estimated")];
    }),
    unavailableReason: points.length === 0 ? "No usable HTTP duration histogram in the selected window." : undefined,
  };
}

function throughputChart(points: MetricPoint[], windowMs: number): ChartSeries {
  return {
    id: "throughput",
    label: "Throughput",
    unit: "req",
    windowMs,
    points: points.map((point) => chartPoint(point, point.value ?? 0, "sum", 1)),
  };
}

function errorRateChart(requestPoints: MetricPoint[], errorPoints: MetricPoint[], windowMs: number): ChartSeries {
  return {
    id: "error-rate",
    label: "Error count",
    unit: "errors",
    windowMs,
    points: errorPoints.map((point) => chartPoint(point, point.value ?? 0, "sum", 1)),
    unavailableReason: requestPoints.length === 0 ? "No HTTP request counters in the selected window." : undefined,
  };
}

function ingestChart(
  exportsInWindow: TelemetryStoreSnapshot["exports"],
  summary: LiveTelemetrySummary,
  windowMs: number,
): ChartSeries {
  return {
    id: "ingest",
    label: "Ingest per export",
    unit: "pts/export",
    windowMs,
    points: exportsInWindow.map((record) => ({
      observedAtMs: record.observedAtMs,
      value: record.pointCount,
      seriesKey: `export:${record.observedAtMs}`,
      metricName: "otel.inspector.ingest.datapoints",
      aggregation: "sum",
      datapointCount: record.pointCount,
      state: "exact",
    })),
    unavailableReason: summary.ingest.datapointsPerSec === 0 ? "No accepted exports yet." : undefined,
  };
}

function buildWindowSnapshot(
  snapshot: TelemetryStoreSnapshot,
  points: MetricPoint[],
  exportsInWindow: TelemetryStoreSnapshot["exports"],
): TelemetryStoreSnapshot {
  return {
    totalExports: exportsInWindow.length,
    totalBytes: exportsInWindow.reduce((sum, record) => sum + record.bytesReceived, 0),
    totalPoints: exportsInWindow.reduce((sum, record) => sum + record.pointCount, 0),
    droppedPoints: snapshot.droppedPoints,
    recentPoints: points,
    exports: exportsInWindow,
    warnings: snapshot.warnings,
  };
}

function explorerRows(points: MetricPoint[]): ExplorerRow[] {
  const newestBySeries = new Map<string, MetricPoint>();
  for (const point of points) {
    const newest = newestBySeries.get(point.seriesKey);
    if (newest === undefined || point.observedAtMs >= newest.observedAtMs) {
      newestBySeries.set(point.seriesKey, point);
    }
  }

  return [...newestBySeries.values()].map((point) => ({
    seriesKey: opaqueSeriesKey(point.seriesKey),
    metricName: point.metric.name,
    metricType: point.metric.type,
    unit: point.metric.unit,
    latest: point.value,
    rate: isHttpRequestCount(point) ? point.value : undefined,
    resourceService: typeof point.resource["service.name"] === "string" ? point.resource["service.name"] : undefined,
    attributes: point.attributes,
    cardinality: 1,
    lastObservedAtMs: point.observedAtMs,
    status: statusForPoint(point),
  })).sort((left, right) =>
    left.metricName.localeCompare(right.metricName) || left.seriesKey.localeCompare(right.seriesKey)
  );
}

function isPointInWindow(pointObservedAtMs: number, observedAtMs: number, windowMs: number): boolean {
  return pointObservedAtMs <= observedAtMs && observedAtMs - pointObservedAtMs <= windowMs;
}

function chartPoint(
  point: MetricPoint,
  value: number,
  aggregation: ChartPoint["aggregation"],
  datapointCount: number,
  state: ChartPoint["state"] = point.derivationStatus === "usable" ? "exact" : "degraded",
): ChartPoint {
  return {
    observedAtMs: point.observedAtMs,
    value,
    seriesKey: opaqueSeriesKey(point.seriesKey),
    metricName: point.metric.name,
    aggregation,
    datapointCount,
    service: typeof point.resource["service.name"] === "string" ? point.resource["service.name"] : undefined,
    route: typeof point.attributes["http.route"] === "string" ? point.attributes["http.route"] : undefined,
    statusCode: typeof point.attributes["http.response.status_code"] === "number"
      ? point.attributes["http.response.status_code"]
      : typeof point.attributes["http.status_code"] === "number"
      ? point.attributes["http.status_code"]
      : undefined,
    state,
  };
}

function opaqueSeriesKey(seriesKey: string): string {
  return `series:opaque:${createHmac("sha256", DASHBOARD_SERIES_KEY).update(seriesKey).digest("hex")}`;
}

function statusForPoint(point: MetricPoint): CardState {
  return point.derivationStatus === "usable"
    ? "healthy"
    : point.derivationStatus === "incomplete"
    ? "degraded"
    : "unavailable";
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
  const status = point.attributes["http.response.status_code"] ?? point.attributes["http.status_code"];
  return typeof status === "number" && status >= 500;
}

function hasHttpStatus(point: MetricPoint): boolean {
  const status = point.attributes["http.response.status_code"] ?? point.attributes["http.status_code"];
  return typeof status === "number";
}

function metricDetailTarget(points: MetricPoint[]): DashboardCard["detailTarget"] | undefined {
  const newest = points.reduce<MetricPoint | undefined>((selected, point) => {
    if (selected === undefined || point.observedAtMs >= selected.observedAtMs) {
      return point;
    }
    return selected;
  }, undefined);

  return newest ? { metricName: newest.metric.name } : undefined;
}

function percentileUpperBound(point: MetricPoint, percentile: number): { value: number; count: number } | undefined {
  const buckets = point.buckets
    ?.map((bucket) => ({
      upperBound: normalizeDurationUpperBound(bucket.upperBound, point.metric.unit),
      count: bucket.count,
    }))
    ?.filter((bucket) => bucket.upperBound !== undefined && bucket.count > 0)
    .sort((left, right) => (left.upperBound as number) - (right.upperBound as number)) ?? [];
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total <= 0) {
    return undefined;
  }

  const targetRank = Math.ceil(total * percentile);
  let seen = 0;
  for (const bucket of buckets) {
    seen += bucket.count;
    if (seen >= targetRank) {
      return Number.isFinite(bucket.upperBound!) ? { value: bucket.upperBound!, count: total } : undefined;
    }
  }

  const last = buckets.at(-1);
  return last && Number.isFinite(last.upperBound!) ? { value: last.upperBound!, count: total } : undefined;
}
