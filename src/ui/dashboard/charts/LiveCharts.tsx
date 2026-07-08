import React from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/card.tsx";
import { type ChartConfig, ChartContainer, ChartTooltipContent } from "../components/ui/chart.tsx";
import type { DashboardProjection } from "../types.ts";

type LiveChartsProps = { charts: DashboardProjection["charts"] };
type ChartKey = keyof DashboardProjection["charts"];
type TelemetryChartKind = "line" | "area";

type TelemetryChartDefinition = {
  key: ChartKey;
  colorToken: string;
  kind: TelemetryChartKind;
};

type TelemetryChartPoint = {
  detailLabel: string;
  timeLabel: string;
  value: number;
};

const chartDefinitions: TelemetryChartDefinition[] = [
  { key: "latency", kind: "line", colorToken: "var(--chart-latency)" },
  { key: "throughput", kind: "area", colorToken: "var(--chart-throughput)" },
  { key: "errorRate", kind: "line", colorToken: "var(--chart-error)" },
  { key: "ingest", kind: "area", colorToken: "var(--chart-ingest)" },
];

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

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
  const data = series.points.map((point) => ({
    detailLabel: buildDetailLabel(point.service, point.route),
    timeLabel: timeFormatter.format(point.observedAtMs),
    value: point.value,
  }));
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
      {data.length === 0
        ? <p className="empty-state chart-card__empty">{series.unavailableReason ?? "No chart data in this window."}</p>
        : (
          <ChartContainer config={config} className="chart-card__plot">
            <ResponsiveContainer width="100%" height="100%">
              {kind === "line"
                ? (
                  <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="timeLabel"
                      minTickGap={24}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={formatAxisValue}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={({ active, label, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }
                        const point = payload[0]?.payload as TelemetryChartPoint | undefined;
                        const prefix = point?.detailLabel ? `${point.detailLabel} · ` : "";
                        return (
                          <ChartTooltipContent
                            label={`${prefix}${label ?? ""}`}
                            value={formatTooltipValue(payload[0]?.value)}
                          />
                        );
                      }}
                      cursor={{ stroke: colorToken, strokeDasharray: "4 4" }}
                    />
                    <Line
                      dataKey="value"
                      dot={false}
                      isAnimationActive={false}
                      stroke={colorToken}
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                )
                : (
                  <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`${series.id}-fill`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={colorToken} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={colorToken} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="timeLabel"
                      minTickGap={24}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                      tickFormatter={formatAxisValue}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={({ active, label, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }
                        const point = payload[0]?.payload as TelemetryChartPoint | undefined;
                        const prefix = point?.detailLabel ? `${point.detailLabel} · ` : "";
                        return (
                          <ChartTooltipContent
                            label={`${prefix}${label ?? ""}`}
                            value={formatTooltipValue(payload[0]?.value)}
                          />
                        );
                      }}
                      cursor={{ stroke: colorToken, strokeDasharray: "4 4" }}
                    />
                    <Area
                      dataKey="value"
                      isAnimationActive={false}
                      fill={`url(#${series.id}-fill)`}
                      stroke={colorToken}
                      strokeWidth={2}
                      type="monotone"
                    />
                  </AreaChart>
                )}
            </ResponsiveContainer>
          </ChartContainer>
        )}
    </Card>
  );
}

function buildDetailLabel(service?: string, route?: string): string {
  return [service, route].filter(Boolean).join(" / ");
}

function formatAxisValue(value: number | string): string {
  return formatTooltipValue(value);
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
