---
project: otel-inspector-dashboard
title: "Deno Desktop Shell"
type: implementation-plan
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Deno Desktop Shell

## Target layout

```text
src/
  main.ts                  # desktop app entry
  backend/
    receiver.ts            # localhost OTLP receiver
    live_bus.ts            # summaries to UI
    store.ts               # telemetry store
  ui/
    App.tsx
    components/
    routes/
```

## Runtime posture

- Desktop shell starts backend receiver.
- UI subscribes to live summaries through a typed local channel.
- Backend owns decode/store/redaction.
- UI owns rendering/filtering/drilldowns.

## Permissions

- Network listen on localhost receiver port.
- Optional file write for redacted fixture export.
- Optional SQLite file access in P1.
- No external network send in MVP.
