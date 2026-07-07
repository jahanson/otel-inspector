# Tools DOX

## Purpose

- Own local developer and dogfood utility scripts.

## Ownership

- `write_fixtures.ts` regenerates local fixture files.
- `send_metrics_fixture.ts` sends the malformed OTLP fixture to the local receiver.

## Local Contracts

- Tool permissions must be explicit in `deno.json`.
- Fixture sender requires `--allow-read=fixtures` and `--allow-net=127.0.0.1:4318`.
- Tools must not send telemetry to external services.

## Work Guidance

- Keep scripts small, deterministic, and Windows-friendly.
- Prefer task wrappers in `deno.json` over ad hoc command instructions.

## Verification

- Run `deno task fixtures` for fixture generation changes.
- Run `deno task send:metrics-fixture` with the receiver running for sender changes.

## Child DOX Index

- No child AGENTS.md files.
