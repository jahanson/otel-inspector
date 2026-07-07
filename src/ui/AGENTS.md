# UI DOX

## Purpose

- Own the embedded dashboard shell rendered inside the Deno webview.

## Ownership

- `app_html.ts` owns the first dashboard HTML, CSS, inline boot data, and browser refresh behavior.

## Local Contracts

- Render from normalized backend contracts such as `LiveTelemetrySummary`.
- Fetch live summaries from `/api/summary` when no native webview binding is present.
- Escape inline JSON for script safety, including `<`, U+2028, and U+2029.
- Keep the first viewport dashboard-dense on desktop while preserving responsive fallback.

## Work Guidance

- Keep the UI operational, not marketing-oriented.
- Do not import backend protobuf-generated types or parse raw OTLP payloads in UI code.

## Verification

- Run `deno test --allow-net=127.0.0.1:4318,127.0.0.1:4319 tests/ui/app_html_test.ts` for UI shell changes.
- Run `deno task ok` before closeout.

## Child DOX Index

- No child AGENTS.md files.
