import { assertEquals, assertFalse } from "@std/assert";
import { assertStringIncludes } from "@std/assert";
import { buildAppShell } from "../../src/ui/app_shell.ts";

Deno.test("app shell renders root mount, assets, and inline projection bootstrap", () => {
  const html = buildAppShell({
    receiver: { endpoint: "http://127.0.0.1:4318/v1/metrics" },
    windowMs: 60_000,
  });

  assertStringIncludes(html, "OTEL Inspector");
  assertStringIncludes(html, "<title>OTEL Inspector</title>");
  assertStringIncludes(html, 'id="root"');
  assertStringIncludes(html, "/assets/styles.css");
  assertStringIncludes(html, "/assets/app.js");
  assertStringIncludes(html, "__OTEL_INITIAL_PROJECTION__");
});

Deno.test("app shell escapes inline projection JSON for script safety", () => {
  const html = buildAppShell({
    warning: "bad <script> line\u2028next paragraph\u2029tail",
  });
  const jsonMatch = html.match(/__OTEL_INITIAL_PROJECTION__ = (?<json>.*);/);

  assertEquals(jsonMatch?.groups?.json.includes("\\u003cscript>"), true);
  assertEquals(jsonMatch?.groups?.json.includes("\\u2028"), true);
  assertEquals(jsonMatch?.groups?.json.includes("\\u2029"), true);
  assertFalse(jsonMatch?.groups?.json.includes("<script>"));
});
