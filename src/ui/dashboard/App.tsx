import React, { useEffect, useState } from "react";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Tabs } from "./components/ui/tabs.tsx";
import { OverviewCards } from "./components/OverviewCards.tsx";
import { LiveCharts } from "./charts/LiveCharts.tsx";
import type { DashboardProjection } from "./types.ts";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "metrics", label: "Metrics" },
  { value: "payload", label: "Payload", disabled: true },
  { value: "settings", label: "Settings", disabled: true },
] as const;

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
              <LiveCharts charts={projection.charts} />
            </>
          )
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
