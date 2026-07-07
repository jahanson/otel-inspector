---
project: otel-inspector-dashboard
title: "OTEL Inspector and Dashboard Linear Plan README"
type: readme
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# OTEL Inspector and Dashboard — Linear Plan Folder

This bundle turns the **OTEL Inspector and Dashboard** idea into a Linear-ready planning packet using the Mabel Linear Method shape:

```text
Initiative/context → Project → Milestones → Issues → Dependencies → Labels/Views → Updates → Evidence
```

The planning rule applied here is: **Linear is the execution map; durable product truth belongs in project-library-style Markdown.** So this folder separates:

- `00-linear/` — Linear execution objects and import-shaped data.
- `01-product/` — product packet, PRD, journeys, open questions.
- `02-runtime-architecture/` — Deno desktop + OTLP receiver + telemetry substrate design.
- `03-ui-dashboard/` — shadcn component map, graph inventory, states, and wireframes.
- `04-implementation/` — implementation slices, contracts, testing, and devex.
- `05-linear-issues/` — closeable issue files with acceptance criteria.
- `06-evidence/` — acceptance matrix, fixture plan, risk register, dogfood checklist.
- `90-decisions/` — ADRs that should be promoted if they become durable canon.
- `templates/` — reusable Linear update and issue templates.

## Recommended Linear shape

Do **not** create a new initiative yet unless observability grows beyond this one project. Attach this as a project under the existing Mabel strategic umbrella or create a future initiative only after more observability projects exist.

```text
Initiative: Mabel — Portable AI Work Partner
  Project: OTEL Inspector and Dashboard MVP
    Target: 2026-08-14
```

## MVP success quote

> I can run the inspector beside my Deno desktop app, see live OTLP metrics within seconds, drill from a latency spike to the decoded payload that caused it, and export a redacted fixture without leaking secrets.

## Quick start

1. Read `00-linear/01-project.md`.
2. Import or recreate milestones from `00-linear/03-milestones.md`.
3. Create issues from `05-linear-issues/` or `00-linear/import/linear-issues.json`.
4. Apply dependencies from `00-linear/05-dependencies.md`.
5. Use `06-evidence/acceptance-matrix.md` as the release gate.
