# Task 1 Report: Restore Baseline Gate And Reconcile Existing Contracts

## What I implemented

- Reconciled the runtime architecture and implementation docs with the backend substrate that is already in place.
- Updated the receiver spec to describe the real success path and added the `normalize-failed` rejection category.
- Updated the telemetry normalization store spec to the implemented `MetricPoint` shape and added the future exponential histogram record.
- Marked the reactive live bus, ingest pipeline, and API/event contract docs as implemented and clarified what still remains for M3 UI work.
- Refreshed the evidence docs so the acceptance matrix and dogfood checklist reflect the current backend receiver and normalization state.
- Verified the `.codex/hooks.json` gate in this worktree and left it unchanged because it already passed line-ending checks.

## What I tested and exact results

- `git ls-files --eol -- .codex/hooks.json`
  - `i/lf    w/lf    attr/text=auto eol=lf  .codex/hooks.json`
- `deno fmt --check .codex/hooks.json`
  - `Checked 1 file`
- `deno task lint`
  - `Checked 24 files`
- `deno task check`
  - `deno check src/main.ts src/backend/receiver_worker.ts tests/**/*.ts tools/**/*.ts`
- `git diff --check`
  - No output

## Files changed

- `docs/plans/02-runtime-architecture/01-otlp-http-protobuf-receiver.md`
- `docs/plans/02-runtime-architecture/02-telemetry-normalization-store.md`
- `docs/plans/02-runtime-architecture/03-reactive-live-bus.md`
- `docs/plans/04-implementation/03-ingest-pipeline.md`
- `docs/plans/04-implementation/04-api-and-event-contracts.md`
- `docs/plans/06-evidence/acceptance-matrix.md`
- `docs/plans/06-evidence/dogfood-checklist.md`

## Self-review findings

- The docs now match the currently implemented backend receiver, store, derivation, and live summary contracts.
- No backend code was changed.
- The worktree is clean after commit.

## Concerns

- None.

## Review-fix

- `git ls-files --eol -- .codex/hooks.json`
  - `i/lf    w/lf    attr/text=auto eol=lf  .codex/hooks.json`
- `deno fmt --check .codex/hooks.json`
  - `Checked 1 file`
- No commit was needed because the reviewer finding was not reproducible in the assigned worktree.
