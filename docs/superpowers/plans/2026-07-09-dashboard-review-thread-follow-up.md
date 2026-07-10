# Dashboard Review Thread Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the selected-window redaction report on PR #5 and close all three validated review threads with code or reproducible evidence.

**Architecture:** Keep dashboard projection fields aligned by deriving redaction from the already-filtered `windowSnapshot`; do not expand the API or attach a misleading single series key to aggregate cards. Exercise the defect with a behavior-level Deno regression, then publish the narrow fix and mutate GitHub thread state only after local verification.

**Tech Stack:** Deno 2, TypeScript, `@std/assert`, GitHub CLI REST/GraphQL, Repowise MCP.

## Global Constraints

- Preserve the existing dashboard API shape.
- Keep aggregate overview-card detail targets metric-scoped because no single series represents their values.
- Treat GitHub `reviewThreads` as the source of truth and re-read thread state after every write sequence.
- Follow the repository DOX chain and run `deno task ok` before closeout.

---

### Task 1: Return Window-scoped Redaction

**Files:**
- Modify: `tests/backend/dashboard_projection_test.ts`
- Modify: `src/backend/dashboard_projection.ts:130`

**Interfaces:**
- Consumes: `buildDashboardProjection(snapshot, summary, { observedAtMs, windowMs }): DashboardProjection`.
- Produces: `DashboardProjection.redaction` derived from points inside the same selected window used by cards, charts, explorer rows, ingest, and warnings.

- [ ] **Step 1: Add the failing regression**

Add this test before the existing explorer-series tests:

```ts
Deno.test("buildDashboardProjection scopes redaction to the selected window", () => {
  const outsideWindow = {
    ...explorerPoint("redacted-series", 1_000, 1),
    attributes: { authorization: "[REDACTED]" },
    redaction: { status: "blocked" as const, hiddenAttributeValues: 1, patternsMatched: ["authorization"] },
  };
  const sourceSummary = summary({
    p95Ms: undefined,
    requestRate: 1,
    errorRate: undefined,
    topServices: ["checkout"],
  });
  sourceSummary.redaction = {
    status: "blocked",
    hiddenAttributeValues: 1,
    patternsMatched: ["authorization"],
  };

  const projection = buildDashboardProjection(
    snapshot([outsideWindow, explorerPoint("clean-series", 2_500, 2)]),
    sourceSummary,
    { observedAtMs: 3_000, windowMs: 1_000 },
  );

  assertEquals(projection.redaction, {
    status: "passed",
    hiddenAttributeValues: 0,
    patternsMatched: [],
  });
});
```

- [ ] **Step 2: Verify the regression fails for the reviewed defect**

Run: `deno test tests/backend/dashboard_projection_test.ts`

Expected: FAIL because `projection.redaction.status` is `"blocked"` instead of `"passed"`.

- [ ] **Step 3: Apply the minimal implementation**

Change the projection return field in `src/backend/dashboard_projection.ts`:

```ts
redaction: windowSummary.redaction,
```

- [ ] **Step 4: Verify focused and repository-wide behavior**

Run: `deno test tests/backend/dashboard_projection_test.ts`

Expected: PASS.

Run: `deno test tests/backend/redaction_test.ts tests/backend/dashboard_projection_test.ts`

Expected: PASS.

Run: `deno task ok`

Expected: exit `0` with build, format, lint, type-check, regular tests, and dashboard bundle tests passing.

- [ ] **Step 5: Perform DOX and diff closeout**

Re-read `AGENTS.md`, `src/AGENTS.md`, `src/backend/AGENTS.md`, and `tests/AGENTS.md`. The existing contract already says dashboard projection is selected-window scoped and already requires the focused redaction/projection tests, so leave DOX unchanged unless the implementation reveals a durable contract difference.

Run: `git diff --check`

Expected: no output and exit `0`.

Run: `repowise update`

Expected: the current worktree commit and changed files are indexed without error.

- [ ] **Step 6: Commit the validated fix**

```powershell
git add src/backend/dashboard_projection.ts tests/backend/dashboard_projection_test.ts
git commit -m "fix: scope dashboard redaction to selected window"
```

### Task 2: Publish and Close Review Threads

**Files:**
- No repository file changes.

**Interfaces:**
- Consumes: PR `jahanson/otel-inspector#5`, current branch `codex/dashboard-workbench`, and thread IDs `PRRT_kwDOTP2gsc6PxA3h`, `PRRT_kwDOTP2gsc6PxA3i`, `PRRT_kwDOTP2gsc6PxA3l`.
- Produces: pushed commits, one inline evidence reply per thread, and three resolved review threads.

- [ ] **Step 1: Push the existing PR branch**

Run: `git push -u origin codex/dashboard-workbench`

Expected: remote branch advances to the local `HEAD` without force-push.

- [ ] **Step 2: Re-fetch live review-thread state**

```powershell
$env:PYTHONUTF8 = "1"
python "C:\Users\jahanson\.codex\plugins\cache\openai-curated-remote\github\0.1.8-2841cf9749ae\skills\gh-address-comments\scripts\fetch_comments.py"
```

Expected: the three target threads remain unresolved before replies are posted.

- [ ] **Step 3: Reply to each inline thread with evidence**

Resolve each `PRRC_...` node to its numeric REST comment ID with `gh api repos/jahanson/otel-inspector/pulls/5/comments --paginate`, then POST to `repos/jahanson/otel-inspector/pulls/5/comments/{id}/replies`.

Use these reply bodies:

```text
Reproduced this from a temporary clean checkout with no `node_modules` and an empty `DENO_DIR`. `deno task ui:build` downloaded and initialized the locked `esbuild@0.25.8` plus `@esbuild/win32-x64@0.25.8`, built `src/ui/dist/app.js`, and exited 0. The committed lockfile and `nodeModulesDir: "auto"` materialize the binary before `build_ui.ts` invokes it, so this failure does not reproduce.
```

```text
Fixed in `<commit>`. Dashboard projection now returns `windowSummary.redaction`, derived from the same filtered snapshot as cards, charts, explorer rows, and ingest. Added a regression where a blocked point is outside the requested window and the in-window projection reports a clean redaction status. `deno task ok` passes.
```

```text
This card target is intentionally metric-scoped. The card values are aggregates: latency merges histogram buckets across series, throughput and error rate use all request series, and active requests sums each series' newest gauge. No single `seriesKey` truthfully represents the card. Adding the newest key would hide other contributors and misidentify one series as the aggregate source, so the existing metric-name target is the correct drilldown boundary.
```

Expected: each response is created inside its matching review thread and the read-back body exactly matches the submitted text.

- [ ] **Step 4: Resolve the validated threads**

Resolve `PRRT_kwDOTP2gsc6PxA3h` and `PRRT_kwDOTP2gsc6PxA3l` as demonstrably invalid, and resolve `PRRT_kwDOTP2gsc6PxA3i` as fixed.

Expected: all three GraphQL `resolveReviewThread` mutations return `isResolved: true`.

- [ ] **Step 5: Verify final GitHub state**

Re-run the bundled `fetch_comments.py` command.

Expected: zero unresolved review threads.

Run: `gh pr checks 5 --repo jahanson/otel-inspector`

Expected: current check status is reported without CLI errors; any still-running check is reported accurately rather than treated as passing.

Run: `gh pr view 5 --repo jahanson/otel-inspector --json url,headRefName,headRefOid,mergeStateStatus,reviewDecision,statusCheckRollup`

Expected: `headRefOid` equals local `HEAD`, the PR URL is `https://github.com/jahanson/otel-inspector/pull/5`, and live merge/check state is captured for closeout.
