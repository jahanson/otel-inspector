import React from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/card.tsx";
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "../components/ui/chart.tsx";
import type { DashboardProjection } from "../types.ts";
import { prepareChartTraces } from "./chart_data.ts";

type LiveChartsProps = { charts: DashboardProjection["charts"] };
type ChartKey = keyof DashboardProjection["charts"];
type TelemetryChartKind = "line" | "area";

type TelemetryChartDefinition = {
  key: ChartKey;
  colorToken: string;
  kind: TelemetryChartKind;
};

const chartDefinitions: TelemetryChartDefinition[] = [
  { key: "latency", kind: "line", colorToken: "var(--chart-latency)" },
  { key: "throughput", kind: "area", colorToken: "var(--chart-throughput)" },
  { key: "errorRate", kind: "line", colorToken: "var(--chart-error)" },
  { key: "ingest", kind: "area", colorToken: "var(--chart-ingest)" },
];

const valueFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  useGrouping: true,
});

export function LiveCharts({ charts }: LiveChartsProps) {
  return (
    <section className="chart-grid" aria-label="Live charts">
      {chartDefinitions.map((definition) => (
        <TelemetryChart
          key={definition.key}
          colorToken={definition.colorToken}
          kind={definition.kind}
          series={charts[definition.key]}
        />
      ))}
    </section>
  );
}

function TelemetryChart(
  props: { colorToken: string; kind: TelemetryChartKind; series: DashboardProjection["charts"][ChartKey] },
) {
  const { colorToken, kind, series } = props;
  const traces = prepareChartTraces(series.points);
  const config: ChartConfig = {
    value: {
      color: colorToken,
      label: series.label,
    },
  };

  return (
    <Card className="chart-card">
      <div className="chart-card__header">
        <div className="chart-card__heading">
          <h2>{series.label}</h2>
          <p className="chart-card__meta">{series.unit}</p>
        </div>
        <span className="chart-card__window">{formatWindow(series.windowMs)}</span>
      </div>
      {traces.length === 0
        ? <p className="empty-state chart-card__empty">{series.unavailableReason ?? "No chart data in this window."}</p>
        : (
          <ChartContainer config={config} className="chart-card__plot">
            <ResponsiveContainer width="100%" height="100%">
              {kind === "line"
                ? (
                  <LineChart accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="observedAtMs"
                      domain={["dataMin", "dataMax"]}
                      minTickGap={24}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={formatObservedAt}
                      tickLine={false}
                      type="number"
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={formatAxisValue}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }
                        return (
                          <div className="chart-tooltip-list">
                            {payload.map((entry) => (
                              <ChartTooltipContent
                                key={`${String(entry.payload.seriesKey)}:${String(entry.payload.observedAtMs)}`}
                                label={`${String(entry.name)} · ${String(entry.payload.timeLabel)}`}
                                value={formatTooltipValue(entry.value)}
                              />
                            ))}
                          </div>
                        );
                      }}
                      cursor={{ stroke: colorToken, strokeDasharray: "4 4" }}
                    />
                    {traces.map((trace) => (
                      <Line
                        data={trace.points}
                        dataKey="value"
                        dot={false}
                        isAnimationActive={false}
                        key={trace.seriesKey}
                        name={trace.detailLabel}
                        stroke={colorToken}
                        strokeWidth={2}
                        type="monotone"
                      />
                    ))}
                  </LineChart>
                )
                : (
                  <AreaChart accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`${series.id}-fill`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={colorToken} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={colorToken} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="observedAtMs"
                      domain={["dataMin", "dataMax"]}
                      minTickGap={24}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={formatObservedAt}
                      tickLine={false}
                      type="number"
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={formatAxisValue}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }
                        return (
                          <div className="chart-tooltip-list">
                            {payload.map((entry) => (
                              <ChartTooltipContent
                                key={`${String(entry.payload.seriesKey)}:${String(entry.payload.observedAtMs)}`}
                                label={`${String(entry.name)} · ${String(entry.payload.timeLabel)}`}
                                value={formatTooltipValue(entry.value)}
                              />
                            ))}
                          </div>
                        );
                      }}
                      cursor={{ stroke: colorToken, strokeDasharray: "4 4" }}
                    />
                    {traces.map((trace) => (
                      <Area
                        data={trace.points}
                        dataKey="value"
                        fill={`url(#${series.id}-fill)`}
                        isAnimationActive={false}
                        key={trace.seriesKey}
                        name={trace.detailLabel}
                        stroke={colorToken}
                        strokeWidth={2}
                        type="monotone"
                      />
                    ))}
                  </AreaChart>
                )}
            </ResponsiveContainer>
          </ChartContainer>
        )}
    </Card>
  );
}

function formatAxisValue(value: number | string): string {
  return formatTooltipValue(value);
}

function formatObservedAt(value: number): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTooltipValue(value: unknown): string {
  if (typeof value !== "number") {
    return "—";
  }
  return valueFormatter.format(value);
}

function formatWindow(windowMs: number): string {
  return `${Math.max(1, Math.round(windowMs / 60_000))}m window`;
}
