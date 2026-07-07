---
project: otel-inspector-dashboard
title: "shadcn Component Map"
type: ui-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# shadcn Component Map

## Shell

| Need | Component |
|---|---|
| Docked side inspector | `Sheet` |
| Docked/full split | `ResizablePanelGroup` |
| Primary navigation | `Tabs` |
| Dense scroll body | `ScrollArea` |
| Header status | `Badge`, `Tooltip`, `Button`, `ToggleGroup` |
| Empty/degraded state | `Alert`, `Card` |

## Overview

| Need | Component |
|---|---|
| KPI cards | `Card` |
| Live charts | shadcn `ChartContainer`, `ChartTooltip`, Recharts primitives |
| Time controls | `Select`, `ToggleGroup` |
| Route/resource ranking | `Table` / DataTable pattern |

## Metrics Explorer

| Need | Component |
|---|---|
| Search palette | `Command` |
| Attribute/resource filters | `Combobox`, `Select`, `Input` |
| Metric table | DataTable pattern |
| Metric detail | `Drawer` or `Sheet` |
| Copy metric names | `ContextMenu`, `Button` |

## Payload Inspector

| Need | Component |
|---|---|
| Resource/scope/metric tree | `Accordion` + custom tree rows |
| Decoded datapoints | `Table` |
| Safe raw snippets | code block inside `ScrollArea` |
| Redaction state | `Badge`, `Alert` |
| Export fixture | `Dialog`, `Button` |

## Settings

| Need | Component |
|---|---|
| Receiver port | `Input` |
| Raw capture | `Switch` |
| Retention | `Slider`, `Select` |
| Redaction rules | `Textarea`, `Table` |
| Proxy mode P1 | `Switch` disabled / `Alert` |
