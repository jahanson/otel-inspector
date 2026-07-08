import { buildDashboardProjection } from "./dashboard_projection.ts";
import { clearReceiverState, currentSummary, type ReceiverState } from "./receiver.ts";
import { buildAppShell } from "../ui/app_shell.ts";

export const APP_SERVER = {
  host: "127.0.0.1",
  port: 4319,
} as const;

const EMPTY_APP_JS = `console.info("OTEL Inspector dashboard asset placeholder");`;
const EMPTY_STYLES =
  `html,body{margin:0;min-height:100%;overflow-x:clip;background:#23272a;color:#f2f0eb;font-family:system-ui,sans-serif}`;

export function appUrl(): string {
  return `http://${APP_SERVER.host}:${APP_SERVER.port}/`;
}

export function handleAppRequest(request: Request, state: ReceiverState): Response {
  const url = new URL(request.url);

  if (url.pathname === "/api/dashboard/clear") {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    clearReceiverState(state);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (url.pathname === "/api/dashboard") {
    const summary = currentSummary(state);
    const windowMs = parseWindowMs(url.searchParams.get("windowMs"));

    return Response.json(
      buildDashboardProjection(state.store.snapshot(), summary, { windowMs }),
      { headers: { "cache-control": "no-store" } },
    );
  }

  if (url.pathname === "/assets/app.js") {
    return new Response(EMPTY_APP_JS, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (url.pathname === "/assets/styles.css") {
    return new Response(EMPTY_STYLES, {
      headers: {
        "content-type": "text/css; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (url.pathname === "/api/summary") {
    return Response.json(currentSummary(state), {
      headers: { "cache-control": "no-store" },
    });
  }

  if (url.pathname === "/") {
    const summary = currentSummary(state);
    return new Response(buildAppShell(buildDashboardProjection(state.store.snapshot(), summary)), {
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

function parseWindowMs(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 15 * 60_000) : 60_000;
}
