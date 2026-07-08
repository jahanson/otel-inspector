import React, { useEffect, useState } from "react";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card } from "./components/ui/card.tsx";
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "./components/ui/chart.tsx";
import { Tabs } from "./components/ui/tabs.tsx";
import { OverviewCards } from "./components/OverviewCards.tsx";
import type { ChartSeries, DashboardProjection } from "./types.ts";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "metrics", label: "Metrics" },
  { value: "payload", label: "Payload", disabled: true },
  { value: "settings", label: "Settings", disabled: true },
] as const;

const chartConfig: ChartConfig = {
  latency: { label: "Latency", color: "var(--chart-latency)" },
  throughput: { label: "Throughput", color: "var(--chart-throughput)" },
  error: { label: "Errors", color: "var(--chart-error)" },
  ingest: { label: "Ingest", color: "var(--chart-ingest)" },
};

export function App() {
  const [projection, setProjection] = useState<DashboardProjection>(() => readInitialProjection());
  const [activeTab, setActiveTab] = useState("overview");
  const [paused, setPaused] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    const id = setInterval(() => {
      void refreshProjection(projection.windowMs, setProjection, setRefreshError);
    }, 1_000);

    return () => clearInterval(id);
  }, [paused, projection.windowMs]);

  return (
    <main className="workbench">
      <header className="workbench__header">
        <div className="heading">
          <p className="eyebrow">Local telemetry dashboard</p>
          <h1>OTEL Inspector</h1>
          <p className="endpoint">{projection.receiver.endpoint}</p>
        </div>
        <div className="toolbar" aria-label="Dashboard controls">
          <Badge data-state={paused ? "paused" : projection.receiver.live ? "healthy" : "stale"}>
            {paused ? "Paused view" : projection.receiver.live ? "Receiver live" : "Receiver idle"}
          </Badge>
          <Button type="button" onClick={() => setPaused((value) => !value)}>
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            type="button"
            disabled={clearing}
            onClick={async () => {
              setClearing(true);
              try {
                await fetch("/api/dashboard/clear", { method: "POST" });
                await refreshProjection(projection.windowMs, setProjection, setRefreshError);
              } finally {
                setClearing(false);
              }
            }}
          >
            {clearing ? "Clearing" : "Clear"}
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} values={[...tabs]} />

      <section className="workbench__body" id={`panel-${activeTab}`} role="tabpanel">
        {activeTab === "overview"
          ? (
            <>
              <OverviewCards cards={projection.cards} />

              <div className="chart-grid">
                <SeriesCard series={projection.charts.latency} tone="latency" />
                <SeriesCard series={projection.charts.throughput} tone="throughput" />
                <SeriesCard series={projection.charts.errorRate} tone="error" />
                <SeriesCard series={projection.charts.ingest} tone="ingest" />
              </div>
            </>
          )
          : null}

        {activeTab === "metrics"
          ? (
            <Card className="table-card">
              <div className="table-card__header">
                <h2>Series inventory</h2>
                <Badge data-state={projection.explorer.rows.length > 0 ? "healthy" : "empty"}>
                  {projection.explorer.rows.length} series
                </Badge>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Service</th>
                      <th scope="col">Latest</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.explorer.rows.length === 0
                      ? (
                        <tr>
                          <td colSpan={4} className="empty-state">No retained metric series yet.</td>
                        </tr>
                      )
                      : (
                        projection.explorer.rows.slice(0, 8).map((row) => (
                          <tr key={row.seriesKey}>
                            <td>{row.metricName}</td>
                            <td>{row.resourceService ?? "n/a"}</td>
                            <td className="tabular">{formatExplorerValue(row.latest, row.unit)}</td>
                            <td>
                              <Badge data-state={row.status}>{row.status}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            </Card>
          )
          : null}

        {activeTab === "payload" ? <p className="empty-state">Payload inspection arrives in a later task.</p> : null}
        {activeTab === "settings" ? <p className="empty-state">Session settings arrive in a later task.</p> : null}

        {projection.warnings.length > 0 || refreshError
          ? (
            <div className="warning-list" aria-live="polite">
              {refreshError ? <p className="warning-item">{refreshError}</p> : null}
              {projection.warnings.map((warning) => <p key={warning.code} className="warning-item">{warning.message}
              </p>)}
            </div>
          )
          : null}
      </section>
    </main>
  );
}

function SeriesCard(props: { series: ChartSeries; tone: keyof ChartConfig }) {
  const latest = props.series.points.at(-1);

  return (
    <Card className="series-card">
      <div className="series-card__header">
        <h2>{props.series.label}</h2>
        <Badge data-state={latest ? latest.state : "unavailable"}>
          {latest ? `${props.series.points.length} points` : "No data"}
        </Badge>
      </div>
      <ChartContainer config={{ [props.tone]: chartConfig[props.tone] }}>
        <div className="series-placeholder">
          <p className="metric-value">{latest ? formatSeriesValue(props.series, latest.value) : "Awaiting data"}</p>
          <ChartTooltipContent
            label={latest ? "Latest sample" : "Series state"}
            value={latest ? new Date(latest.observedAtMs).toLocaleTimeString() : props.series.unavailableReason}
          />
        </div>
      </ChartContainer>
    </Card>
  );
}

function readInitialProjection(): DashboardProjection {
  const projection = globalThis.__OTEL_INITIAL_PROJECTION__;
  if (!projection) {
    throw new Error("Missing initial dashboard projection.");
  }
  return projection;
}

async function refreshProjection(
  windowMs: number,
  setProjection: (projection: DashboardProjection) => void,
  setRefreshError: (message: string | null) => void,
): Promise<void> {
  try {
    const response = await fetch(`/api/dashboard?windowMs=${windowMs}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Dashboard refresh failed with ${response.status}.`);
    }
    setProjection(await response.json());
    setRefreshError(null);
  } catch (error) {
    setRefreshError(error instanceof Error ? error.message : "Dashboard refresh failed.");
  }
}

function formatSeriesValue(series: ChartSeries, value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${series.unit}`;
}

function formatExplorerValue(value: number | undefined, unit: string | undefined): string {
  if (value === undefined) {
    return "n/a";
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}${unit ? ` ${unit}` : ""}`;
}
