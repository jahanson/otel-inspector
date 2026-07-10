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
  attributes: Record<string, string | number | boolean>;
  cardinality: number;
  lastObservedAtMs: number;
  status: CardState;
};

export type RedactionReport = {
  status: "passed" | "blocked";
  hiddenAttributeValues: number;
  patternsMatched: string[];
};

export type DashboardProjection = {
  observedAtMs: number;
  windowMs: number;
  receiver: { endpoint: string; live: boolean; paused: boolean };
  ingest: { exportsPerSec: number; datapointsPerSec: number; bytesPerSec: number; dropped: number };
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
  redaction: RedactionReport;
  warnings: Array<{ code: string; message: string }>;
};

declare global {
  var __OTEL_INITIAL_PROJECTION__: DashboardProjection | undefined;
  var __OTEL_DASHBOARD_ACTION_TOKEN__: string | undefined;
}
