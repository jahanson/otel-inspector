import { assertEquals } from "@std/assert";
import { mergeRedactionReports, redactAttributes, redactionReport } from "../../src/backend/redaction.ts";

Deno.test("redaction hides credentials embedded in otherwise safe attribute values", () => {
  const attributes = {
    "url.full": "https://example.test/orders?access_token=top-secret",
    "db.statement": "ALTER USER app PASSWORD = 'database-secret'",
    "http.route": "/orders/:id",
  };

  assertEquals(redactAttributes(attributes), {
    "url.full": "[REDACTED]",
    "db.statement": "[REDACTED]",
    "http.route": "/orders/:id",
  });
  assertEquals(redactionReport(attributes), {
    status: "blocked",
    hiddenAttributeValues: 2,
    patternsMatched: ["access-token-value", "password-value"],
  });
});

Deno.test("redaction keeps the documented safety-first substring key policy", () => {
  assertEquals(
    redactAttributes({ token_bucket_size: 100, session_duration_ms: 250 }),
    { token_bucket_size: "[REDACTED]", session_duration_ms: "[REDACTED]" },
  );
});

Deno.test("mergeRedactionReports sums hidden values and keeps unique patterns", () => {
  assertEquals(
    mergeRedactionReports(
      { status: "blocked", hiddenAttributeValues: 1, patternsMatched: ["authorization-value"] },
      { status: "blocked", hiddenAttributeValues: 2, patternsMatched: ["password", "authorization-value"] },
    ),
    {
      status: "blocked",
      hiddenAttributeValues: 3,
      patternsMatched: ["authorization-value", "password"],
    },
  );
});
