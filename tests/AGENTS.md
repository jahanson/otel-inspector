# Test DOX

## Purpose

- Own Deno test coverage for receiver contracts, dashboard app serving, UI shell rendering, and review-regression fixes.

## Ownership

- `backend/` tests cover receiver and backend app server behavior.
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

## Child DOX Index

- `backend/` — receiver and backend server tests.
- `ui/` — dashboard shell tests.
