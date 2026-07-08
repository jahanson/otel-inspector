import React, { useEffect, useMemo, useState } from "react";
import type { DashboardCard, ExplorerRow } from "../types.ts";

type MetricsExplorerProps = {
  rows: ExplorerRow[];
  target?: DashboardCard["detailTarget"];
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

export function MetricsExplorer({ rows, target }: MetricsExplorerProps) {
  const [query, setQuery] = useState("");
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | undefined>(rows[0]?.seriesKey);
  const filteredRows = useMemo(() => filterExplorerRows(query, rows), [query, rows]);
  const selectedRow = filteredRows.find((row) => row.seriesKey === selectedSeriesKey) ?? filteredRows[0];

  useEffect(() => {
    if (!target) {
      return;
    }

    const targetRow = rows.find((row) =>
      (target.seriesKey && row.seriesKey === target.seriesKey) ||
      (target.metricName && row.metricName === target.metricName)
    );
    setQuery(target.seriesKey ?? target.metricName ?? "");
    setSelectedSeriesKey(targetRow?.seriesKey);
  }, [rows, target]);

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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Type</th>
              <th scope="col">Unit</th>
              <th scope="col">Latest</th>
              <th scope="col">Rate</th>
              <th scope="col">Service</th>
              <th scope="col">Cardinality</th>
              <th scope="col">Status</th>
              <th scope="col">Last seen</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.seriesKey}>
                <td>{row.metricName}</td>
                <td>{row.metricType}</td>
                <td>{row.unit ?? "—"}</td>
                <td>{row.latest === undefined ? "—" : formatNumber(row.latest)}</td>
                <td>{row.rate === undefined ? "—" : formatNumber(row.rate)}</td>
                <td>{row.resourceService ?? "—"}</td>
                <td>{row.cardinality}</td>
                <td>{row.status}</td>
                <td>{seenFormatter.format(row.lastObservedAtMs)}</td>
                <td>
                  <button className="table-action" onClick={() => setSelectedSeriesKey(row.seriesKey)} type="button">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow
        ? (
          <aside className="explorer__detail" aria-label="Metric detail">
            <div>
              <p className="explorer__detail-kicker">Metric detail</p>
              <h2>{selectedRow.metricName}</h2>
            </div>
            <dl>
              <div>
                <dt>Series</dt>
                <dd>{selectedRow.seriesKey}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{selectedRow.resourceService ?? "—"}</dd>
              </div>
              <div>
                <dt>Rate / delta</dt>
                <dd>{selectedRow.rate === undefined ? "—" : formatNumber(selectedRow.rate)}</dd>
              </div>
              <div>
                <dt>Cardinality</dt>
                <dd>{rowCardinalityLabel(selectedRow)}</dd>
              </div>
              <div>
                <dt>Attributes</dt>
                <dd>{formatAttributes(selectedRow.attributes)}</dd>
              </div>
            </dl>
          </aside>
        )
        : null}

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

function rowCardinalityLabel(row: ExplorerRow): string {
  return `${row.cardinality}`;
}

function formatAttributes(attributes: ExplorerRow["attributes"]): string {
  const entries = Object.entries(attributes);
  if (entries.length === 0) {
    return "—";
  }

  return entries.map(([key, value]) => `${key}=${String(value)}`).join(", ");
}
