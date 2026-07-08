import {
  AggregationTemporality,
  type ExponentialHistogram,
  type ExponentialHistogramDataPoint,
  type Histogram,
  type Metric,
  type NumberDataPoint,
  type ScopeMetrics,
  type Summary,
  type SummaryDataPoint,
} from "./otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";
import type { ExportMetricsServiceRequestMessage } from "./otel/decode.ts";
import {
  attributesFromKeyValues,
  buildSeriesKey,
  type ExponentialHistogramBuckets,
  type ExponentialHistogramValue,
  type MetricPoint,
  type MetricType,
  type MetricWarning,
  type PrimitiveAttributeValue,
  toNumberValue,
} from "./metric_model.ts";
import { redactAttributes, redactionReport } from "./redaction.ts";

export type NormalizeMetricsResult = {
  points: MetricPoint[];
  warnings: MetricWarning[];
};

const DATA_POINT_FLAGS_NO_RECORDED_VALUE_MASK = 1;

export function normalizeMetricsExport(
  exportRequest: ExportMetricsServiceRequestMessage,
  observedAtMs: number,
): NormalizeMetricsResult {
  const points: MetricPoint[] = [];
  const warnings: MetricWarning[] = [];

  for (const resourceMetrics of exportRequest.resourceMetrics) {
    const resource = attributesFromKeyValues(resourceMetrics.resource?.attributes ?? []);

    for (const scopeMetrics of resourceMetrics.scopeMetrics) {
      for (const metric of scopeMetrics.metrics) {
        const metricPoints = normalizeMetric(metric, scopeMetrics, resource, observedAtMs);
        points.push(...metricPoints);
        for (const point of metricPoints) {
          warnings.push(...point.warnings);
        }
      }
    }
  }

  return { points, warnings };
}

function normalizeMetric(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
): MetricPoint[] {
  switch (metric.data.oneofKind) {
    case "gauge":
      return metric.data.gauge.dataPoints.map((dataPoint) =>
        numberPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint, "gauge")
      );
    case "sum": {
      const sum = metric.data.sum;
      return sum.dataPoints.map((dataPoint) =>
        numberPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint, "sum", {
          temporality: temporalityName(sum.aggregationTemporality),
          monotonic: sum.isMonotonic,
        })
      );
    }
    case "histogram":
      return histogramPoints(metric, scopeMetrics, resource, observedAtMs, metric.data.histogram);
    case "exponentialHistogram":
      return exponentialHistogramPoints(metric, scopeMetrics, resource, observedAtMs, metric.data.exponentialHistogram);
    case "summary":
      return summaryPoints(metric, scopeMetrics, resource, observedAtMs, metric.data.summary);
    case undefined:
      return [unsupportedPoint(metric, scopeMetrics, resource, observedAtMs, "unknown")];
  }
}

function numberPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  dataPoint: NumberDataPoint,
  metricType: "gauge" | "sum",
  metricOverrides: { temporality?: "delta" | "cumulative" | "unspecified"; monotonic?: boolean } = {},
): MetricPoint {
  const rawAttributes = attributesFromKeyValues(dataPoint.attributes);
  const attributes = redactAttributes(rawAttributes);
  const redaction = redactionReport(rawAttributes);
  const value = dataPoint.value.oneofKind === "asDouble"
    ? toNumberValue(dataPoint.value.asDouble)
    : dataPoint.value.oneofKind === "asInt"
    ? toNumberValue(dataPoint.value.asInt)
    : undefined;
  const warnings = value === undefined
    ? [{ code: "metric-value-missing", message: "Metric datapoint has no usable numeric value." }]
    : [];
  const status = value === undefined ? "incomplete" : "usable";

  return basePoint(metric, scopeMetrics, resource, observedAtMs, rawAttributes, attributes, metricType, {
    timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
    startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
    value,
    metricOverrides,
    derivationStatus: status,
    warnings,
    redaction,
  });
}

function histogramPoints(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  histogram: Histogram,
): MetricPoint[] {
  return histogram.dataPoints.map((dataPoint) => {
    const rawAttributes = attributesFromKeyValues(dataPoint.attributes);
    const attributes = redactAttributes(rawAttributes);
    const redaction = redactionReport(rawAttributes);
    const count = toNumberValue(dataPoint.count);
    const bucketCounts = dataPoint.bucketCounts.map((bucketCount) => toNumberValue(bucketCount));
    const usableBuckets = count !== undefined &&
      hasUsableHistogramBuckets(bucketCounts, dataPoint.explicitBounds, count);
    const warnings = usableBuckets && count !== undefined
      ? []
      : [{ code: "histogram-incomplete", message: "Histogram datapoint cannot produce safe percentile estimates." }];

    return basePoint(metric, scopeMetrics, resource, observedAtMs, rawAttributes, attributes, "histogram", {
      timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
      startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
      count,
      sum: Number.isFinite(dataPoint.sum) ? dataPoint.sum : undefined,
      buckets: usableBuckets
        ? bucketCounts.map((bucketCount, index) => ({
          upperBound: dataPoint.explicitBounds[index] ?? Number.POSITIVE_INFINITY,
          count: bucketCount!,
        }))
        : undefined,
      metricOverrides: { temporality: temporalityName(histogram.aggregationTemporality) },
      derivationStatus: usableBuckets && count !== undefined ? "usable" : "incomplete",
      warnings,
      redaction,
    });
  });
}

function exponentialHistogramPoints(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  exponentialHistogram: ExponentialHistogram,
): MetricPoint[] {
  return exponentialHistogram.dataPoints.map((dataPoint) =>
    exponentialHistogramPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint, exponentialHistogram)
  );
}

function exponentialHistogramPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  dataPoint: ExponentialHistogramDataPoint,
  exponentialHistogram: ExponentialHistogram,
): MetricPoint {
  const rawAttributes = attributesFromKeyValues(dataPoint.attributes);
  const attributes = redactAttributes(rawAttributes);
  const redaction = redactionReport(rawAttributes);

  if (hasNoRecordedValue(dataPoint.flags)) {
    return basePoint(metric, scopeMetrics, resource, observedAtMs, rawAttributes, attributes, "exponential_histogram", {
      timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
      startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
      metricOverrides: { temporality: temporalityName(exponentialHistogram.aggregationTemporality) },
      derivationStatus: "incomplete",
      warnings: [{
        code: "metric-no-recorded-value",
        message: "Exponential histogram datapoint has no recorded value.",
      }],
      redaction,
    });
  }

  const count = toNumberValue(dataPoint.count);
  const zeroCount = toNumberValue(dataPoint.zeroCount);
  const positive = normalizeExponentialBuckets(dataPoint.positive);
  const negative = normalizeExponentialBuckets(dataPoint.negative);
  const safeHistogram = buildExponentialHistogramValue(dataPoint, positive, negative, count, zeroCount);
  const incomplete = safeHistogram === undefined;
  const warning = incomplete
    ? {
      code: "exponential-histogram-incomplete",
      message: "Exponential histogram datapoint cannot be retained as safe bucket metadata.",
    }
    : {
      code: "metric-unsupported",
      message: "Exponential histogram is retained but not yet used for derivations.",
    };

  return basePoint(metric, scopeMetrics, resource, observedAtMs, rawAttributes, attributes, "exponential_histogram", {
    timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
    startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
    count,
    sum: dataPoint.sum !== undefined && Number.isFinite(dataPoint.sum) ? dataPoint.sum : undefined,
    exponentialHistogram: safeHistogram,
    metricOverrides: { temporality: temporalityName(exponentialHistogram.aggregationTemporality) },
    derivationStatus: incomplete ? "incomplete" : "unsupported",
    warnings: [warning],
    redaction,
  });
}

function hasNoRecordedValue(flags: number): boolean {
  return (flags & DATA_POINT_FLAGS_NO_RECORDED_VALUE_MASK) !== 0;
}

function normalizeExponentialBuckets(
  buckets: ExponentialHistogramDataPoint["positive"],
): ExponentialHistogramBuckets | undefined {
  if (!buckets) {
    return undefined;
  }

  const counts = buckets.bucketCounts.map((bucketCount) => toNumberValue(bucketCount));
  if (counts.some((count) => count === undefined || count < 0)) {
    return undefined;
  }

  return { offset: buckets.offset, counts: counts as number[] };
}

function buildExponentialHistogramValue(
  dataPoint: ExponentialHistogramDataPoint,
  positive: ExponentialHistogramBuckets | undefined,
  negative: ExponentialHistogramBuckets | undefined,
  count: number | undefined,
  zeroCount: number | undefined,
): ExponentialHistogramValue | undefined {
  if (count === undefined || zeroCount === undefined || zeroCount < 0) {
    return undefined;
  }

  if ((dataPoint.positive && positive === undefined) || (dataPoint.negative && negative === undefined)) {
    return undefined;
  }

  const bucketTotal = bucketCountTotal(positive) + bucketCountTotal(negative) + zeroCount;
  if (bucketTotal !== count) {
    return undefined;
  }

  return {
    scale: dataPoint.scale,
    zeroCount,
    zeroThreshold: Number.isFinite(dataPoint.zeroThreshold) ? dataPoint.zeroThreshold : undefined,
    positive,
    negative,
    min: dataPoint.min !== undefined && Number.isFinite(dataPoint.min) ? dataPoint.min : undefined,
    max: dataPoint.max !== undefined && Number.isFinite(dataPoint.max) ? dataPoint.max : undefined,
  };
}

function bucketCountTotal(buckets: ExponentialHistogramBuckets | undefined): number {
  if (!buckets) {
    return 0;
  }

  return buckets.counts.reduce((sum, count) => sum + count, 0);
}

function hasUsableHistogramBuckets(
  bucketCounts: Array<number | undefined>,
  explicitBounds: number[],
  count: number,
): boolean {
  if (bucketCounts.length !== explicitBounds.length + 1) {
    return false;
  }

  if (bucketCounts.some((bucketCount) => bucketCount === undefined || bucketCount < 0)) {
    return false;
  }

  if (!explicitBounds.every(Number.isFinite)) {
    return false;
  }

  for (let index = 1; index < explicitBounds.length; index += 1) {
    if (explicitBounds[index] <= explicitBounds[index - 1]) {
      return false;
    }
  }

  let bucketTotal = 0;
  for (const bucketCount of bucketCounts) {
    bucketTotal += bucketCount!;
  }
  return bucketTotal === count;
}

function summaryPoints(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  summary: Summary,
): MetricPoint[] {
  if (summary.dataPoints.length === 0) {
    return [unsupportedPoint(metric, scopeMetrics, resource, observedAtMs, "summary")];
  }

  return summary.dataPoints.map((dataPoint) =>
    unsupportedSummaryPoint(metric, scopeMetrics, resource, observedAtMs, dataPoint)
  );
}

function unsupportedPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  metricType: MetricType,
): MetricPoint {
  const warning = {
    code: "metric-unsupported",
    message: "Metric type is retained but not yet used for derivations.",
  };
  const rawAttributes: Record<string, PrimitiveAttributeValue> = {};
  const attributes = redactAttributes(rawAttributes);
  const redaction = redactionReport(rawAttributes);
  return basePoint(metric, scopeMetrics, resource, observedAtMs, rawAttributes, attributes, metricType, {
    derivationStatus: "unsupported",
    warnings: [warning],
    redaction,
  });
}

function unsupportedSummaryPoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  dataPoint: SummaryDataPoint,
): MetricPoint {
  const warning = {
    code: "metric-unsupported",
    message: "Metric type is retained but not yet used for derivations.",
  };
  const rawAttributes = attributesFromKeyValues(dataPoint.attributes);
  const attributes = redactAttributes(rawAttributes);
  const redaction = redactionReport(rawAttributes);

  return basePoint(
    metric,
    scopeMetrics,
    resource,
    observedAtMs,
    rawAttributes,
    attributes,
    "summary",
    {
      timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
      startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
      count: toNumberValue(dataPoint.count),
      sum: Number.isFinite(dataPoint.sum) ? dataPoint.sum : undefined,
      derivationStatus: "unsupported",
      warnings: [warning],
      redaction,
    },
  );
}

function basePoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  rawAttributes: Record<string, PrimitiveAttributeValue>,
  attributes: Record<string, PrimitiveAttributeValue>,
  metricType: MetricType,
  options: {
    timestampUnixNano?: string;
    startTimeUnixNano?: string;
    value?: number;
    count?: number;
    sum?: number;
    buckets?: Array<{ upperBound: number; count: number }>;
    exponentialHistogram?: ExponentialHistogramValue;
    metricOverrides?: { temporality?: "delta" | "cumulative" | "unspecified"; monotonic?: boolean };
    derivationStatus: "usable" | "unsupported" | "incomplete";
    warnings: MetricWarning[];
    redaction?: import("./redaction.ts").RedactionReport;
  },
): MetricPoint {
  const scope = {
    name: scopeMetrics.scope?.name || undefined,
    version: scopeMetrics.scope?.version || undefined,
  };
  const unit = metric.unit || undefined;
  const pointMetric = {
    name: metric.name,
    description: metric.description || undefined,
    unit,
    type: metricType,
    ...options.metricOverrides,
  };

  return {
    seriesKey: buildSeriesKey({
      resource,
      scope,
      metricName: metric.name,
      metricType,
      unit,
      rawAttributes,
    }),
    observedAtMs,
    timestampUnixNano: options.timestampUnixNano,
    startTimeUnixNano: options.startTimeUnixNano,
    resource,
    scope,
    metric: pointMetric,
    rawAttributes,
    attributes,
    value: options.value,
    count: options.count,
    sum: options.sum,
    buckets: options.buckets,
    exponentialHistogram: options.exponentialHistogram,
    derivationStatus: options.derivationStatus,
    warnings: options.warnings,
    redaction: options.redaction,
  };
}

function temporalityName(temporality: AggregationTemporality): "delta" | "cumulative" | "unspecified" {
  switch (temporality) {
    case AggregationTemporality.DELTA:
      return "delta";
    case AggregationTemporality.CUMULATIVE:
      return "cumulative";
    case AggregationTemporality.UNSPECIFIED:
      return "unspecified";
  }
}
