---
project: otel-inspector-dashboard
title: "Redaction and Privacy"
type: runtime-spec
status: proposed-draft
created: 2026-07-05
updated: 2026-07-05
source_method: LINEAR_METHOD_v2.md
owner: user
---

# Redaction and Privacy

## Default policy

Telemetry attributes can contain credentials, cookies, customer data, or internal URLs. Safe views must redact by default.

## Sensitive key patterns

```text
authorization
cookie
set-cookie
api_key
api-key
token
password
secret
private_key
session
credential
```

## Safe inspect may show

- endpoint path
- payload byte count
- resource/scope/metric counts
- metric names
- attribute keys
- redacted attribute values
- failure category
- redaction report

## Safe inspect must not show by default

- credentials
- raw private prompts
- raw sensitive file contents
- raw protobuf bodies
- opaque provider/runtime state
- full environment dumps

## Redaction report shape

```yaml
redaction:
  status: passed | blocked
  hidden_attribute_values: 3
  patterns_matched:
    - token
    - authorization
  raw_payload_stored: false
```
