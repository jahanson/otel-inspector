# UI DOX

## Purpose

- Own the embedded dashboard shell rendered inside the Deno webview.

## Ownership

- `app_shell.ts` owns the dashboard HTML shell, inline projection bootstrap, and placeholder asset handoff for the web app mount.
- `app_html.ts` retains the first static dashboard HTML implementation during the shell-to-app transition.

## Local Contracts

- Render from normalized backend contracts rather than raw OTLP payloads or generated protobuf types.
- The app shell must mount `#root`, inline-escape projection bootstrap JSON, and load `/assets/app.js` plus `/assets/styles.css`.
- Escape inline JSON for script safety, including `<`, U+2028, and U+2029.
- Keep the first viewport dashboard-dense on desktop while preserving responsive fallback.

## Work Guidance

- Keep the UI operational, not marketing-oriented.
- Do not import backend protobuf-generated types or parse raw OTLP payloads in UI code.

## Verification

- Run `deno test tests/ui/app_html_test.ts` for UI shell changes.
- Run `deno task ok` before closeout.

## Child DOX Index

- No child AGENTS.md files.
