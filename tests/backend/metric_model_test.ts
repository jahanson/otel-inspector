import { assertEquals, assertMatch } from "@std/assert";
import { attributesFromKeyValues, buildSeriesKey, toNumberValue } from "../../src/backend/metric_model.ts";

Deno.test("attributesFromKeyValues keeps primitive OTLP values and omits unsafe complex values", () => {
  const attributes = attributesFromKeyValues([
    { key: "service.name", value: { value: { oneofKind: "stringValue", stringValue: "checkout" } } },
    { key: "http.response.status_code", value: { value: { oneofKind: "intValue", intValue: 503n } } },
    { key: "cache.hit", value: { value: { oneofKind: "boolValue", boolValue: true } } },
    { key: "http.server.duration", value: { value: { oneofKind: "doubleValue", doubleValue: 12.5 } } },
    { key: "payload.bytes", value: { value: { oneofKind: "bytesValue", bytesValue: new Uint8Array([1, 2, 3]) } } },
    { key: "empty", value: { value: { oneofKind: undefined } } },
  ]);

  assertEquals(attributes, {
    "service.name": "checkout",
    "http.response.status_code": 503,
    "cache.hit": true,
    "http.server.duration": 12.5,
  });
});

Deno.test("buildSeriesKey is deterministic regardless of object insertion order", () => {
  const first = buildSeriesKey({
    resource: { "service.name": "checkout", region: "us" },
    scope: { name: "otel.http", version: "1.0.0" },
    metricName: "http.server.duration",
    metricType: "histogram",
    unit: "ms",
    attributes: { route: "/cart", method: "GET" },
  });
  const second = buildSeriesKey({
    resource: { region: "us", "service.name": "checkout" },
    scope: { version: "1.0.0", name: "otel.http" },
    metricName: "http.server.duration",
    metricType: "histogram",
    unit: "ms",
    attributes: { method: "GET", route: "/cart" },
  });

  assertEquals(first, second);
  assertMatch(first, /^series:/);
});

Deno.test("buildSeriesKey skips explicit undefined optional fields", () => {
  const absent = buildSeriesKey({
    resource: { "service.name": "checkout" },
    scope: { name: "otel.http" },
    metricName: "http.server.duration",
    metricType: "histogram",
    attributes: {},
  });
  const explicitUndefined = buildSeriesKey({
    resource: { "service.name": "checkout" },
    scope: { name: "otel.http", version: undefined },
    metricName: "http.server.duration",
    metricType: "histogram",
    attributes: {},
  });

  assertEquals(absent, explicitUndefined);
});

Deno.test("toNumberValue converts safe bigint values and rejects unsafe bigint values", () => {
  assertEquals(toNumberValue(42n), 42);
  assertEquals(toNumberValue(42.5), 42.5);
  assertEquals(toNumberValue(9007199254740993n), undefined);
});
