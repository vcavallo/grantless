# Review: Story 14 — Contributor visibility + honest profile loading

**Date:** 2026-06-05
**Reviewer:** Reviewer (Phase 5)
**Story:** `.pi/engineering-team/stories/14-contributor-visibility.md`
**ADR:** `.pi/engineering-team/decisions/0013-contributor-visibility.md`
**Test plan:** `.pi/engineering-team/stories/14-contributor-visibility.test-plan.md`
**Diff reviewed:** `07317e8~1..HEAD` (failing tests `07317e8`, impl `d0a01a3`)

## Verdict: **PASS**

Composes existing data cleanly (one new pure aggregator, two reusable honest-loading primitives, a
page + hook that reuse the batched progress query). Meets all three AC groups, honors the prime
directive, and all runnable gates are green.

## Gates (run by the reviewer)

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | **exit 0** |
| `npx eslint` | **exit 0** (no errors/warnings) |
| `npx vitest run` | **96 passed** (16 files); +4 from `grantless.contributors.test.ts` |
| `npx vite build` | **exit 0** |
| `npx playwright test --list` | 26 specs collect (incl. the 3 new); **not executable** in sandbox (no chromium) |

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| A: contributors aggregated per sender, ranked | ✅ | `progress.contributors` (already per-sender) + `ContributorList` sorts desc; `aggregateContributors` unit-tested. |
| A: avatar stack + expand → name/amount/copyable npub | ✅ | `ContributorList.tsx` — overlapping `AuthorAvatar` stack + "N contributors" button → rows with `AuthorName`, `formatSats`, `CopyNpubButton`. Wired into `CrowdfundSection` (count text removed). e2e by inspection. |
| B: honest loading (no fake name while loading) | ✅ | `AuthorName`/`AuthorAvatar` gate on `author.isLoading && !author.data` → `Skeleton`; `genUserName` only after resolve-with-no-name. |
| B: curator picker no fake name mid-load | ✅ | `CuratorBrowser.curatorLabel` returns `''` (→ short-npub shown) while `curatorProfilesLoading && !curatorProfiles`; `genUserName` only post-resolve. |
| C: curator-wide aggregate, ranked | ✅ | `useCuratorContributors` → `aggregateContributors([...progressByGoal.values()])`; page renders ranked rows with rank #. |
| C: shareable URL + reachable | ✅ | route `/c/:npub/contributors` (`AppRouter`); "View contributors" link in `CuratorBrowser` when a curator is selected. |
| C: empty + loading states | ✅ | `CuratorContributors.tsx` — skeletons while `isLoading`, empty-state card when none, invalid-npub guard. |

## ADR conformance

Matches ADR 0013 Option A exactly: pure `aggregateContributors`; generic `AuthorName`/`AuthorAvatar`;
`ContributorList`; `useCuratorContributors` **reuses the single batched `useGoalsProgress`** query
(`useCuratorContributors.ts:41`) — the N+1 concern (open question #2) is genuinely avoided; targeted
picker honesty fix. No deviations.

## Openness / permissionlessness

- **No privileged actor.** Contributors/amounts/ranking derive entirely from **public zap receipts**;
  ranking is mechanical (`sort by totalSats desc`). No pubkey/curator/relay special-cased.
- **No hardcoded defaults** introduced (grep clean); everything reads the existing overridable relay
  set via `useGoalsProgress`/`useAuthor`.
- **Fork test:** ✅ any curator, any relay — identical behavior. npubs shown are public.
- **Signing/nsec:** N/A — entirely read-side; no publishing, no signer use.

## Regression check

The new contributor expand button (`/contributor/i`) lives only in `CrowdfundSection` (task-detail),
**not** on the browse index, so `assign-arbiter.spec`'s "no management control on the index" assertion
(anchored `/^(assign|change|mark funded|mark submitted|conclude)$/i`) is unaffected. All 26 browser
specs collect. `browse`/`curator-browse` specs: the picker still renders names once resolved and the
added "View contributors" link is additive.

## Findings (all non-blocking)

1. **Playwright not executed here** (no chromium). The 3 new specs are sound by inspection (seeded
   funders carry their pubkey in the receipt `description`, so `parseZapReceiptSender` attributes them
   and the lists/page populate). Run with a working chromium before relying on them in CI.
2. **Per-row `useAuthor` on the curator page** issues one (cached/deduped) profile query per
   contributor — fine, and the ADR already notes batch-optimization (via `useNomineeProfiles`) as a
   future improvement.
3. **Tie ordering** in `aggregateContributors` is stable (insertion order) for equal totals — cosmetic;
   the unit test only asserts set-membership on ties.
4. **Honest-loading scope** is the new contributor UIs + the curator picker, not an exhaustive sweep
   of every `genUserName` call (`NomineeCard` etc. still use the old pattern) — explicitly out of scope
   per the ADR/story. `AuthorName`/`AuthorAvatar` are now available to adopt elsewhere later.

None block the story.

## Linked artifacts
- Story / ADR / Test plan as above
- Implementation: `d0a01a3`; failing tests: `07317e8`
