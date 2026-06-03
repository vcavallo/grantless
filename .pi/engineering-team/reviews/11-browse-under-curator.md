# Review: Story 11 — Browse under a Curator

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-03
**Diff:** `git diff 12f6fbf..HEAD` (17 files, +605/-29)

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean).
- [x] `npx eslint` — **PASS** (exit 0; 0 errors, the 2 pre-existing `*Filters.tsx` warnings only).
- [x] `npx vitest run` (unit) — **PASS** (13 files, 64 tests; +6 filter/sort tests).
- [x] `npx vite build` — **PASS**.
- [x] `npm run test:e2e` (nak) — **PASS** (7 files, 32 tests; unaffected by the harness title change).
- [x] `npm run test:browser` (Playwright) — **PASS** (19/19, incl. funding bar, hide-concluded, needs-a-worker, `/c/:npub`).

## Spec adherence

| AC | Evidence | Verdict |
|---|---|---|
| Funding shown on cards | `NomineeProjectItem` `FundingLine`; browser "a funding-state project card shows funding progress" | ✅ |
| Hide concluded (default on) | `controls.statuses` default excludes `concluded`; browser "concluded projects are hidden by default" (revealed by the chip) | ✅ |
| Filter by status | `filterTasks` status (unit); status chips | ✅ |
| Sorts (newest/funding/amount) | `sortTasks` (3 unit cases) | ✅ |
| Seeking-funding filter | `filterTasks` seekingFunding (unit) | ✅ |
| Needs-a-worker filter | `filterTasks` needsWorker (unit); browser "needs a worker filter narrows…" | ✅ |
| Hide empty applicants | `CuratorBrowser.applicantsToShow` | ✅ (manual/visual) |
| Shareable curator URL | `/c/:npub` route + `CuratorBrowser` (parsePubkey, navigate); browser "/c/:npub deep-links to a curator" | ✅ |
| No privileged actor (openness) | filters/sorts pure over the selected curator's set; URL is any npub; funding from public receipts; arbitrary keys | ✅ |

## ADR adherence

- Matches ADR 0010: pure `filterTasks`/`sortTasks`; batched `useGoalsProgress` (one pooled query → deterministic funding sort + card bars); funding bar in `NomineeProjectItem`; `BrowseControls`; `/c/:npub` reusing `parsePubkey`; status filter defaults `concluded`-off.
- No new event kinds; `NIP.md` unchanged. No new deps. The curator URL carries only an npub.
- Hooks ordering correct: `useGoalsProgress`/`useState`/derived memos run before the early returns.

## Things tests can't catch — incl. a real seed bug found

- **Seed title bug fixed:** every seeded project previously rendered as **"Test Task"** because `seedProject` published via the harness `publishTask`, which hard-coded `content.title`. The browser tests surfaced it; the fix threads real `title`/`description` through `publishTask` (optional, default unchanged) so seeded projects have distinct names — better for the demo *and* testable. nak e2e unaffected (those assert by `d`-tag).
- **Funding-progress sort is deterministic** because progress is fetched in one batch up front (not per-card), as designed.
- **Openness:** the `/c/:npub` URL is a pointer to any npub (no privilege); an invalid npub → `parsePubkey` null → falls back to the picker (no crash). Funding is a derived tally of public receipts.
- No secrets/debug logging/placeholder comments. Read-only browse (no signing here).

## House rules check

- [x] **Open / permissionless / WoT:** all client-side shaping of the selected curator's set; URL is any npub; nothing special-cased.
- [x] **Bootstrapping defaults only:** configured/overridable relay; no new privileged default.
- [x] **Fork test:** anyone shares their curators' `/c/:npub` against their own relay identically.

## Findings

### Blocking
None.

### Non-blocking
1. **`useGoalsProgress` batches over the visible goal set** via the pool; for very large curator sets this is one bounded query — fine for now (same scale note as the other 30392/task queries).
2. **Date-based sorts (submitted/completed)** and **text search** are deferred (need extra reads / dropped from v1), per the story.
3. **Filters/sorts are not in the URL** (only the curator is) — a deliberate v1 scope; encoding them is a later nicety.
4. **Hide-empty-applicants** has no dedicated automated assertion (visual/manual); the other toggles/filters are covered.

## Verdict
**PASS** — the diff matches the story, ADR 0010, and the test plan; all six gate tiers are clean (unit 64, nak e2e 32, Playwright 19). The browse now shows funding at a glance, filters/sorts (incl. funding-progress) work over the curator's set, concluded is hidden by default, and a curator's view is shareable at `/c/:npub` — all client-side and prime-directive-aligned. The browser tier also caught and fixed a real seed bug (all projects titled "Test Task"). Mergeable as-is.
