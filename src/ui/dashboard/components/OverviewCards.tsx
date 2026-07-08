import React from "react";
import type { DashboardCard, DashboardProjection } from "../types.ts";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card } from "./ui/card.tsx";

type Cards = DashboardProjection["cards"];

const valueFormatter = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 6,
  useGrouping: true,
});

const orderedCards: Array<keyof Cards> = [
  "latency",
  "throughput",
  "errorRate",
  "activeRequests",
  "ingest",
  "dropped",
];

export function OverviewCards(
  { cards, onInspect, redaction }: {
    cards: Cards;
    onInspect?: (card: DashboardCard) => void;
    redaction?: DashboardProjection["redaction"];
  },
) {
  return (
    <section className="overview-grid" aria-label="Overview cards">
      {redaction && redaction.status === "blocked" && (
        <div className="overview-grid__redaction" aria-live="polite">
          <Badge data-state="degraded">
            {redaction.hiddenAttributeValues} attribute values redacted ({redaction.patternsMatched.join(", ")})
          </Badge>
        </div>
      )}
      {orderedCards.map((key) => <OverviewCard key={cards[key].id} card={cards[key]} onInspect={onInspect} />)}
    </section>
  );
}

function OverviewCard({ card, onInspect }: { card: DashboardCard; onInspect?: (card: DashboardCard) => void }) {
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
      {card.detailTarget && onInspect
        ? (
          <Button className="overview-card__inspect" onClick={() => onInspect(card)} type="button">
            Inspect source
          </Button>
        )
        : null}
    </Card>
  );
}

function formatValue(value: number): string {
  return valueFormatter.format(value);
}
