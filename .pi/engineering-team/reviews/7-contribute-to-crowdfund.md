# Review: Story 7 — Contribute to a crowdfund

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-03
**Diff:** `git diff dd90d733..HEAD` (10 files, +550/-30; excludes the unrelated epic-chore note)

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean).
- [x] `npx eslint` — **PASS** (exit 0; 0 errors, the 2 pre-existing `*Filters.tsx` warnings only).
- [x] `npx vitest run` (unit) — **PASS** (12 files, 58 tests; +4 goal/progress tests).
- [x] `npx vite build` — **PASS**.
- [x] `npm run test:e2e` (nak) — **PASS** (7 files, 32 tests; incl. the new `crowdfund` full path).
- [x] `npm run test:browser` (Playwright) — **PASS** (15/15, incl. open-for-funding + contribute).

## Spec adherence

| AC | Evidence | Verdict |
|---|---|---|
| Open for funding (9041: target/zap/a; task linked) | `buildZapGoalTemplate` unit + goal-link round-trip; e2e "links the goal to the task"; browser "patron opens a project for funding" | ✅ |
| Contribute (mocked 9735 to the goal, anyone) | e2e contributions; browser "a funder can contribute"; `CrowdfundSection.contribute` (any logged-in user) | ✅ |
| Funding progress shown (raised/target/%, contributors) | `calculateGoalProgress` unit; e2e "computes funding progress…"; `CrowdfundSection` Progress + counts | ✅ |
| Goal-reached surfaced + fundable | `isGoalMet` (unit/e2e); "Goal reached" badge; "Mark funded" stays from Story 6.5 | ✅ |
| Replaceable/latest correctness (goal link survives) | goal-link round-trip (unit); e2e asserts latest carries `goal` | ✅ |
| No privileged actor (openness) | escrow → chosen arbiter; contributions are funders' own events; progress from public receipts; arbitrary keys | ✅ |

## ADR adherence

- Matches ADR 0009: pure `buildZapGoalTemplate` (wraps `buildGoalEventTags`); `CrowdfundSection` reuses `calculateGoalProgress`, `useZapGoal`, the Story-6.5 mock receipt, and `buildTaskProposalTemplate`/`taskProposalToInput` for the `goal`-tag link; mounted on `TaskDetail` replacing the legacy real-Lightning block.
- No new event kinds; `NIP.md` unchanged. No new dependencies. Goal `relays` tag is set from the configured relay so `useZapGoal`'s receipt query resolves locally; the contribute action manually invalidates `['zap-goal', goalId]` (the publish hook has no 9735 branch) — matches the ADR.
- Legacy `GoalProgressBar`/`CrowdfundButton`/`ContributorsList` removed from `TaskDetail` (retained in-repo, retire later) — consistent with the Story-6.5 precedent.

## Things tests can't catch

- **Escrow direction**: the goal's `zap` tag and each contribution's recipient `p` are the task's **chosen arbiter** (`task.arbiterPubkey`), not any hardcoded agent — verified in `buildZapGoalTemplate`/`CrowdfundSection`. Prime-directive-aligned.
- **`e` tag is a real event id** (the goal id) on contributions — avoids the non-hex `e` rejection from Story 6.5; the browser contribute test exercising a live publish would have caught a regression.
- **Progress is a derived tally** from public receipts (`calculateGoalProgress`), not a trusted server value; double-counting is avoided by `useZapGoal`'s id-dedupe + per-sender aggregation (unit-tested).
- No secrets/debug logging/placeholder comments in the diff. Contributors/patron sign their own 9041/9735/33401 (no nsec exposure). Removed `waitingForPayment` cleanly (no dangling refs).

## House rules check

- [x] **Open / permissionless / WoT:** anyone logged in may contribute; escrow → the patron's chosen arbiter; no special pubkey/relay; progress from public events.
- [x] **Bootstrapping defaults only:** goal `relays` from the configured/overridable set; mocked receipts are dev stand-ins.
- [x] **nsec / signing:** explicit signing; no key exposure.
- [x] **Fork test:** anyone funds projects on their own relay identically.

## Findings

### Blocking
None.

### Non-blocking
1. **Mocked payments**: contributions are arbiter-less of real value — kind-9735 stand-ins (no LNURL/Lightning). Real settlement + refunds/splits remain deferred (noted in the story/ADR).
2. **`useZapGoal` uses a direct WebSocket** to the goal's `relays` tag (legacy hook) rather than the app pool. Works (dev CSP allows `ws:`; goal carries the configured relay); if the goal's relays are ever empty it falls back to public relays — fine since `buildZapGoalTemplate` always stamps the configured set.
3. **"Mark funded" still doesn't require the goal be reached** — intentional (Story 6.5 manual action); Story 7 only surfaces reached-ness, per the story.
4. Legacy crowdfunding components now unused — retire with the rest of the legacy real-Lightning UI in a later cleanup.

## Verdict
**PASS** — the diff matches the story, ADR 0009, and the test plan; all six gate tiers are clean (unit 58, nak e2e 32, Playwright 15). The crowdfund funding step works end-to-end (open a goal → contribute → progress → goal-reached), reusing the existing progress math and mock-receipt shape, with escrow directed to the chosen arbiter and progress derived from public receipts — permissionless and prime-directive-aligned. Mergeable as-is.
