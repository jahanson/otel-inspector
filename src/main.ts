import { preload, SizeHint, Webview } from "@webview/webview";

if (import.meta.main) {
  await main();
}

export async function main(): Promise<void> {
  await preload();

  const worker = new Worker(new URL("./backend/receiver_worker.ts", import.meta.url).href, {
    type: "module",
    deno: { permissions: "inherit" },
  });
  const appUrl = await waitForWorkerReady(worker);
  const webview = new Webview(false, { width: 1180, height: 780, hint: SizeHint.MIN });

  webview.title = "OTEL Inspector";
  webview.navigate(appUrl);

  try {
    webview.run();
  } finally {
    worker.postMessage({ type: "shutdown" });
    worker.terminate();
  }
}

function waitForWorkerReady(worker: Worker): Promise<string> {
  return new Promise((resolve, reject) => {
    worker.addEventListener("message", (event) => {
      if (event.data?.type === "ready" && typeof event.data.appUrl === "string") {
        resolve(event.data.appUrl);
      }
    }, { once: true });
    worker.addEventListener("error", (event) => {
      reject(event.error ?? new Error(event.message));
    }, { once: true });
  });
}
