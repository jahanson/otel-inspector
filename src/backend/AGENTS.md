# Backend DOX

## Purpose

- Own localhost receiver contracts, safe failure handling, live telemetry summaries, dashboard app server, and worker-owned runtime servers.

## Ownership

- `contracts.ts` defines receiver/public telemetry types.
- `receiver.ts` owns OTLP HTTP request validation and safe failure responses.
- `live_bus.ts` owns in-memory summary state for the first walking skeleton.
- `app_server.ts` serves the dashboard shell and summary API on the dashboard port.
- `receiver_worker.ts` keeps Deno HTTP servers off the synchronous native webview thread.

## Local Contracts

- Receiver listens on `127.0.0.1:4318` and accepts only `POST /v1/metrics` with `application/x-protobuf`.
- Dashboard app server listens on `127.0.0.1:4319`.
- Payload size limit is `4 MiB`; enforce it before buffering beyond the cap.
- Decode failures are failures, not successful exports.
- Safe failures must not echo request bodies, raw attributes, credentials, or raw decoder errors.

## Work Guidance

- Add tests before changing receiver behavior.
- Count successful exports only after protobuf decode succeeds.
- Keep worker messages minimal and typed locally.

## Verification

- Run `deno task receiver:test` for receiver changes.
- Run `deno task ok` before closeout.

## Child DOX Index

- `otel/AGENTS.md` — backend-only OTLP decode wrappers and generated protobuf bindings.
