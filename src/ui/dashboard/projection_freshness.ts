import type { DashboardProjection } from "./types.ts";

export function markProjectionStale(projection: DashboardProjection): DashboardProjection {
  return {
    ...projection,
    receiver: { ...projection.receiver, live: false },
    cards: {
      latency: { ...projection.cards.latency, state: "stale" },
      throughput: { ...projection.cards.throughput, state: "stale" },
      errorRate: { ...projection.cards.errorRate, state: "stale" },
      activeRequests: { ...projection.cards.activeRequests, state: "stale" },
      ingest: { ...projection.cards.ingest, state: "stale" },
      dropped: { ...projection.cards.dropped, state: "stale" },
    },
  };
}
