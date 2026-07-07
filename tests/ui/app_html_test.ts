import { assertStringIncludes } from "@std/assert";
import { assertEquals, assertFalse } from "@std/assert";
import { buildReceiverState } from "../../src/backend/receiver.ts";
import { buildLiveTelemetrySummary } from "../../src/backend/live_bus.ts";
import { buildAppHtml } from "../../src/ui/app_html.ts";

Deno.test("app shell renders receiver endpoint and live synthetic summary", () => {
  const summary = buildLiveTelemetrySummary(buildReceiverState(1_000), 2_000);
  const html = buildAppHtml(summary);

  assertStringIncludes(html, "OTEL Inspector");
  assertStringIncludes(html, "http://127.0.0.1:4318/v1/metrics");
  assertStringIncludes(html, "exports/sec");
  assertStringIncludes(html, "Payload Inspector");
  assertStringIncludes(html, "grid-template-columns: repeat(12, minmax(0, 1fr));");
  assertStringIncludes(html, "min-height: 0;");
});

Deno.test("app shell escapes inline summary JSON for script safety", () => {
  const summary = buildLiveTelemetrySummary(buildReceiverState(1_000), 2_000);
  summary.warnings.push({
    code: "decode-failed",
    message: "bad <script> line\u2028next paragraph\u2029tail",
  });

  const html = buildAppHtml(summary);
  const jsonMatch = html.match(/const initialSummary = (?<json>.*);/);

  assertEquals(jsonMatch?.groups?.json.includes("\\u003cscript>"), true);
  assertEquals(jsonMatch?.groups?.json.includes("\\u2028"), true);
  assertEquals(jsonMatch?.groups?.json.includes("\\u2029"), true);
  assertFalse(jsonMatch?.groups?.json.includes("<script>"));
});
