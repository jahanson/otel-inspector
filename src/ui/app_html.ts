import { LiveTelemetrySummary } from "../backend/contracts.ts";

export function buildAppHtml(initialSummary: LiveTelemetrySummary): string {
  const summaryJson = JSON.stringify(initialSummary).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OTEL Inspector</title>
    <style>
      :root {
        color-scheme: light;
        --paper: #f7f4ec;
        --ink: #1d211f;
        --muted: #69716d;
        --line: #d8d2c4;
        --panel: #fffdfa;
        --good: #147a5c;
        --warn: #b4432c;
        --accent: #245f73;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        overflow: hidden;
        background:
          linear-gradient(90deg, rgba(29, 33, 31, 0.045) 1px, transparent 1px) 0 0 / 28px 28px,
          linear-gradient(180deg, rgba(29, 33, 31, 0.035) 1px, transparent 1px) 0 0 / 28px 28px,
          var(--paper);
        color: var(--ink);
        font-family: "Aptos", "Segoe UI", sans-serif;
      }

      main {
        width: min(1160px, calc(100vw - 32px));
        height: 100vh;
        margin: 0 auto;
        padding: 18px 0;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 14px;
        min-height: 0;
      }

      header {
        display: grid;
        grid-template-columns: minmax(240px, 0.7fr) minmax(280px, 1fr);
        gap: 16px;
        align-items: end;
        border-bottom: 2px solid var(--ink);
        padding-bottom: 14px;
        min-width: 0;
      }

      h1 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(32px, 5vw, 58px);
        font-weight: 700;
        line-height: 0.92;
        letter-spacing: 0;
      }

      .endpoint {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        border: 1px solid var(--ink);
        padding: 7px 10px;
        background: var(--panel);
        font-family: "Cascadia Mono", Consolas, monospace;
        font-size: 13px;
        white-space: normal;
        word-break: break-word;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        grid-auto-rows: minmax(88px, auto);
        gap: 12px;
        min-height: 0;
        overflow: hidden;
      }

      section {
        min-width: 0;
        min-height: 0;
        border: 1px solid var(--line);
        background: rgba(255, 253, 250, 0.9);
        padding: 14px;
      }

      .metric-card {
        grid-column: span 3;
      }

      .tabs-card {
        grid-column: span 12;
        min-height: 52px;
      }

      .panel-card {
        grid-column: span 6;
        min-height: 190px;
      }

      .label {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .value {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 1;
      }

      .status {
        color: var(--good);
      }

      .warning {
        color: var(--warn);
      }

      .tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .tab {
        border: 1px solid var(--ink);
        padding: 8px 10px;
        background: var(--panel);
        font-size: 13px;
      }

      .tab.active {
        background: var(--ink);
        color: var(--panel);
      }

      .empty {
        height: 128px;
        display: grid;
        place-items: center;
        border: 1px dashed var(--line);
        color: var(--muted);
        font-family: "Cascadia Mono", Consolas, monospace;
      }

      @media (max-width: 880px) {
        header {
          grid-template-columns: 1fr;
        }

        .grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          overflow: auto;
        }

        .metric-card,
        .tabs-card,
        .panel-card {
          grid-column: span 1;
        }

        .tabs-card,
        .panel-card {
          grid-column: span 2;
        }
      }

      @media (max-width: 560px) {
        body {
          overflow: auto;
        }

        main {
          height: auto;
        }

        .grid {
          grid-template-columns: 1fr;
          overflow: visible;
        }

        .metric-card,
        .tabs-card,
        .panel-card {
          grid-column: span 1;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>OTEL Inspector</h1>
        <div class="endpoint" id="endpoint"></div>
      </header>

      <div class="grid">
        <section class="metric-card">
          <p class="label">Receiver</p>
          <p class="value status" id="receiver-state">Live</p>
        </section>
        <section class="metric-card">
          <p class="label">exports/sec</p>
          <p class="value" id="exports-rate">0</p>
        </section>
        <section class="metric-card">
          <p class="label">bytes/sec</p>
          <p class="value" id="bytes-rate">0</p>
        </section>
        <section class="metric-card">
          <p class="label">Dropped</p>
          <p class="value" id="dropped">0</p>
        </section>

        <section class="tabs-card">
          <div class="tabs" aria-label="Dashboard views">
            <div class="tab active">Overview</div>
            <div class="tab">Metrics Explorer</div>
            <div class="tab">Payload Inspector</div>
          </div>
        </section>

        <section class="panel-card">
          <p class="label">Ingest Health</p>
          <div class="empty" id="warning-state">awaiting protobuf exports</div>
        </section>
        <section class="panel-card">
          <p class="label">Payload Inspector</p>
          <div class="empty">decoded payload tree pending OI-004</div>
        </section>
      </div>
    </main>

    <script>
      const initialSummary = ${summaryJson};

      function paint(summary) {
        document.getElementById("endpoint").textContent = summary.receiver.endpoint;
        document.getElementById("receiver-state").textContent = summary.receiver.paused ? "Paused" : "Live";
        document.getElementById("exports-rate").textContent = String(summary.ingest.exportsPerSec);
        document.getElementById("bytes-rate").textContent = String(summary.ingest.bytesPerSec);
        document.getElementById("dropped").textContent = String(summary.ingest.dropped);
        const warning = summary.warnings[0];
        const warningState = document.getElementById("warning-state");
        warningState.textContent = warning ? warning.code : "awaiting protobuf exports";
        warningState.className = warning ? "empty warning" : "empty";
      }

      async function refresh() {
        if (typeof globalThis.getTelemetrySummary === "function") {
          paint(await globalThis.getTelemetrySummary());
        }
      }

      paint(initialSummary);
      setInterval(refresh, 1000);
    </script>
  </body>
</html>`;
}
