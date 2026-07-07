---
project: otel-inspector-dashboard
title: "Risk Register"
type: evidence
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Risk Register

| Risk | Impact | Mitigation | Owner issue |
|---|---|---|---|
| OTLP decode complexity delays dashboard | MVP slips | Use generated protobuf types and fixture-first tests | OI-004/OI-005 |
| UI becomes pretty but unverifiable | Trust failure | Every graph point links to series/payload context | OI-014/OI-016 |
| Raw payloads leak secrets | Privacy failure | Raw capture opt-in, redaction-by-default, fixture scans | OI-018/OI-019/OI-020 |
| High ingest rate freezes UI | Dogfood failure | Live bus batching, downsampling, dropped-point accounting | OI-012 |
| HTTP metrics absent or named differently | Confusing empty dashboard | Show unavailable state and explorer-first fallback | OI-011/OI-013 |
| Scope creep into traces/logs | MVP drift | P1 placeholder tabs only, no P0 receiver support | OI-023/OI-024 |
| Proxy mode distorts MVP | Schedule risk | Decision spike only, not P0 dependency | OI-022 |
