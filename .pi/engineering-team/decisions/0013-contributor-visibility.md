# ADR 0013: Contributor visibility + honest profile loading

**Status:** Proposed
**Date:** 2026-06-05
**Story:** `.pi/engineering-team/stories/14-contributor-visibility.md`

## Context

Story 14 has three read-side parts: (A) show *who* contributed on a project's crowdfund, (B) stop
presenting fabricated `genUserName` placeholders as real names while profiles load, (C) a
curator-wide contributors leaderboard.

What already exists (so most of this is *compose existing pieces*, not new infra):

- **Contributor data is ready.** `calculateGoalProgress` (`catallax.ts:632`) returns
  `progress.contributors: { pubkey, amountSats, … }[]`, **aggregated per sender** via
  `parseZapReceiptSender` (`catallax.ts:619`), which reads the contributor from the receipt's embedded
  zap-request `description`. This is NIP-57-correct (real) **and** matches the seed's mock receipts —
  same code attributes both (story open-question #1, resolved).
- **Batch fetch is ready.** `useGoalsProgress(goalIds)` (`src/hooks/useGoalsProgress.ts`) fetches all
  goals + their receipts in **one pooled query** (`{kinds:[9041],ids}` + `{kinds:[9735],'#e':ids}`)
  and returns `Map<goalId, GoalProgress>`. The curator browse already computes the curator's full
  `goalIds` list (`CuratorBrowser.tsx` `goalIds` memo). So the curator-wide aggregation is **one
  query**, not N — open-question #2 dissolves by reuse.
- **Copy npub is ready.** `CopyNpubButton` (`src/components/CopyNpubButton.tsx`).
- **The loading bug.** `useAuthor` (`src/hooks/useAuthor.ts`) is a `useQuery` exposing `isLoading`.
  Callers do `metadata?.name ?? genUserName(pubkey)` — which shows the fake name **during loading**
  (the curator picker uses the batch `useNomineeProfiles` map the same way: `?.name ?? genUserName`).
  The fix is simply to branch on *loading* vs *resolved-without-name*.

Constraints (`.pi/AGENTS.md`): separation (UI/protocol/data), reuse over re-implement, keep it
forkable, all data from public events.

## Options considered

### Option A — Shared honest-loading primitives + reuse the batch hook + a pure aggregator
Introduce two tiny generic components — `AuthorAvatar` and `AuthorName` — that wrap `useAuthor` and
render a **skeleton while loading**, the real value when resolved, and a generated fallback only
*after* resolution. Build the contributor UIs from them + `CopyNpubButton`. For the curator-wide page,
reuse `useGoalsProgress` over the curator's goalIds and a **pure** `aggregateContributors` for the
ranking. Fix the curator picker's loading honesty directly (it's a `Select`, not a per-row render).

- **Pros:** one honest-loading primitive reused everywhere (clean for a reference client); curator
  page is mostly existing hooks + a pure, testable aggregator; minimal new query code.
- **Cons:** a few new small components; per-row `useAuthor` on a large leaderboard issues many
  (cached, deduped) profile queries — acceptable, and batch-optimizable later.

### Option B — Fix the three spots inline, no shared primitives
- **Pros:** least new files.
- **Cons:** duplicates the loading-vs-resolved logic in every spot; the next contributor list repeats
  it. Worse for a reference impl. Rejected.

### Option C — Build a global profile prefetch/cache layer to kill loading flicker everywhere
- **Pros:** addresses loading at the root.
- **Cons:** the story explicitly scopes out a caching overhaul; this is large and risky for a polish
  story. The honest-loading *symptom* fix is what's asked. Rejected (note as a possible future story).

## Decision

**Option A.** It composes the data that already exists, isolates the one genuinely-new computation
(cross-goal aggregation) as a pure function, and makes "honest loading" a reusable primitive rather
than a one-off — fitting the reference-client ethos.

**Resolved open questions:**

1. Attribution → already correct via `parseZapReceiptSender`; real + seed share the path; **testable
   locally against the seed** (the contributor lists populate from seeded funders).
2. Aggregation cost → **reuse `useGoalsProgress`** (one pooled query for all the curator's goals +
   receipts); show its `isLoading` as a skeleton. No N+1.
3. Placement → a **"Contributors" link** in the curator browse (near the picker/header), plus the
   shareable route below.

## Consequences

- **Enables:** funder recognition per project + a curator leaderboard; an honest loading treatment
  reusable anywhere a profile renders; a pure aggregator reusable by the future "my funding activity"
  page.
- **Constrains / follow-ups:** per-row `useAuthor` on a big leaderboard is fine but not batch-optimal
  (future: batch via `useNomineeProfiles`). The honest-loading primitives are applied at the
  high-visibility spots (curator picker, contributor lists, nominee-card name) — not an exhaustive
  sweep of every `genUserName` call (out of scope; note it).
- A large curator world means a long goalIds filter in one query; acceptable, and bounded by the
  existing `useGoalsProgress` timeout.

## Openness / permissionlessness check (required)

- **Privileged actor?** **No.** Contributors, amounts, and ranking come entirely from **public zap
  receipts**; ranking is mechanical (sum of sats). No pubkey/curator/relay is special-cased; the list
  confers no trust, it reflects public zaps.
- **Trust from WoT, not client?** Yes — unchanged; this is display of public data.
- **Hardcoded defaults?** None. Everything reads the existing overridable relay set.
- **Fork test:** Yes — any curator, any relay, identical behavior. npubs shown are public.

## Implementation notes

**Generic honest-loading primitives (Group B core):**
- `src/components/AuthorName.tsx` — `<AuthorName pubkey className? />`: `useAuthor(pubkey)`; while
  `isLoading && !data` render a text `<Skeleton>`; resolved-with-name → the name; resolved-without →
  `genUserName(pubkey)`.
- `src/components/AuthorAvatar.tsx` — `<AuthorAvatar pubkey className? />`: same loading discipline;
  `Skeleton` (rounded) while loading; `AvatarImage(picture)` / initial fallback when resolved.

**Group A — per-project contributors (`CrowdfundSection`):**
- `src/components/grantless/ContributorList.tsx` — props `{ contributors: {pubkey:string; amountSats:number}[] }`.
  Collapsed: a horizontal **overlapping avatar stack** (`AuthorAvatar`, e.g. first ~8 with `-space-x-2`)
  + "N contributors", as a button that **expands** to rows: `AuthorAvatar` + `AuthorName` +
  `formatSats(total)` + `CopyNpubButton`. Sort by `amountSats` desc. Empty → render nothing (the
  caller already gates on contributions).
- `CrowdfundSection.tsx`: replace the `{progress.contributors.length} contributor…` text (~line 108)
  with `<ContributorList contributors={progress.contributors} />`.

**Group C — curator-wide contributors page:**
- `src/lib/grantless.ts` — pure `aggregateContributors(progresses: GoalProgress[]): { pubkey:string;
  totalSats:number }[]` — sum `amountSats` per `pubkey` across all goals, sort desc. Unit-tested.
- `src/hooks/useCuratorContributors.ts` (new) — given `curatorPubkey`: resolve applicants
  (`useApplicantCurationLists` + `applicantsForCurator`), their tasks (`useTaskProposals` +
  `groupTasksByPatron`), collect `goalIds`, feed `useGoalsProgress`, return
  `{ contributors: aggregateContributors([...progressByGoal.values()]), isLoading }`. (Mirrors the
  plumbing already in `CuratorBrowser`; isolates Group C so `CuratorBrowser` stays as-is.)
- `src/pages/CuratorContributors.tsx` (new) — route `/c/:npub/contributors`. Decode npub
  (`parsePubkey`), header with the curator (`AuthorName`/`AuthorAvatar`), ranked rows (rank # +
  `AuthorAvatar` + `AuthorName` + `formatSats(totalSats)` + `CopyNpubButton`), skeleton while
  `isLoading`, empty state when none, a back link to the browse.
- `src/AppRouter.tsx` — add `<Route path="/c/:npub/contributors" element={<CuratorContributors/>} />`
  above the catch-all.
- `src/components/grantless/CuratorBrowser.tsx` — add a **"Contributors"** link (to
  `/c/${npubEncode(selected)}/contributors`) near the picker row, shown when a curator is selected.

**Group B — curator picker honesty (targeted):** in `CuratorBrowser`, expose `isLoading` from
`useNomineeProfiles` and stop using `genUserName` *while loading*: render the curator option/label as
the real name when resolved, else the short-npub (already shown) — never a fabricated name mid-load.
(The dropdown is a `Select`; a per-option skeleton is awkward, so honest fallback = the real
short-npub, with `genUserName` only acceptable post-resolution.)

**Tests (for the Tester):**
- Unit: `aggregateContributors` — sums per pubkey across goals, ranks desc, handles empty.
- Real-event e2e (seed): the curator-wide contributors resolve to the seeded funders with correct
  summed totals (the seed's mock receipts carry the sender in `description`).
- Playwright: a project's crowdfund shows an avatar stack that expands to names + amounts + a copy
  control; the `/c/:npub/contributors` page lists ranked contributors; (loading honesty is hard to
  assert deterministically — cover by inspection / a unit on the name-resolution branch if cheap).

## Out of scope

- Per-project breakdown on the curator page; gamification; opt-out/privacy hiding; a global
  profile-cache layer; batch-optimizing per-row profile fetches (future).
