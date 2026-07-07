# Backend DOX

## Purpose

- Own localhost receiver contracts, safe failure handling, live telemetry summaries, dashboard app server, and worker-owned runtime servers.

## Ownership

- `contracts.ts` defines receiver/public telemetry types.
- `metric_model.ts` owns normalized metric point contracts and stable series keys.
- `normalize_metrics.ts` owns decoded OTLP metrics to normalized point conversion.
- `telemetry_store.ts` owns bounded in-memory point/export retention and eviction accounting.
- `metric_derivations.ts` owns dashboard-ready summary derivations from retained points.
- `receiver.ts` owns OTLP HTTP request validation and safe failure responses.
- `live_bus.ts` owns receiver state, substrate ingestion, and live summary cadence.
- `app_server.ts` serves the dashboard shell and summary API on the dashboard port.
- `receiver_worker.ts` keeps Deno HTTP servers off the synchronous native webview thread.

## Local Contracts

- Receiver listens on `127.0.0.1:4318` and accepts only `POST /v1/metrics` with `application/x-protobuf`.
- Dashboard app server listens on `127.0.0.1:4319`.
- Payload size limit is `4 MiB`; enforce it before buffering beyond the cap.
- Empty metrics protobuf bodies are decode failures, not successful empty exports.
- Decode failures are failures, not successful exports.
- Normalization failures are safe `normalize-failed` receiver failures.
- Successful exports count only after protobuf decode and substrate normalization/storage both succeed.
- Safe failures must not echo request bodies, raw attributes, credentials, or raw decoder errors.

## Work Guidance

- Add tests before changing receiver behavior.
- Keep worker messages minimal and typed locally.

## Verification

- Run focused substrate tests for `tests/backend/metric_model_test.ts`, `tests/backend/normalize_metrics_test.ts`, `tests/backend/telemetry_store_test.ts`, `tests/backend/metric_derivations_test.ts`, `tests/backend/live_bus_substrate_test.ts`, and `tests/backend/live_bus_cadence_test.ts`.
- Run `deno test tests/backend/receiver_test.ts` for receiver changes.
- Run `deno task ok` before closeout.

## Child DOX Index

- `otel/AGENTS.md` — backend-only OTLP decode wrappers and generated protobuf bindings.
