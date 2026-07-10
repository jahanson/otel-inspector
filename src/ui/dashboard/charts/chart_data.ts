import type { ChartPoint } from "../types.ts";

export type PreparedChartPoint = ChartPoint & { timeLabel: string };

export type PreparedChartTrace = {
  seriesKey: string;
  detailLabel: string;
  points: PreparedChartPoint[];
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function prepareChartTraces(points: ChartPoint[]): PreparedChartTrace[] {
  const grouped = new Map<string, ChartPoint[]>();
  for (const point of points) {
    const trace = grouped.get(point.seriesKey) ?? [];
    trace.push(point);
    grouped.set(point.seriesKey, trace);
  }

  return [...grouped.entries()].map(([seriesKey, tracePoints]) => {
    const ordered = [...tracePoints].sort((left, right) => left.observedAtMs - right.observedAtMs);
    const metadata = ordered.at(-1)!;
    const source = [metadata.service, metadata.route].filter(Boolean).join(" / ");

    return {
      seriesKey,
      detailLabel: [metadata.metricName, source].filter(Boolean).join(" · "),
      points: ordered.map((point) => ({ ...point, timeLabel: timeFormatter.format(point.observedAtMs) })),
    };
  });
}
