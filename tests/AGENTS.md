# Test DOX

## Purpose

- Own Deno test coverage for receiver contracts, dashboard app serving, UI shell rendering, and review-regression fixes.

## Ownership

- `backend/` tests cover receiver, backend app server, dashboard projection behavior, and redaction policy.
- `ui/` tests cover dashboard HTML and inline script safety.

## Local Contracts

- Prefer behavior-level tests that prove the public contract.
- For review fixes, add a regression that fails on the reviewed bug before changing production code.
- Tests may import source modules directly but must not depend on external network services.

## Work Guidance

- Keep tests deterministic and local.
- Use `@std/assert` for assertions.

## Verification

- Run `deno task ok` before closeout.
- `deno task test` keeps the suite-level read scope to `fixtures` and skips `tests/ui/dashboard_bundle_test.ts`.
- Run `deno task test:dashboard-bundle` for the dashboard bundle regression; that task grants the local `src/ui/dashboard`, `src/ui/dist`, `deno.json`, and `tools/build_ui.ts` reads needed by `tests/ui/dashboard_bundle_test.ts`.

## Child DOX Index

- `backend/` — receiver, backend app server, and dashboard projection tests.
- `ui/` — dashboard shell tests.
