# Test Plan: Story 11 — Browse under a Curator

**Story:** `.pi/engineering-team/stories/11-browse-under-curator.md`
**ADR:** `.pi/engineering-team/decisions/0010-browse-under-curator.md`
**Date:** 2026-06-03

## Approach

The filter/sort logic is pure (operates on `TaskProposal[]` + a progress map), so it's unit-tested directly; the rest (funding cards, controls, the `/c/:npub` route) is UI, verified with Playwright against the seed.

1. **Unit (`npm test`):** `grantless.browse.test.ts` — `filterTasks` (status filter, seeking-funding = goal+unmet, needs-worker = funded+no-worker) and `sortTasks` (newest / amount / funding incl. no-goal-last).
2. **Browser (`npm run test:browser`):** `browse.spec.ts` — funding bar on a funded card; concluded hidden by default (revealed by the chip); the needs-a-worker filter narrows the set; `/c/:npub` deep-links to a curator.

No new nak e2e — the new logic is pure (unit-covered) and the funding queries are exercised by Story 7's crowdfund e2e.

## Coverage map

| Criterion (AC) | Test | File | Level |
|---|---|---|---|
| Funding shown on cards | browser "a funding-state project card shows funding progress" | `browse.spec.ts` | browser |
| Hide concluded (default on) | `filterTasks` status; browser "concluded projects are hidden by default" | unit/browser | both |
| Filter by status | `filterTasks` status; browser concluded-chip toggle | unit/browser | both |
| Sorts (newest/funding/amount) | `sortTasks` (3 cases) | `grantless.browse.test.ts` | unit |
| Seeking-funding filter | `filterTasks` seekingFunding | unit | unit |
| Needs-a-worker filter | `filterTasks` needsWorker; browser "needs a worker filter" | unit/browser | both |
| Hide empty applicants | `CuratorBrowser` (applicant drop) | — | manual/browser |
| Shareable curator URL | browser "/c/:npub deep-links to a curator" | `browse.spec.ts` | browser |
| No privileged actor (openness) | pure client-side over the selected set; URL is any npub; arbitrary keys | unit/browser | both |

## RED confirmation (2026-06-03, before implementation)

- **Unit:** `grantless.browse.test.ts` fails — `filterTasks`/`sortTasks` are not functions yet.
- **Browser:** the four specs fail — no funding bar on cards, concluded shown by default, no "needs a worker" switch, and `/c/:npub` is an unknown route (NotFound).

Goes GREEN once Implementation adds `filterTasks`/`sortTasks`, `useGoalsProgress`, the funding bar in `NomineeProjectItem`, `BrowseControls`, the `CuratorBrowser` wiring, and the `/c/:npub` route.

## How to run

```
npm test               # unit
npm run test:browser   # funding cards, filters, sorts, /c/:npub (NixOS: set PLAYWRIGHT_CHROMIUM_PATH)
```
