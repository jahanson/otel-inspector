# UI DOX

## Purpose

- Own the embedded dashboard shell rendered inside the Deno webview.

## Ownership

- `app_shell.ts` owns the dashboard HTML shell, inline projection bootstrap, dashboard action token bootstrap, and built asset handoff for the web app mount.
- `app_html.ts` retains the first static dashboard HTML implementation during the shell-to-app transition.
- `dashboard/` owns the React dashboard entrypoint, browser-only projection types, local UI primitives, and base styles.
- `dist/` holds generated React dashboard assets emitted by `deno task ui:build`; never hand-edit files under `dist/`.

## Local Contracts

- Render from normalized backend contracts rather than raw OTLP payloads or generated protobuf types.
- The app shell must mount `#root`, inline-escape projection and action-token bootstrap JSON, and load `/assets/app.js` plus `/assets/styles.css`.
- `dashboard/types.ts` must mirror the JSON projection contract without importing backend files.
- Escape inline JSON for script safety, including `<`, U+2028, and U+2029.
- Keep the first viewport dashboard-dense on desktop while preserving responsive fallback.

## Work Guidance

- Keep the UI operational, not marketing-oriented.
- Do not import backend protobuf-generated types or parse raw OTLP payloads in UI code.
- Keep chart styling config separate from series data and route chart colors through named CSS variables.

## Verification

- Run `deno task ui:build` after changing React dashboard sources or emitted assets.
- Run `deno test tests/ui/app_html_test.ts` for UI shell changes.
- Run `deno task ok` before closeout.

## Child DOX Index

- No child AGENTS.md files.
