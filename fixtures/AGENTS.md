# Fixture DOX

## Purpose

- Own local fixture assets used to exercise OTLP receiver, decode, normalization, redaction, and dashboard behavior.

## Ownership

- Fixture files are inputs for tests and dogfood scripts.
- `fixtures/README.md` documents fixture intent and backend-only codegen handoff boundaries.

## Local Contracts

- `otlp/malformed-protobuf.bin` must remain invalid and must exercise the safe `decode-failed` path.
- `otlp/valid-minimal-metrics.bin` must remain valid and must exercise the successful `/v1/metrics` decode path.
- Fixture assets must not contain credentials, secrets, or private raw telemetry.

## Work Guidance

- Prefer deterministic fixture generation through `deno task fixtures`.
- Add new fixture classes only when tests or acceptance evidence consume them.

## Verification

- Run `deno task fixtures` after changing generated fixture content.
- Run `deno task ok` when fixture behavior is covered by tests.

## Child DOX Index

- `otlp/` — protobuf and binary OTLP receiver fixtures.
