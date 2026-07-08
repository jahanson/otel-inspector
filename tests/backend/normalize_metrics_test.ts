import { assertEquals } from "@std/assert";
import { normalizeMetricsExport } from "../../src/backend/normalize_metrics.ts";
import { ExportMetricsServiceRequest } from "../../src/backend/otel/proto/opentelemetry/proto/collector/metrics/v1/metrics_service.ts";
import {
  AggregationTemporality,
  type ExponentialHistogramDataPoint,
  type Metric,
} from "../../src/backend/otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";

Deno.test("normalizeMetricsExport emits gauge and sum datapoints with resource and scope context", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: {
        attributes: [
          stringAttribute("service.name", "checkout"),
          stringAttribute("deployment.environment", "dev"),
        ],
        droppedAttributesCount: 0,
      },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [
          gaugeMetric("queue.depth", "items", 7),
          sumMetric("http.server.request.count", "1", 5, AggregationTemporality.DELTA, true),
        ],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.warnings, []);
  assertEquals(result.points.length, 2);
  assertEquals(result.points[0].resource["service.name"], "checkout");
  assertEquals(result.points[0].scope, { name: "manual-fixture", version: "1.0.0" });
  assertEquals(result.points[0].metric.type, "gauge");
  assertEquals(result.points[0].metric.name, "queue.depth");
  assertEquals(result.points[0].metric.unit, "items");
  assertEquals(result.points[0].value, 7);
  assertEquals(result.points[0].timestampUnixNano, "100");
  assertEquals(result.points[0].derivationStatus, "usable");
  assertEquals(result.points[1].metric.type, "sum");
  assertEquals(result.points[1].metric.temporality, "delta");
  assertEquals(result.points[1].metric.monotonic, true);
  assertEquals(result.points[1].value, 5);
});

Deno.test("generated metrics bindings expose exponential histogram metrics", () => {
  const dataPoint: ExponentialHistogramDataPoint = {
    attributes: [stringAttribute("http.route", "/cart")],
    startTimeUnixNano: 10n,
    timeUnixNano: 20n,
    count: 5n,
    sum: 120,
    scale: 2,
    zeroCount: 1n,
    positive: { offset: -1, bucketCounts: [1n, 2n] },
    negative: { offset: 0, bucketCounts: [1n] },
    flags: 0,
    min: 1,
    max: 80,
    zeroThreshold: 0,
  };
  const metric: Metric = {
    name: "http.server.duration.exp",
    description: "",
    unit: "ms",
    data: {
      oneofKind: "exponentialHistogram",
      exponentialHistogram: {
        aggregationTemporality: AggregationTemporality.DELTA,
        dataPoints: [dataPoint],
      },
    },
  };

  assertEquals(metric.data.oneofKind, "exponentialHistogram");
  if (metric.data.oneofKind === "exponentialHistogram") {
    assertEquals(metric.data.exponentialHistogram.dataPoints[0].positive?.bucketCounts, [1n, 2n]);
  }
});

Deno.test("normalizeMetricsExport retains exponential histogram datapoints as unsupported typed points", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [stringAttribute("service.name", "checkout")], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration.exp",
          description: "duration",
          unit: "ms",
          data: {
            oneofKind: "exponentialHistogram",
            exponentialHistogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [
                  stringAttribute("http.request.method", "GET"),
                  stringAttribute("http.route", "/cart"),
                ],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 5n,
                sum: 120,
                scale: 2,
                zeroCount: 1n,
                positive: { offset: -1, bucketCounts: [1n, 2n] },
                negative: { offset: 0, bucketCounts: [1n] },
                flags: 0,
                min: 1,
                max: 80,
                zeroThreshold: 0,
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "exponential_histogram");
  assertEquals(result.points[0].metric.temporality, "delta");
  assertEquals(result.points[0].derivationStatus, "unsupported");
  assertEquals(result.points[0].resource["service.name"], "checkout");
  assertEquals(result.points[0].attributes["http.route"], "/cart");
  assertEquals(result.points[0].startTimeUnixNano, "10");
  assertEquals(result.points[0].timestampUnixNano, "20");
  assertEquals(result.points[0].count, 5);
  assertEquals(result.points[0].sum, 120);
  assertEquals(result.points[0].exponentialHistogram, {
    scale: 2,
    zeroCount: 1,
    zeroThreshold: 0,
    positive: { offset: -1, counts: [1, 2] },
    negative: { offset: 0, counts: [1] },
    min: 1,
    max: 80,
  });
  assertEquals(result.points[0].warnings, [{
    code: "metric-unsupported",
    message: "Exponential histogram is retained but not yet used for derivations.",
  }]);
  assertEquals(result.warnings[0].code, "metric-unsupported");
});

Deno.test("normalizeMetricsExport decodes OTLP exponential histogram uint64 bucket counts", () => {
  const decoded = ExportMetricsServiceRequest.fromBinary(exponentialHistogramWithUint64BucketCounts());
  const result = normalizeMetricsExport(decoded, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "exponential_histogram");
  assertEquals(result.points[0].count, 3);
  assertEquals(result.points[0].exponentialHistogram?.positive, { offset: 0, counts: [1, 2] });
  assertEquals(result.points[0].derivationStatus, "unsupported");
});

Deno.test("normalizeMetricsExport ignores exponential histogram values with no recorded value flag", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration.exp",
          description: "",
          unit: "ms",
          data: {
            oneofKind: "exponentialHistogram",
            exponentialHistogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [stringAttribute("http.route", "/cart")],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 5n,
                sum: 120,
                scale: 2,
                zeroCount: 1n,
                positive: { offset: -1, bucketCounts: [1n, 2n] },
                negative: { offset: 0, bucketCounts: [1n] },
                flags: 1,
                min: 1,
                max: 80,
                zeroThreshold: 0,
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "exponential_histogram");
  assertEquals(result.points[0].metric.temporality, "delta");
  assertEquals(result.points[0].attributes["http.route"], "/cart");
  assertEquals(result.points[0].startTimeUnixNano, "10");
  assertEquals(result.points[0].timestampUnixNano, "20");
  assertEquals(result.points[0].count, undefined);
  assertEquals(result.points[0].sum, undefined);
  assertEquals(result.points[0].exponentialHistogram, undefined);
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].warnings, [{
    code: "metric-no-recorded-value",
    message: "Exponential histogram datapoint has no recorded value.",
  }]);
  assertEquals(result.warnings[0].code, "metric-no-recorded-value");
});

Deno.test("normalizeMetricsExport reports incomplete exponential histograms when bucket totals do not match count", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration.exp",
          description: "",
          unit: "ms",
          data: {
            oneofKind: "exponentialHistogram",
            exponentialHistogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [stringAttribute("http.route", "/cart")],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 10n,
                sum: 120,
                scale: 2,
                zeroCount: 1n,
                positive: { offset: -1, bucketCounts: [1n, 2n] },
                negative: { offset: 0, bucketCounts: [1n] },
                flags: 0,
                min: 1,
                max: 80,
                zeroThreshold: 0,
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "exponential_histogram");
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].count, 10);
  assertEquals(result.points[0].exponentialHistogram, undefined);
  assertEquals(result.points[0].warnings, [{
    code: "exponential-histogram-incomplete",
    message: "Exponential histogram datapoint cannot be retained as safe bucket metadata.",
  }]);
  assertEquals(result.warnings[0].code, "exponential-histogram-incomplete");
});

Deno.test("normalizeMetricsExport emits histogram bucket points when bucket data is usable", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [stringAttribute("service.name", "api")], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration",
          description: "duration",
          unit: "ms",
          data: {
            oneofKind: "histogram",
            histogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [
                  stringAttribute("http.request.method", "GET"),
                  stringAttribute("http.route", "/cart"),
                ],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 3n,
                sum: 60,
                bucketCounts: [1n, 2n],
                explicitBounds: [10],
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.warnings, []);
  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "histogram");
  assertEquals(result.points[0].metric.temporality, "delta");
  assertEquals(result.points[0].count, 3);
  assertEquals(result.points[0].sum, 60);
  assertEquals(result.points[0].buckets, [
    { upperBound: 10, count: 1 },
    { upperBound: Number.POSITIVE_INFINITY, count: 2 },
  ]);
  assertEquals(result.points[0].attributes["http.route"], "/cart");
});

Deno.test("normalizeMetricsExport retains unsupported metric records without failing the whole export", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "legacy.summary",
          description: "",
          unit: "",
          data: { oneofKind: "summary", summary: { dataPoints: [] } },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "summary");
  assertEquals(result.points[0].derivationStatus, "unsupported");
  assertEquals(result.points[0].warnings[0].code, "metric-unsupported");
  assertEquals(result.warnings[0].code, "metric-unsupported");
});

Deno.test("normalizeMetricsExport retains one unsupported summary point per summary datapoint", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: {
        attributes: [stringAttribute("service.name", "checkout")],
        droppedAttributesCount: 0,
      },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration.summary",
          description: "duration summary",
          unit: "ms",
          data: {
            oneofKind: "summary",
            summary: {
              dataPoints: [
                {
                  attributes: [stringAttribute("http.route", "/cart")],
                  startTimeUnixNano: 10n,
                  timeUnixNano: 20n,
                  count: 3n,
                  sum: 60,
                  quantileValues: [],
                },
                {
                  attributes: [stringAttribute("http.route", "/checkout")],
                  startTimeUnixNano: 11n,
                  timeUnixNano: 21n,
                  count: 5n,
                  sum: 125,
                  quantileValues: [],
                },
              ],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 2);
  assertEquals(result.warnings.length, 2);
  assertEquals(result.points[0].metric.type, "summary");
  assertEquals(result.points[0].derivationStatus, "unsupported");
  assertEquals(result.points[0].attributes["http.route"], "/cart");
  assertEquals(result.points[0].startTimeUnixNano, "10");
  assertEquals(result.points[0].timestampUnixNano, "20");
  assertEquals(result.points[0].count, 3);
  assertEquals(result.points[0].sum, 60);
  assertEquals(result.points[0].warnings[0].code, "metric-unsupported");
  assertEquals(result.points[1].attributes["http.route"], "/checkout");
  assertEquals(result.points[1].startTimeUnixNano, "11");
  assertEquals(result.points[1].timestampUnixNano, "21");
  assertEquals(result.points[1].count, 5);
  assertEquals(result.points[1].sum, 125);
  assertEquals(result.warnings[0].code, "metric-unsupported");
  assertEquals(result.warnings[1].code, "metric-unsupported");
});

Deno.test("normalizeMetricsExport emits metric-value-missing warnings for datapoints without a usable number", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "queue.depth",
          description: "",
          unit: "items",
          data: {
            oneofKind: "gauge",
            gauge: {
              dataPoints: [{
                attributes: [stringAttribute("queue.name", "jobs")],
                startTimeUnixNano: 0n,
                timeUnixNano: 100n,
                value: { oneofKind: undefined },
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "gauge");
  assertEquals(result.points[0].attributes["queue.name"], "jobs");
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].value, undefined);
  assertEquals(result.points[0].warnings, [{
    code: "metric-value-missing",
    message: "Metric datapoint has no usable numeric value.",
  }]);
  assertEquals(result.warnings, [{
    code: "metric-value-missing",
    message: "Metric datapoint has no usable numeric value.",
  }]);
});

Deno.test("normalizeMetricsExport emits histogram-incomplete warnings for unusable histogram buckets", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration",
          description: "",
          unit: "ms",
          data: {
            oneofKind: "histogram",
            histogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [stringAttribute("http.route", "/cart")],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 3n,
                sum: 60,
                bucketCounts: [1n],
                explicitBounds: [10],
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "histogram");
  assertEquals(result.points[0].attributes["http.route"], "/cart");
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].count, 3);
  assertEquals(result.points[0].sum, 60);
  assertEquals(result.points[0].buckets, undefined);
  assertEquals(result.points[0].warnings, [{
    code: "histogram-incomplete",
    message: "Histogram datapoint cannot produce safe percentile estimates.",
  }]);
  assertEquals(result.warnings, [{
    code: "histogram-incomplete",
    message: "Histogram datapoint cannot produce safe percentile estimates.",
  }]);
});

Deno.test("normalizeMetricsExport rejects histograms whose bucket counts do not match count", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration",
          description: "",
          unit: "ms",
          data: {
            oneofKind: "histogram",
            histogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [stringAttribute("http.route", "/cart")],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 3n,
                sum: 60,
                bucketCounts: [1n, 1n],
                explicitBounds: [10],
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "histogram");
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].buckets, undefined);
  assertEquals(result.warnings, [{
    code: "histogram-incomplete",
    message: "Histogram datapoint cannot produce safe percentile estimates.",
  }]);
});

Deno.test("normalizeMetricsExport rejects histograms with unsorted explicit bounds", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: { attributes: [], droppedAttributesCount: 0 },
      scopeMetrics: [{
        scope: undefined,
        schemaUrl: "",
        metrics: [{
          name: "http.server.duration",
          description: "",
          unit: "ms",
          data: {
            oneofKind: "histogram",
            histogram: {
              aggregationTemporality: AggregationTemporality.DELTA,
              dataPoints: [{
                attributes: [stringAttribute("http.route", "/cart")],
                startTimeUnixNano: 10n,
                timeUnixNano: 20n,
                count: 3n,
                sum: 60,
                bucketCounts: [1n, 1n, 1n],
                explicitBounds: [25, 10],
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].metric.type, "histogram");
  assertEquals(result.points[0].derivationStatus, "incomplete");
  assertEquals(result.points[0].buckets, undefined);
  assertEquals(result.warnings, [{
    code: "histogram-incomplete",
    message: "Histogram datapoint cannot produce safe percentile estimates.",
  }]);
});

function gaugeMetric(name: string, unit: string, value: number): Metric {
  return {
    name,
    description: "",
    unit,
    data: {
      oneofKind: "gauge",
      gauge: {
        dataPoints: [{
          attributes: [],
          startTimeUnixNano: 0n,
          timeUnixNano: 100n,
          value: { oneofKind: "asDouble", asDouble: value },
        }],
      },
    },
  };
}

function sumMetric(
  name: string,
  unit: string,
  value: number,
  temporality: AggregationTemporality,
  monotonic: boolean,
): Metric {
  return {
    name,
    description: "",
    unit,
    data: {
      oneofKind: "sum",
      sum: {
        aggregationTemporality: temporality,
        isMonotonic: monotonic,
        dataPoints: [{
          attributes: [],
          startTimeUnixNano: 0n,
          timeUnixNano: 100n,
          value: { oneofKind: "asInt", asInt: BigInt(value) },
        }],
      },
    },
  };
}

function stringAttribute(key: string, value: string) {
  return { key, value: { value: { oneofKind: "stringValue" as const, stringValue: value } } };
}

function exponentialHistogramWithUint64BucketCounts(): Uint8Array {
  const buckets = messageField(0x12, bytes(new Uint8Array(encodeVarint(1n)), new Uint8Array(encodeVarint(2n))));
  const dataPoint = bytes(fixed64Field(0x21, 3n), messageField(0x42, buckets));
  const exponentialHistogram = bytes(
    messageField(0x0a, dataPoint),
    varintField(0x10, BigInt(AggregationTemporality.DELTA)),
  );
  const metric = bytes(
    stringField(0x0a, "http.server.duration.exp"),
    stringField(0x1a, "ms"),
    messageField(0x52, exponentialHistogram),
  );
  const scopeMetrics = messageField(0x12, metric);
  const resourceMetrics = messageField(0x12, scopeMetrics);

  return messageField(0x0a, resourceMetrics);
}

function messageField(tag: number, payload: Uint8Array): Uint8Array {
  return bytes(new Uint8Array([tag]), new Uint8Array(encodeVarint(BigInt(payload.byteLength))), payload);
}

function stringField(tag: number, value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  return messageField(tag, encoded);
}

function varintField(tag: number, value: bigint): Uint8Array {
  return bytes(new Uint8Array([tag]), new Uint8Array(encodeVarint(value)));
}

function fixed64Field(tag: number, value: bigint): Uint8Array {
  return bytes(new Uint8Array([tag]), fixed64(value));
}

function bytes(...chunks: Uint8Array[]): Uint8Array {
  const byteLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function fixed64(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

function encodeVarint(value: bigint): number[] {
  const encoded: number[] = [];
  let current = value;
  while (current >= 0x80n) {
    encoded.push(Number((current & 0x7fn) | 0x80n));
    current >>= 7n;
  }
  encoded.push(Number(current));
  return encoded;
}

Deno.test("normalizeMetricsExport redacts sensitive attribute keys", () => {
  const result = normalizeMetricsExport({
    resourceMetrics: [{
      resource: {
        attributes: [
          stringAttribute("service.name", "checkout"),
        ],
        droppedAttributesCount: 0,
      },
      scopeMetrics: [{
        scope: { name: "manual-fixture", version: "1.0.0", attributes: [], droppedAttributesCount: 0 },
        schemaUrl: "",
        metrics: [{
          name: "queue.depth",
          description: "",
          unit: "items",
          data: {
            oneofKind: "gauge",
            gauge: {
              dataPoints: [{
                startTimeUnixNano: 0n,
                timeUnixNano: 100n,
                value: { oneofKind: "asDouble", asDouble: 7 },
                attributes: [
                  stringAttribute("http.headers.authorization", "Bearer secret-token"),
                  stringAttribute("password", "supersecret"),
                  stringAttribute("http.route", "/cart"),
                ],
              }],
            },
          },
        }],
      }],
      schemaUrl: "",
    }],
  }, 2_000);

  assertEquals(result.warnings, []);
  assertEquals(result.points.length, 1);
  assertEquals(result.points[0].rawAttributes["http.headers.authorization"], "Bearer secret-token");
  assertEquals(result.points[0].rawAttributes["password"], "supersecret");
  assertEquals(result.points[0].attributes["http.headers.authorization"], "[REDACTED]");
  assertEquals(result.points[0].attributes["password"], "[REDACTED]");
  assertEquals(result.points[0].attributes["http.route"], "/cart");
  assertEquals(result.points[0].redaction?.status, "blocked");
  assertEquals(result.points[0].redaction?.hiddenAttributeValues, 2);
  assertEquals(result.points[0].redaction?.patternsMatched, ["authorization", "password"]);
});
