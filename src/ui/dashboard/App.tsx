import React, { useEffect, useState } from "react";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Tabs } from "./components/ui/tabs.tsx";
import { MetricsExplorer } from "./components/MetricsExplorer.tsx";
import { OverviewCards } from "./components/OverviewCards.tsx";
import { LiveCharts } from "./charts/LiveCharts.tsx";
import type { DashboardCard, DashboardProjection } from "./types.ts";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "metrics", label: "Metrics" },
  { value: "payload", label: "Payload", disabled: true },
  { value: "settings", label: "Settings", disabled: true },
] as const;

const windowOptions = [
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
  { label: "15m", value: 900_000 },
] as const;

export function App() {
  const [projection, setProjection] = useState<DashboardProjection>(() => readInitialProjection());
  const [activeTab, setActiveTab] = useState("overview");
  const [windowMs, setWindowMs] = useState(() => projection.windowMs);
  const [paused, setPaused] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [metricsTarget, setMetricsTarget] = useState<DashboardCard["detailTarget"]>();

  useEffect(() => {
    if (paused) {
      return;
    }

    const id = setInterval(() => {
      void refreshProjection(windowMs, setProjection, setRefreshError);
    }, 1_000);

    return () => clearInterval(id);
  }, [paused, windowMs]);

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
          <Button
            type="button"
            onClick={() => {
              if (paused) {
                void refreshProjection(windowMs, setProjection, setRefreshError);
              }
              setPaused((value) => !value);
            }}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
          <div className="window-controls" aria-label="Time window">
            {windowOptions.map((option) => (
              <Button
                aria-pressed={windowMs === option.value}
                className="window-controls__button"
                key={option.value}
                onClick={() => {
                  setWindowMs(option.value);
                  if (!paused) {
                    void refreshProjection(option.value, setProjection, setRefreshError);
                  }
                }}
                type="button"
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            disabled={clearing}
            onClick={async () => {
              if (!globalThis.confirm("Clear retained telemetry for this dashboard session?")) {
                return;
              }
              setClearing(true);
              try {
                await fetch("/api/dashboard/clear", {
                  headers: { "x-otel-inspector-action": readActionToken() },
                  method: "POST",
                });
                await refreshProjection(windowMs, setProjection, setRefreshError);
                setLastAction(`Session cleared at ${new Date().toLocaleTimeString()}.`);
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
              <OverviewCards
                cards={projection.cards}
                onInspect={(card) => {
                  setMetricsTarget(card.detailTarget);
                  setActiveTab("metrics");
                }}
              />
              <LiveCharts charts={projection.charts} />
            </>
          )
          : activeTab === "metrics"
          ? <MetricsExplorer rows={projection.explorer.rows} target={metricsTarget} />
          : <p className="empty-state">This dashboard tab is not implemented yet.</p>}

        {projection.warnings.length > 0 || refreshError
          ? (
            <div className="warning-list" aria-live="polite">
              {refreshError ? <p className="warning-item">{refreshError}</p> : null}
              {projection.warnings.map((warning) => <p key={warning.code} className="warning-item">{warning.message}
              </p>)}
            </div>
          )
          : null}
        {lastAction ? <p className="last-action" aria-live="polite">{lastAction}</p> : null}
      </section>
    </main>
  );
}

function readInitialProjection(): DashboardProjection {
  const projection = globalThis.__OTEL_INITIAL_PROJECTION__;
  if (!projection) {
    throw new Error("Missing initial dashboard projection.");
  }
  return projection;
}

function readActionToken(): string {
  const token = globalThis.__OTEL_DASHBOARD_ACTION_TOKEN__;
  if (!token) {
    throw new Error("Missing dashboard action token.");
  }
  return token;
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
