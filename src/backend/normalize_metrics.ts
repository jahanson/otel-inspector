import {
  AggregationTemporality,
  type Histogram,
  type Metric,
  type NumberDataPoint,
  type ScopeMetrics,
} from "./otel/proto/opentelemetry/proto/metrics/v1/metrics.ts";
import type { ExportMetricsServiceRequestMessage } from "./otel/decode.ts";
import {
  attributesFromKeyValues,
  buildSeriesKey,
  type MetricPoint,
  type MetricType,
  type MetricWarning,
  type PrimitiveAttributeValue,
  toNumberValue,
} from "./metric_model.ts";

export type NormalizeMetricsResult = {
  points: MetricPoint[];
  warnings: MetricWarning[];
};

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
    case "summary":
      return [unsupportedPoint(metric, scopeMetrics, resource, observedAtMs, "summary")];
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
  const attributes = attributesFromKeyValues(dataPoint.attributes);
  const value = dataPoint.value.oneofKind === "asDouble"
    ? toNumberValue(dataPoint.value.asDouble)
    : dataPoint.value.oneofKind === "asInt"
    ? toNumberValue(dataPoint.value.asInt)
    : undefined;
  const warnings = value === undefined
    ? [{ code: "metric-value-missing", message: "Metric datapoint has no usable numeric value." }]
    : [];
  const status = value === undefined ? "incomplete" : "usable";

  return basePoint(metric, scopeMetrics, resource, observedAtMs, attributes, metricType, {
    timestampUnixNano: dataPoint.timeUnixNano === 0n ? undefined : dataPoint.timeUnixNano.toString(),
    startTimeUnixNano: dataPoint.startTimeUnixNano === 0n ? undefined : dataPoint.startTimeUnixNano.toString(),
    value,
    metricOverrides,
    derivationStatus: status,
    warnings,
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
    const attributes = attributesFromKeyValues(dataPoint.attributes);
    const count = toNumberValue(dataPoint.count);
    const bucketCounts = dataPoint.bucketCounts.map((bucketCount) => toNumberValue(bucketCount));
    const usableBuckets = bucketCounts.every((bucketCount) => bucketCount !== undefined) &&
      dataPoint.bucketCounts.length === dataPoint.explicitBounds.length + 1;
    const warnings = usableBuckets && count !== undefined
      ? []
      : [{ code: "histogram-incomplete", message: "Histogram datapoint cannot produce safe percentile estimates." }];

    return basePoint(metric, scopeMetrics, resource, observedAtMs, attributes, "histogram", {
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
    });
  });
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
  return basePoint(metric, scopeMetrics, resource, observedAtMs, {}, metricType, {
    derivationStatus: "unsupported",
    warnings: [warning],
  });
}

function basePoint(
  metric: Metric,
  scopeMetrics: ScopeMetrics,
  resource: Record<string, PrimitiveAttributeValue>,
  observedAtMs: number,
  attributes: Record<string, PrimitiveAttributeValue>,
  metricType: MetricType,
  options: {
    timestampUnixNano?: string;
    startTimeUnixNano?: string;
    value?: number;
    count?: number;
    sum?: number;
    buckets?: Array<{ upperBound: number; count: number }>;
    metricOverrides?: { temporality?: "delta" | "cumulative" | "unspecified"; monotonic?: boolean };
    derivationStatus: "usable" | "unsupported" | "incomplete";
    warnings: MetricWarning[];
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
      attributes,
    }),
    observedAtMs,
    timestampUnixNano: options.timestampUnixNano,
    startTimeUnixNano: options.startTimeUnixNano,
    resource,
    scope,
    metric: pointMetric,
    attributes,
    value: options.value,
    count: options.count,
    sum: options.sum,
    buckets: options.buckets,
    derivationStatus: options.derivationStatus,
    warnings: options.warnings,
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
