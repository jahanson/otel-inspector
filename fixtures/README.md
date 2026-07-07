# OTEL Inspector Fixtures

Fixture files under `fixtures/otlp/` are local dogfood inputs for receiver,
decode, normalization, redaction, and chart tests.

Current receiver fixtures:

- `malformed-protobuf.bin` drives the safe `decode-failed` receiver path.
- `valid-minimal-metrics.bin` is a deterministic `ExportMetricsServiceRequest`
  with one empty `ResourceMetrics` entry and drives the successful decode path.

Generated OTLP bindings must stay backend-only:

```text
src/backend/otel/proto/
src/backend/otel/decode.ts
src/backend/otel/normalize.ts
```

UI modules must consume normalized backend contracts only and must not import
protobuf-generated types directly.
