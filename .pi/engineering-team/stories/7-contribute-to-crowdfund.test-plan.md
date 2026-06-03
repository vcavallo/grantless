# Test Plan: Story 7 — Contribute to a crowdfund

**Story:** `.pi/engineering-team/stories/7-contribute-to-crowdfund.md`
**ADR:** `.pi/engineering-team/decisions/0009-contribute-to-crowdfund.md`
**Date:** 2026-06-03

## Approach

Three tiers. The protocol-facing logic (goal shape, progress math, goal-link) is pure and reused, so it's unit-tested; the full crowdfund path is exercised against a real relay; and the UI (open-for-funding, contribute, progress) is driven in a browser.

1. **Unit (`npm test`):** `catallax.goal.test.ts` — `buildZapGoalTemplate` (kind 9041, target msats, `zap`=arbiter, `a`=coord, `relays`), `calculateGoalProgress` over mocked receipts (target/raised/percent/isGoalMet, contributor aggregation, partial progress), and the goal-link round-trip (re-publish with a `goal` tag, status preserved).
2. **Real-event e2e (`npm run test:e2e`):** `crowdfund.e2e.test.ts` — publish a proposed task (with arbiter) + a 9041 goal, link it, then publish mocked 9735 contributions from two funders; query the goal + receipts and assert `calculateGoalProgress` reaches the target with the right raised/contributor counts, and that the task's latest version carries the `goal` tag.
3. **Browser (`npm run test:browser`):** `crowdfund.spec.ts` — the patron "opens for funding" a seeded proposed task (→ a contribute affordance appears); a funder contributes to a seeded goal (→ confirmation).

## Coverage map

| Criterion (AC) | Test | File | Level |
|---|---|---|---|
| Open for funding (9041 created, target/zap/a, task linked) | `buildZapGoalTemplate` + goal-link round-trip; e2e "links the goal to the task"; browser "patron opens a project for funding" | unit/e2e/browser | all |
| Contribute (mocked 9735 to the goal, anyone) | e2e contributions + browser "a funder can contribute" | e2e/browser | both |
| Funding progress shown (raised/target/%, contributors) | `calculateGoalProgress` unit; e2e "computes funding progress…"; browser progress affordance | unit/e2e/browser | all |
| Goal-reached surfaced + fundable | `isGoalMet` (unit/e2e); "Mark funded" stays from Story 6.5 | unit/e2e | unit/e2e |
| Replaceable/latest correctness (goal link survives) | goal-link round-trip (unit); e2e latest carries `goal` | unit/e2e | both |
| No privileged actor (openness) | escrow → chosen arbiter; contributions are the funder's own events; arbitrary keys; configured relay | unit/e2e | both |

## RED confirmation (2026-06-03, before implementation)

- **Unit:** `catallax.goal.test.ts` fails — `buildZapGoalTemplate` is not a function yet.
- **E2E:** `crowdfund.e2e.test.ts` fails to resolve the same import.
- **Browser:** the open-for-funding + contribute specs fail (no `CrowdfundSection` on the detail page; the legacy crowdfunding block has no "Open for funding"/Grantless "Contribute").

Goes GREEN once Implementation adds `buildZapGoalTemplate` and the `CrowdfundSection` component (mounted on `TaskDetail` in place of the legacy crowdfunding block).

## Test infrastructure

- Unit: Vitest; reuse `calculateGoalProgress`, `buildMockZapReceiptTemplate`, `buildTaskProposalTemplate`/`taskProposalToInput`.
- E2E: Vitest + local strfry + `nak`, reusing the harness; goal `relays` = the local relay so receipts resolve.
- Browser: Playwright vs the seeded relay; seed-proposed-alice (open-for-funding) + seed-funded-bob (existing goal, contribute); `PLAYWRIGHT_CHROMIUM_PATH` on NixOS.

## How to run

```
npm test            # unit
npm run test:e2e    # nak crowdfund e2e
npm run test:browser  # open-for-funding + contribute UI
```
