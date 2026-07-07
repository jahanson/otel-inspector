import { currentSummary, ReceiverState } from "./receiver.ts";
import { buildAppHtml } from "../ui/app_html.ts";

export const APP_SERVER = {
  host: "127.0.0.1",
  port: 4319,
} as const;

export function appUrl(): string {
  return `http://${APP_SERVER.host}:${APP_SERVER.port}/`;
}

export function handleAppRequest(request: Request, state: ReceiverState): Response {
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (url.pathname === "/api/summary") {
    return Response.json(currentSummary(state), {
      headers: { "cache-control": "no-store" },
    });
  }

  if (url.pathname === "/") {
    return new Response(buildAppHtml(currentSummary(state)), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return new Response("Not found", { status: 404 });
}

export function startAppServer(state: ReceiverState): Deno.HttpServer<Deno.NetAddr> {
  return Deno.serve(
    {
      hostname: APP_SERVER.host,
      port: APP_SERVER.port,
      onListen({ hostname, port }) {
        console.log(`OTEL Inspector dashboard listening at http://${hostname}:${port}/`);
      },
    },
    (request) => handleAppRequest(request, state),
  );
}
