# Tools DOX

## Purpose

- Own local developer and dogfood utility scripts.

## Ownership

- `build_ui.ts` runs the local esbuild binary to bundle the React dashboard into `src/ui/dist` and copies base CSS only after the bundle succeeds.
- `write_fixtures.ts` regenerates local fixture files.
- `send_metrics_fixture.ts` sends the malformed OTLP fixture to the local receiver.
- `generate_proto.ts` regenerates backend-only OTLP TypeScript bindings from local proto inputs.

## Local Contracts

- Tool permissions must be explicit in `deno.json`.
- UI asset builds run through `deno task ui:build` with scoped read/write/run permissions and must emit `src/ui/dist/app.js` plus `src/ui/dist/styles.css`.
- Proto generation runs through `deno task proto:gen` and must use local files under `tools/proto/`.
- Proto generation must not use broad `-A` or network permissions.
- Fixture sender requires `--allow-read=fixtures` and `--allow-net=127.0.0.1:4318`.
- Tools must not send telemetry to external services.

## Work Guidance

- Keep scripts small, deterministic, and Windows-friendly.
- Prefer task wrappers in `deno.json` over ad hoc command instructions.

## Verification

- Run `deno task ui:build` for dashboard build-tool changes.
- Run `deno task fixtures` for fixture generation changes.
- Run `deno task proto:gen` for proto input or generator changes.
- Run `deno task send:metrics-fixture` with the receiver running for sender changes.

## Child DOX Index

- `proto/AGENTS.md` — vendored protobuf schema inputs for backend OTLP code generation.
