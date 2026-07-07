# OTEL Inspector Fixtures

Fixture files under `fixtures/otlp/` are local dogfood inputs for receiver,
decode, normalization, redaction, and chart tests.

The first slice only includes `malformed-protobuf.bin`, which drives the safe
`decode-failed` receiver path until OTLP TypeScript bindings land in `OI-004`.

Future generated OTLP bindings must stay backend-only:

```text
src/backend/otel/proto/
src/backend/otel/decode.ts
src/backend/otel/normalize.ts
```

UI modules must consume normalized backend contracts only and must not import
protobuf-generated types directly.
