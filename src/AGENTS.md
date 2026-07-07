# Source DOX

## Purpose

- Own executable Deno source for the OTEL Inspector desktop app.

## Ownership

- Backend code owns receiver, ingest state, worker runtime, and safe failure behavior.
- UI code owns dashboard rendering and browser-side refresh behavior.
- `src/main.ts` owns native webview startup and worker lifecycle only.

## Local Contracts

- Keep local imports explicit with `.ts` extensions.
- Do not import generated OTLP protobuf types into UI code.
- Keep long-running receiver work outside the synchronous webview `run()` call.

## Work Guidance

- Preserve the metrics-first MVP scope: `/v1/metrics` only, with traces/logs rejected as unsupported signals.
- Keep desktop startup permissions reflected in `deno.json`.

## Verification

- Run `deno task ok` after changing source.

## Child DOX Index

- `backend/AGENTS.md` — receiver, state, app server, and worker runtime.
- `ui/AGENTS.md` — embedded dashboard HTML, CSS, and browser refresh logic.
