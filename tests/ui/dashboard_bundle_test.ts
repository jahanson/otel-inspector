import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";

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
