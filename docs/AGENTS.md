# Documentation DOX

## Purpose

- Own durable product, Linear, architecture, implementation, UI, evidence, and ADR documents under `docs/`.

## Ownership

- Keep docs aligned with executable contracts in `src/`, fixtures in `fixtures/`, tests in `tests/`, and scripts in `tools/`.
- Promote stable behavior into the closest durable planning document rather than leaving it only in PR discussion.

## Local Contracts

- Receiver behavior belongs in `docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md`.
- OTLP type generation boundaries belong in `docs/plans/04-implementation/02-protobuf-codegen.md`.
- Evidence and acceptance claims belong in `docs/plans/06-evidence/`.

## Work Guidance

- Keep planning docs concise and operational.
- Update docs when behavior, ports, permissions, payload limits, fixture shape, or module boundaries change.

## Verification

- Run `deno task ok` when docs describe executable behavior changed by the same task.

## Child DOX Index

- `plans/` — project planning packet organized by Linear, product, runtime architecture, UI dashboard, implementation, issue, evidence, and ADR folders.
