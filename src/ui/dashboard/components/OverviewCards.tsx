import React from "react";
import type { DashboardCard, DashboardProjection } from "../types.ts";
import { Badge } from "./ui/badge.tsx";
import { Card } from "./ui/card.tsx";

type Cards = DashboardProjection["cards"];

const orderedCards: Array<keyof Cards> = [
  "latency",
  "throughput",
  "errorRate",
  "activeRequests",
  "ingest",
  "dropped",
];

export function OverviewCards({ cards }: { cards: Cards }) {
  return (
    <section className="overview-grid" aria-label="Overview cards">
      {orderedCards.map((key) => <OverviewCard key={cards[key].id} card={cards[key]} />)}
    </section>
  );
}

function OverviewCard({ card }: { card: DashboardCard }) {
  return (
    <Card className="overview-card" data-state={card.state}>
      <div className="overview-card__topline">
        <p className="overview-card__label">{card.label}</p>
        <Badge data-state={card.state} className="overview-card__state">{card.state}</Badge>
      </div>
      <p className="overview-card__value-row">
        <span className="overview-card__value">
          {card.value === undefined ? "—" : formatValue(card.value)}
        </span>
        {card.unit ? <span className="overview-card__unit">{card.unit}</span> : null}
      </p>
      <p className="overview-card__source">{card.source}</p>
    </Card>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}
