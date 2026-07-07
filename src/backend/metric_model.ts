import type { AnyValue, KeyValue } from "./otel/proto/opentelemetry/proto/common/v1/common.ts";

export type PrimitiveAttributeValue = string | number | boolean;

export type MetricWarning = {
  code: string;
  message: string;
};

export type MetricType =
  | "gauge"
  | "sum"
  | "histogram"
  | "exponential_histogram"
  | "summary"
  | "unknown";

export type AggregationTemporalityName = "delta" | "cumulative" | "unspecified";

export type DerivationStatus = "usable" | "unsupported" | "incomplete";

export type MetricPoint = {
  seriesKey: string;
  observedAtMs: number;
  timestampUnixNano?: string;
  startTimeUnixNano?: string;
  resource: Record<string, PrimitiveAttributeValue>;
  scope: { name?: string; version?: string };
  metric: {
    name: string;
    description?: string;
    unit?: string;
    type: MetricType;
    temporality?: AggregationTemporalityName;
    monotonic?: boolean;
  };
  attributes: Record<string, PrimitiveAttributeValue>;
  value?: number;
  count?: number;
  sum?: number;
  buckets?: Array<{ upperBound: number; count: number }>;
  derivationStatus: DerivationStatus;
  warnings: MetricWarning[];
};

export type SeriesKeyInput = {
  resource: Record<string, PrimitiveAttributeValue>;
  scope: { name?: string; version?: string };
  metricName: string;
  metricType: MetricType;
  unit?: string;
  attributes: Record<string, PrimitiveAttributeValue>;
};

export function attributesFromKeyValues(keyValues: KeyValue[]): Record<string, PrimitiveAttributeValue> {
  const attributes: Record<string, PrimitiveAttributeValue> = {};

  for (const keyValue of keyValues) {
    const primitive = primitiveFromAnyValue(keyValue.value);
    if (primitive !== undefined) {
      attributes[keyValue.key] = primitive;
    }
  }

  return attributes;
}

export function buildSeriesKey(input: SeriesKeyInput): string {
  return `series:${stableStringify({
    resource: input.resource,
    scope: input.scope,
    metricName: input.metricName,
    metricType: input.metricType,
    unit: input.unit ?? "",
    attributes: input.attributes,
  })}`;
}

export function toNumberValue(value: bigint | number): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const converted = Number(value);
  return Number.isSafeInteger(converted) ? converted : undefined;
}

function primitiveFromAnyValue(value: AnyValue | undefined): PrimitiveAttributeValue | undefined {
  if (!value) {
    return undefined;
  }

  switch (value.value.oneofKind) {
    case "stringValue":
      return value.value.stringValue;
    case "boolValue":
      return value.value.boolValue;
    case "intValue":
      return toNumberValue(value.value.intValue);
    case "doubleValue":
      return Number.isFinite(value.value.doubleValue) ? value.value.doubleValue : undefined;
    case "arrayValue":
    case "kvlistValue":
    case "bytesValue":
    case undefined:
      return undefined;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
