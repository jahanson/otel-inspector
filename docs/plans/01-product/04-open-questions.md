---
project: otel-inspector-dashboard
title: "Open Questions"
type: open-questions
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Open Questions

These questions should become ADRs, issues, or explicit non-goals before dogfood.

| Question | Why it matters | Default if unanswered |
|---|---|---|
| What is the default OTLP receiver port? | App instrumentation examples need a stable endpoint. | Use `4318`, configurable. |
| Do we accept gzip-compressed OTLP payloads in P0? | Some exporters may compress. | Defer unless dogfood requires it. |
| Do we store raw protobuf bodies? | Privacy and disk cost. | No; raw capture explicit opt-in only. |
| What is the retention window? | Memory/CPU control. | In-memory 15 minutes or bounded by points, whichever is lower. |
| How do we identify services/resources? | Filtering and chart grouping. | Use resource attributes with explicit unknown state. |
| Which HTTP semantic metrics are first-class? | Overview accuracy. | Request duration, active requests, status/error attributes where present. |
| How do we handle missing duration histograms? | Avoid fake latency charts. | Show unavailable state with setup hint. |
| Should proxy-forward mode be P1 or separate project? | Could distort MVP. | Separate follow-on unless dogfood needs it. |
