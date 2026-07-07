---
project: otel-inspector-dashboard
title: "ADR-003 Docked Inspector Plus Full Dashboard"
type: adr
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# ADR-003: Docked side inspector plus expandable full dashboard

## Decision

The product ships with a docked side inspector as the primary mode and an expandable full dashboard for deeper analysis.

## Rationale

The side inspector matches the product job: stay beside the app while debugging. The full dashboard prevents dense payload and fixture workflows from cramping the side panel.

## Consequences

- Use `Sheet`/`ResizablePanelGroup` for the side mode.
- Use the same tabs and substrate projections in full mode.
- Payload Inspector and Settings may use more space in full mode.
