import React, { useMemo, useState } from "react";
import type { ExplorerRow } from "../types.ts";

type MetricsExplorerProps = {
  rows: ExplorerRow[];
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
  useGrouping: true,
});

const seenFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function MetricsExplorer({ rows }: MetricsExplorerProps) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => filterExplorerRows(query, rows), [query, rows]);

  return (
    <section className="explorer" aria-label="Metrics Explorer">
      <label className="explorer__filter">
        <span>Filter metrics</span>
        <input
          aria-label="Filter metrics"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="service, metric, attribute"
          value={query}
        />
      </label>

      <div className="explorer__table-wrap">
        <table className="explorer__table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Latest</th>
              <th>Service</th>
              <th>Status</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.seriesKey}>
                <td data-label="Metric">{row.metricName}</td>
                <td data-label="Type">{row.metricType}</td>
                <td data-label="Unit">{row.unit ?? "—"}</td>
                <td data-label="Latest">{row.latest === undefined ? "—" : formatNumber(row.latest)}</td>
                <td data-label="Service">{row.resourceService ?? "—"}</td>
                <td data-label="Status">{row.status}</td>
                <td data-label="Last seen">{seenFormatter.format(row.lastObservedAtMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0
        ? <p className="empty-state explorer__empty">No metrics match the current filter.</p>
        : null}
    </section>
  );
}

export function filterExplorerRows(query: string, rows: ExplorerRow[]): ExplorerRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return rows;
  }

  return rows.filter((row) =>
    row.metricName.toLowerCase().includes(needle) ||
    row.metricType.toLowerCase().includes(needle) ||
    (row.resourceService ?? "").toLowerCase().includes(needle) ||
    JSON.stringify(row.attributes).toLowerCase().includes(needle)
  );
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
