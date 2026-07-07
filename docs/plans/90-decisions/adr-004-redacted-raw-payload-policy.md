---
project: otel-inspector-dashboard
title: "ADR-004 Redacted Raw Payload Policy"
type: adr
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# ADR-004: Raw payload capture is disabled by default

## Decision

Do not persist raw OTLP protobuf payload bodies by default. Persist decoded summaries and redaction reports. Raw capture is explicit opt-in and still subject to redaction/fixture safety.

## Rationale

Telemetry attributes can contain secrets, cookies, tokens, customer data, and private internals. Debuggability should not require privacy recklessness.

## Consequences

- Payload Inspector shows decoded safe summaries by default.
- Fixture export includes reproduction metadata and redaction reports.
- Raw capture state is visible in Settings and status.
