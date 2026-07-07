import { assertEquals } from "@std/assert";
import {
  buildReceiverState,
  createLiveBusCadence,
  maybeBuildLiveTelemetrySummary,
} from "../../src/backend/live_bus.ts";

Deno.test("maybeBuildLiveTelemetrySummary emits first summary immediately", () => {
  const state = buildReceiverState(1_000);
  const cadence = createLiveBusCadence(500);

  const summary = maybeBuildLiveTelemetrySummary(state, cadence, 1_000);

  assertEquals(summary?.observedAtMs, 1_000);
  assertEquals(cadence.lastPublishedAtMs, 1_000);
});

Deno.test("maybeBuildLiveTelemetrySummary suppresses summaries inside cadence window", () => {
  const state = buildReceiverState(1_000);
  const cadence = createLiveBusCadence(500);

  maybeBuildLiveTelemetrySummary(state, cadence, 1_000);
  const suppressed = maybeBuildLiveTelemetrySummary(state, cadence, 1_250);
  const emitted = maybeBuildLiveTelemetrySummary(state, cadence, 1_500);

  assertEquals(suppressed, undefined);
  assertEquals(emitted?.observedAtMs, 1_500);
});
