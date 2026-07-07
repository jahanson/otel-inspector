# Backend OTEL DOX

## Purpose

- Own backend-only OTLP protobuf decode boundaries and generated TypeScript bindings.

## Ownership

- `decode.ts` owns safe decoder entry points consumed by the receiver.
- `proto/` contains generated protobuf-ts output from `deno task proto:gen`.

## Local Contracts

- UI code must not import from this folder.
- Generated proto files must not be hand-edited; update `tools/proto/` and rerun `deno task proto:gen`.
- Decoder wrappers may throw raw decoder errors internally, but callers must convert them to safe receiver failures.

## Work Guidance

- Keep decode wrappers metrics-first until traces/logs move out of P1.

## Verification

- Run `deno task proto:gen` after changing proto inputs or generated output.
- Run `deno task receiver:test` after changing `decode.ts`.
- Run `deno task ok` before closeout.

## Child DOX Index

- No child AGENTS.md files.
