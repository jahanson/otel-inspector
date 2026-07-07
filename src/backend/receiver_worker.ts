import { appUrl, startAppServer } from "./app_server.ts";
import { buildReceiverState, startReceiver } from "./receiver.ts";

type WorkerMessage = { type: "shutdown" };
type ReceiverWorkerGlobal = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerMessage>) => void): void;
  close(): void;
};

const workerSelf = self as unknown as ReceiverWorkerGlobal;
const state = buildReceiverState();
const receiverServer = startReceiver(state);
const appServer = startAppServer(state);

workerSelf.postMessage({ type: "ready", appUrl: appUrl() });

workerSelf.addEventListener("message", async (event) => {
  if (event.data?.type !== "shutdown") {
    return;
  }

  await Promise.all([
    receiverServer.shutdown(),
    appServer.shutdown(),
  ]);
  workerSelf.close();
});
