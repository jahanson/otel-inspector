import type { MetricPoint, MetricWarning } from "./metric_model.ts";

export type TelemetryStoreOptions = {
  maxPoints: number;
  maxExports: number;
};

export type IngestExportMetadata = {
  observedAtMs: number;
  bytesReceived: number;
  pointCount: number;
  warningCount: number;
};

export type TelemetryStoreSnapshot = {
  totalExports: number;
  totalBytes: number;
  totalPoints: number;
  droppedPoints: number;
  recentPoints: MetricPoint[];
  exports: IngestExportMetadata[];
  warnings: MetricWarning[];
};

export type SeriesSummary = {
  seriesKey: string;
  metricName: string;
  metricType: string;
  unit?: string;
  resource: MetricPoint["resource"];
  attributes: MetricPoint["attributes"];
  lastObservedAtMs: number;
};

type ExportRecord = IngestExportMetadata;

export class TelemetryStore {
  readonly options: TelemetryStoreOptions;
  #points: MetricPoint[] = [];
  #exports: ExportRecord[] = [];
  #warnings: MetricWarning[] = [];
  #totalExports = 0;
  #totalBytes = 0;
  #totalPoints = 0;
  #droppedPoints = 0;

  constructor(options: TelemetryStoreOptions) {
    this.options = options;
  }

  recordExport(input: {
    observedAtMs: number;
    bytesReceived: number;
    points: MetricPoint[];
    warnings: MetricWarning[];
  }): void {
    this.#totalExports += 1;
    this.#totalBytes += input.bytesReceived;
    this.#totalPoints += input.points.length;
    this.#points.push(...input.points);
    this.#exports.push({
      observedAtMs: input.observedAtMs,
      bytesReceived: input.bytesReceived,
      pointCount: input.points.length,
      warningCount: input.warnings.length,
    });
    this.#warnings.push(...input.warnings);
    this.#trim();
  }

  snapshot(): TelemetryStoreSnapshot {
    return {
      totalExports: this.#totalExports,
      totalBytes: this.#totalBytes,
      totalPoints: this.#totalPoints,
      droppedPoints: this.#droppedPoints,
      recentPoints: [...this.#points],
      exports: [...this.#exports],
      warnings: [...this.#warnings],
    };
  }

  seriesList(): SeriesSummary[] {
    const bySeries = new Map<string, SeriesSummary>();

    for (const point of this.#points) {
      bySeries.set(point.seriesKey, {
        seriesKey: point.seriesKey,
        metricName: point.metric.name,
        metricType: point.metric.type,
        unit: point.metric.unit,
        resource: point.resource,
        attributes: point.attributes,
        lastObservedAtMs: point.observedAtMs,
      });
    }

    return [...bySeries.values()].sort((left, right) =>
      left.metricName.localeCompare(right.metricName) ||
      left.seriesKey.localeCompare(right.seriesKey)
    );
  }

  pointsForSeries(
    seriesKey: string,
    fromObservedAtMs = Number.NEGATIVE_INFINITY,
    toObservedAtMs = Number.POSITIVE_INFINITY,
  ): MetricPoint[] {
    return this.#points.filter((point) =>
      point.seriesKey === seriesKey &&
      point.observedAtMs >= fromObservedAtMs &&
      point.observedAtMs <= toObservedAtMs
    );
  }

  #trim(): void {
    if (this.#points.length > this.options.maxPoints) {
      const dropCount = this.#points.length - this.options.maxPoints;
      this.#points.splice(0, dropCount);
      this.#droppedPoints += dropCount;
    }

    if (this.#exports.length > this.options.maxExports) {
      this.#exports.splice(0, this.#exports.length - this.options.maxExports);
    }

    if (this.#warnings.length > this.options.maxExports) {
      this.#warnings.splice(0, this.#warnings.length - this.options.maxExports);
    }
  }
}

export function createTelemetryStore(options: Partial<TelemetryStoreOptions> = {}): TelemetryStore {
  return new TelemetryStore({
    maxPoints: options.maxPoints ?? 10_000,
    maxExports: options.maxExports ?? 500,
  });
}
