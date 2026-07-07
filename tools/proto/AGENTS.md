# Proto Tooling DOX

## Purpose

- Own vendored protobuf schema inputs used to generate backend-only OTLP TypeScript bindings.

## Ownership

- `opentelemetry/proto/` contains the minimal OTLP metrics schema surface needed by the local receiver.

## Local Contracts

- Keep proto inputs deterministic and local; codegen must not depend on downloading schema files at generation time.
- Do not add trace or log schemas until the receiver accepts those signals.

## Work Guidance

- Prefer the smallest schema surface that preserves OTLP wire compatibility required by tests.

## Verification

- Run `deno task proto:gen` after changing proto inputs.
- Run `deno task ok` when generated output affects receiver behavior.

## Child DOX Index

- No child AGENTS.md files.
