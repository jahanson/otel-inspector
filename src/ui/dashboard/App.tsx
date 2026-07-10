import React, { useEffect, useState } from "react";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Tabs } from "./components/ui/tabs.tsx";
import { MetricsExplorer } from "./components/MetricsExplorer.tsx";
import { OverviewCards } from "./components/OverviewCards.tsx";
import { LiveCharts } from "./charts/LiveCharts.tsx";
import { type InspectionRequest, nextInspectionRequest } from "./inspection_request.ts";
import type { DashboardProjection } from "./types.ts";
import { markProjectionStale } from "./projection_freshness.ts";

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
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [metricsRequest, setMetricsRequest] = useState<InspectionRequest>();
  const displayProjection = refreshFailed ? markProjectionStale(projection) : projection;

  useEffect(() => {
    if (paused) {
      return;
    }

    const id = setInterval(() => {
      void refreshProjection(windowMs, setProjection, setRefreshError, setRefreshFailed);
    }, 1_000);

    return () => clearInterval(id);
  }, [paused, windowMs]);

  return (
    <main className="workbench">
      <header className="workbench__header">
        <div className="heading">
          <p className="eyebrow">Local telemetry dashboard</p>
          <h1>OTEL Inspector</h1>
          <p className="endpoint">{displayProjection.receiver.endpoint}</p>
        </div>
        <div className="toolbar" aria-label="Dashboard controls">
          <Badge data-state={paused ? "paused" : displayProjection.receiver.live ? "healthy" : "stale"}>
            {paused
              ? "Paused view"
              : refreshFailed
              ? "Data stale"
              : displayProjection.receiver.live
              ? "Receiver live"
              : "Receiver idle"}
          </Badge>
          <Button
            type="button"
            onClick={() => {
              if (paused) {
                void refreshProjection(windowMs, setProjection, setRefreshError, setRefreshFailed);
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
                    void refreshProjection(option.value, setProjection, setRefreshError, setRefreshFailed);
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
                const response = await fetch("/api/dashboard/clear", {
                  headers: { "x-otel-inspector-action": readActionToken() },
                  method: "POST",
                });
                if (!response.ok) {
                  throw new Error(`Clear failed with ${response.status}.`);
                }
                await refreshProjection(windowMs, setProjection, setRefreshError, setRefreshFailed);
                setLastAction(`Session cleared at ${new Date().toLocaleTimeString()}.`);
              } catch (error) {
                setRefreshError(error instanceof Error ? error.message : "Clear failed.");
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
                cards={displayProjection.cards}
                onInspect={(card) => {
                  const target = card.detailTarget;
                  if (target) {
                    setMetricsRequest((current) => nextInspectionRequest(current, target));
                  }
                  setActiveTab("metrics");
                }}
                redaction={displayProjection.redaction}
              />
              <LiveCharts charts={displayProjection.charts} />
            </>
          )
          : activeTab === "metrics"
          ? <MetricsExplorer request={metricsRequest} rows={displayProjection.explorer.rows} />
          : <p className="empty-state">This dashboard tab is not implemented yet.</p>}

        {displayProjection.warnings.length > 0 || refreshError
          ? (
            <div className="warning-list" aria-live="polite">
              {refreshError ? <p className="warning-item">{refreshError}</p> : null}
              {displayProjection.warnings.map((warning) => (
                <p key={warning.code} className="warning-item">{warning.message}</p>
              ))}
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
  setRefreshFailed: (failed: boolean) => void,
): Promise<void> {
  try {
    const response = await fetch(`/api/dashboard?windowMs=${windowMs}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Dashboard refresh failed with ${response.status}.`);
    }
    setProjection(await response.json());
    setRefreshFailed(false);
    setRefreshError(null);
  } catch (error) {
    setRefreshFailed(true);
    setRefreshError(error instanceof Error ? error.message : "Dashboard refresh failed.");
  }
}
