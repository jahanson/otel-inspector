# Task 1 Report: Metric Model And Stable Series Keys

## Outcome

Implemented the metric substrate model in the requested worktree using only the two owned files:

- `src/backend/metric_model.ts`
- `tests/backend/metric_model_test.ts`

The implementation adds the requested exported types and helpers:

- `PrimitiveAttributeValue`
- `MetricPoint`
- `MetricWarning`
- `MetricType`
- `AggregationTemporalityName`
- `DerivationStatus`
- `attributesFromKeyValues`
- `buildSeriesKey`
- `toNumberValue`

## Red / Green

1. Added the test file first with the exact behavior from the task brief.
2. Ran `deno test tests/backend/metric_model_test.ts` before the implementation existed.
3. Confirmed the expected red state: TypeScript could not find `src/backend/metric_model.ts`.
4. Implemented the model.
5. Reran the same focused test and confirmed all three tests passed.

## Implementation Notes

- `attributesFromKeyValues` keeps primitive OTLP values and omits arrays, key/value lists, bytes, and empty values.
- `buildSeriesKey` prefixes keys with `series:` and uses canonical object-key sorting so insertion order does not affect the result.
- `toNumberValue` preserves finite numbers, converts safe `bigint` values, and rejects unsafe `bigint` values.
- `MetricPoint` and related types were added exactly as described in the task brief so later substrate tasks can build on them.

## Verification

Focused command:

```powershell
deno test tests/backend/metric_model_test.ts
```

Result: 3 passed, 0 failed.

## Commit

- `1175778` `feat: add metric substrate model`

## Self-Review

- Scope stayed inside the requested worktree and touched only the two owned files.
- The tests prove the intended public behavior rather than implementation details.
- No additional repo files were modified as part of this task.

## Review Fix Append

- Fixed the stable series key bug by skipping explicit `undefined` fields during canonical stringification.
- Added a regression test that proves `{ name: "otel.http" }` and `{ name: "otel.http", version: undefined }` now produce the same key.
- Verified the focused test suite with `deno test tests/backend/metric_model_test.ts`.
