---
project: otel-inspector-dashboard
title: "Developer Experience"
type: implementation-plan
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Developer Experience

## Local dev commands

```text
deno task dev              # run desktop shell in dev mode
deno task receiver:test    # run receiver fixture tests
deno task fixtures         # regenerate sample OTLP payloads
deno task ok               # format/lint/test
```

## Dogfood fixture generator

Provide a tiny instrumented sample app or fixture sender:

```text
deno task send:metrics-fixture
```

It should send known metrics to `localhost:4318/v1/metrics` so the dashboard can be tested without another app.
