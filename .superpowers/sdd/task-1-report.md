# Task 1 Report: Restore Baseline And Reconcile M2 Status

## Status

DONE

## Commits Created

- `e9d94e4` `docs: reconcile dashboard substrate status`

## Test Summary

- `deno task ok` passed with 56 tests.
- `git diff --check` passed with no whitespace errors.

## Concerns

- None.
- `.codex/hooks.json` was left unchanged because `git ls-files --eol -- .codex/hooks.json`
  already reported LF formatting, so the brief did not require a normalization edit.

## Follow-up Fix

- Updated `docs/plans/04-implementation/04-api-and-event-contracts.md` so the
  M3 dashboard projection contract is described as planned later dashboard work
  rather than an already-implemented runtime contract.

## Verification For This Fix

- `git diff --check -- docs/plans/04-implementation/04-api-and-event-contracts.md`
- `deno task ok`

## Task 1 Review Finding Follow-Up

- Updated `docs/plans/04-implementation/04-api-and-event-contracts.md` so the
  M3 dashboard projection section now describes future implementation work
  instead of implying `src/backend/dashboard_projection.ts` and the related
  projection routes already exist.

## Commands And Results

- `git diff --check -- docs/plans/04-implementation/04-api-and-event-contracts.md`
  passed with no output.
- `deno task ok` passed with 56 tests.
