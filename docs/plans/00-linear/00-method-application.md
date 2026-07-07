---
project: otel-inspector-dashboard
title: "Method Application"
type: linear-method-application
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Method Application

## How the Linear Method is applied

The OTEL Inspector is planned as an **outcome-bound project**, not a cloud of themes. The project has a named result, target date, milestones, issues, documents, updates, and acceptance evidence.

The method rules applied here:

1. **Linear is the execution map.** Issues, milestones, dependencies, status, and views live in Linear.
2. **Project-library Markdown is durable canon.** Durable architecture decisions and accepted specs should be promoted out of transient Linear docs.
3. **One initiative unless more is earned.** The default is to attach this project to `Mabel — Portable AI Work Partner`. A separate observability initiative is only justified if multiple observability projects emerge.
4. **Milestones are build phases.** They are not labels or mini-initiatives.
5. **Issues must close.** Each issue includes goal, scope, acceptance criteria, and dependencies where sequencing is real.
6. **Evidence blocks claims.** The dogfood/release gate depends on fixtures, snapshots, redaction reports, and acceptance proof.

## Project classification

```yaml
project_type: desktop_developer_tool
runtime: deno_desktop
ui: shadcn_ui
signal_scope_p0: metrics
signal_scope_p1:
  - traces
  - logs
  - proxy_forwarding
complexity: high
context: greenfield planning over existing Mabel runtime principles
```

## Planning boundary

This packet is intentionally **MVP metrics-first**. Traces, logs, proxy mode, SQLite retention, and local alerting are included only where they protect the architecture from dead ends.
