import React, { type CSSProperties, type ReactNode } from "react";

export type ChartConfig = Record<string, { label: string; color?: string }>;

export function ChartContainer(props: { config: ChartConfig; className?: string; children: ReactNode }) {
  const style = Object.entries(props.config).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value.color) {
      acc[`--chart-${key}`] = value.color;
      if (!acc["--chart-accent"]) {
        acc["--chart-accent"] = value.color;
      }
    }
    return acc;
  }, {});

  return (
    <div
      className={`chart-container ${props.className ?? ""}`.trim()}
      style={style as CSSProperties}
    >
      {props.children}
    </div>
  );
}

export function ChartTooltipContent(props: { label?: string; value?: string }) {
  return (
    <div className="chart-tooltip">
      {props.label ? <span className="chart-tooltip__label">{props.label}</span> : null}
      {props.value ? <strong>{props.value}</strong> : null}
    </div>
  );
}
