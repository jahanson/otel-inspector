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
- `app_server.ts` serves the dashboard shell, built dashboard assets from `src/ui/dist`, summary API, dashboard projection API, and local clear action on the dashboard port.
- `receiver_worker.ts` keeps Deno HTTP servers off the synchronous native webview thread.

## Local Contracts

- Receiver listens on `127.0.0.1:4318` and accepts only `POST /v1/metrics` with `application/x-protobuf`.
- Dashboard app server listens on `127.0.0.1:4319`.
- Dashboard routes expose `GET /api/summary`, `GET /api/dashboard`, `POST /api/dashboard/clear`, `GET /assets/app.js`, and `GET /assets/styles.css`.
- Asset routes return `503` with a build hint when `src/ui/dist` assets are unavailable.
- Payload size limit is `4 MiB`; enforce it before buffering beyond the cap.
- Empty metrics protobuf bodies are decode failures, not successful empty exports.
- Decode failures are failures, not successful exports.
- Normalization failures are safe `normalize-failed` receiver failures.
- Histogram buckets are derivation-usable only when bucket counts are numeric, explicit bounds are finite and strictly increasing, and bucket totals match the datapoint count.
- Exponential histogram datapoints keep typed `MetricPoint.exponentialHistogram` metadata only when positive bucket totals, negative bucket totals, and `zeroCount` are numeric and sum to the datapoint `count`; otherwise retain the metric as `exponential_histogram` with `derivationStatus: "incomplete"` and no exponential bucket metadata.
- Exponential histogram datapoints with the OTLP no-recorded-value flag keep attributes and timestamps only; ignore count, sum, and bucket metadata and retain the point as `derivationStatus: "incomplete"`.
- HTTP request-rate derivations use retained-window delta sums only when they are monotonic, non-negative request counters.
- HTTP latency p95 derivations return values only for known millisecond or second units and finite percentile buckets; open-ended `+Inf` percentile buckets stay unavailable.
- Successful exports count only after protobuf decode and substrate normalization/storage both succeed.
- Safe failures must not echo request bodies, raw attributes, credentials, or raw decoder errors.
- Clearing dashboard state resets retained telemetry and receiver failure counters without stopping the receiver process.

## Work Guidance

- Add tests before changing receiver behavior.
- Keep worker messages minimal and typed locally.

## Verification

- Run focused substrate tests for `tests/backend/metric_model_test.ts`, `tests/backend/normalize_metrics_test.ts`, `tests/backend/telemetry_store_test.ts`, `tests/backend/metric_derivations_test.ts`, `tests/backend/live_bus_substrate_test.ts`, and `tests/backend/live_bus_cadence_test.ts`.
- Run `deno test tests/backend/app_server_dashboard_test.ts tests/backend/app_server_test.ts tests/ui/app_html_test.ts` for dashboard JSON/static routes and shell contract changes.
- Run `deno test tests/backend/receiver_contract_test.ts` for receiver changes.
- Run `deno task ok` before closeout.

## Child DOX Index

- `otel/AGENTS.md` — backend-only OTLP decode wrappers and generated protobuf bindings.
