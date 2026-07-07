import { preload, SizeHint, Webview } from "@webview/webview";
import { buildReceiverState, currentSummary, startReceiver } from "./backend/receiver.ts";
import { buildAppHtml } from "./ui/app_html.ts";

if (import.meta.main) {
  await main();
}

export async function main(): Promise<void> {
  await preload();

  const state = buildReceiverState();
  const server = startReceiver(state);
  const webview = new Webview(false, { width: 1180, height: 780, hint: SizeHint.MIN });

  webview.title = "OTEL Inspector";
  webview.bind("getTelemetrySummary", () => currentSummary(state));
  webview.navigate(`data:text/html,${encodeURIComponent(buildAppHtml(currentSummary(state)))}`);

  try {
    webview.run();
  } finally {
    await server.shutdown();
  }
}
