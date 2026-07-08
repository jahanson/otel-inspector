import { assert, assertEquals, assertFalse, assertStringIncludes } from "@std/assert";

Deno.test("dashboard bundle no longer inlines stylesheet text", async () => {
  const bundle = await Deno.readTextFile(new URL("../../src/ui/dist/app.js", import.meta.url));

  assertFalse(bundle.includes("style.textContent ="));
  assertFalse(bundle.includes("document.head.append(style)"));
  assertFalse(bundle.includes("styles_default ="));
});

Deno.test("chart container source assigns the local accent token", async () => {
  const originalProcess = globalThis.process;
  try {
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      value: { env: { NODE_ENV: "test" } },
      writable: true,
    });

    const { ChartContainer } = await import("../../src/ui/dashboard/components/ui/chart.tsx");
    const element = ChartContainer({
      config: { throughput: { label: "Throughput", color: "var(--chart-throughput)" } },
      children: null,
    });

    assertEquals(element.props.style["--chart-accent"], "var(--chart-throughput)");
    assertFalse("--chart-accent-transparent" in element.props.style);
  } finally {
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      value: originalProcess,
      writable: true,
    });
  }
});

Deno.test("dashboard chart styles derive transparency from the local accent", () => {
  const styles = Deno.readTextFileSync(new URL("../../src/ui/dashboard/styles.css", import.meta.url));

  assertStringIncludes(styles, "--chart-accent-transparent: color-mix(in srgb, var(--chart-accent) 0%, transparent);");
  assertFalse(styles.includes("--chart-accent-transparent: rgb(123 147 255 / 0%);"));
});

Deno.test("overview dashboard defines the LiveCharts component contract", () => {
  const liveChartsUrl = new URL("../../src/ui/dashboard/charts/LiveCharts.tsx", import.meta.url);

  let exists = true;
  try {
    Deno.statSync(liveChartsUrl);
  } catch {
    exists = false;
  }

  assert(exists, "Expected LiveCharts.tsx to exist.");

  const source = Deno.readTextFileSync(liveChartsUrl);

  assertStringIncludes(source, "export function LiveCharts");
  assertStringIncludes(source, 'aria-label="Live charts"');
  assertStringIncludes(source, 'charts: DashboardProjection["charts"]');
});

Deno.test("overview tab renders LiveCharts after OverviewCards", () => {
  const source = Deno.readTextFileSync(new URL("../../src/ui/dashboard/App.tsx", import.meta.url));

  assertStringIncludes(source, 'import { LiveCharts } from "./charts/LiveCharts.tsx";');
  const overviewBranchStart = source.indexOf('activeTab === "overview"');
  const overviewCardsIndex = source.indexOf("<OverviewCards cards={projection.cards} />", overviewBranchStart);
  const liveChartsIndex = source.indexOf("<LiveCharts charts={projection.charts} />", overviewBranchStart);

  assert(overviewBranchStart !== -1, "Expected the overview branch to exist.");
  assert(overviewCardsIndex !== -1, "Expected OverviewCards in the overview branch.");
  assert(liveChartsIndex !== -1, "Expected LiveCharts in the overview branch.");
  assert(overviewCardsIndex < liveChartsIndex, "Expected LiveCharts to render after OverviewCards.");
});

Deno.test("metrics tab renders MetricsExplorer from explorer rows and keeps fallback text", () => {
  const source = Deno.readTextFileSync(new URL("../../src/ui/dashboard/App.tsx", import.meta.url));

  assertStringIncludes(source, 'import { MetricsExplorer } from "./components/MetricsExplorer.tsx";');
  assertStringIncludes(source, "projection.explorer.rows");
  assertStringIncludes(source, 'activeTab === "metrics"');
  assertStringIncludes(source, "<MetricsExplorer rows={projection.explorer.rows} />");
  assertStringIncludes(source, "This dashboard tab is not implemented yet.");
});
