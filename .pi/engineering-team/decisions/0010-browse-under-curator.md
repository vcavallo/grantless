# ADR 0010: Browse under a Curator — pure filter/sort, batch goal-progress, funding cards, `/c/:npub`

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/11-browse-under-curator.md`

## Context

Story 11 adds, to the Story-4 `CuratorBrowser`: funding-aware cards, status filter + semantic toggles (seeking-funding, needs-a-worker, hide-empty-applicants), sorts (newest / funding-progress / largest-goal), and a shareable `/c/:npub` curator URL.

**Existing shape:** `CuratorBrowser` resolves `applicants` for the selected curator and renders `NomineeGrid(pubkeys, tasksByPatron, profiles)` → `NomineeCard` → `NomineeProjectItem` (title + status badge, links to `/task/:naddr`). `tasksByPatron = groupTasksByPatron(useTaskProposals())`. The selected curator is in `useLocalStorage('grantless:lastCurator')`.

**Reuse:** `calculateGoalProgress(goal, receipts): GoalProgress` (Story 7); `parsePubkey(npub|hex)→hex` (Story 6.5) for the route param; `Progress`, `Switch`, `ToggleGroup` shadcn components; the router (`AppRouter.tsx`).

**Key design forces:**
- **Sorting by funding progress must be deterministic** → fetch funding for *all visible projects in one batch* (a `Map<goalId, GoalProgress>`), not a query per card. (The detail page's `useZapGoal` is single-goal/raw-WS; the index needs a batch over the pool.)
- Filtering/sorting is **client-side over the selected curator's resolved set** — pure, testable, no new protocol.
- The index is **applicant-grouped**, so filters/sorts apply to each applicant's project list; "hide empty applicants" drops cards left with nothing.
- **"Hide concluded" is the default state of the status filter** (the `concluded` chip is off by default) — one control satisfies both "filter by status" and "hide concluded by default" rather than two overlapping toggles.

**Constraints (`.pi/AGENTS.md`):** no privileged curator/relay; the URL is just an npub (any curator); funding from public receipts; configured/overridable relay; lib/hook/component seam; no mocked-`useNostr` tests (UI → Playwright).

## Options considered

### Option A — Pure `filterTasks`/`sortTasks` in `lib/grantless.ts` + a batch `useGoalsProgress` hook; controls in `CuratorBrowser`; funding bar in `NomineeProjectItem`; `/c/:npub` route *(chosen)*
Add pure `filterTasks`/`sortTasks` (over `TaskProposal[]` + a progress map). Add `useGoalsProgress(goalIds)` (one pooled query for the goals + their receipts → `Map<goalId, GoalProgress>`). `CuratorBrowser` holds filter/sort state, applies the pure helpers per applicant, drops empty applicants, and threads the progress map through `NomineeGrid`/`NomineeCard` to `NomineeProjectItem`, which renders a funding bar for funding-state projects. A `/c/:npub` route feeds the curator into `CuratorBrowser` (reusing `parsePubkey`); selecting a curator navigates there.
- **Pros:** filter/sort logic is pure + unit-testable; funding fetched once (deterministic sort, fewer queries); reuses `calculateGoalProgress`/`parsePubkey`/`Progress`; the card change is additive; the URL carries only an npub (no privilege). UI covered by Playwright.
- **Cons:** more controls UI; one extra batch query when a curator has goal'd projects (bounded by the visible set).

### Option B — Per-card `useZapGoal` for funding + sort by whatever's loaded
- **Cons:** N queries (one per goal'd card); funding-progress sort would be non-deterministic (depends on async load order). **Rejected.**

### Option C — Put filters/sorts in the URL too
- **Cons:** scope creep; the user chose curator-only in the URL, filters local. **Rejected** (noted as a later nicety).

## Decision

**Option A.** Pure `filterTasks`/`sortTasks`; a batched `useGoalsProgress`; controls in `CuratorBrowser`; funding bar in `NomineeProjectItem`; `/c/:npub` reusing `parsePubkey`. Status filter defaults `concluded`-off (= hide concluded by default).

## Consequences

- A useful, funder/worker-oriented browse; sorts and filters operate on the curator's set with no new protocol or privilege.
- **No new event kinds; `NIP.md` unchanged.** One added batch query for funding; reuses `calculateGoalProgress`.
- New route `/c/:npub`; `/` keeps the remembered-curator behavior. Selecting a curator updates the URL (shareable); an invalid npub degrades to the picker.
- `NomineeProjectItem`/`NomineeCard`/`NomineeGrid` gain an optional `progressByGoal` prop (additive).

## Implementation notes

- **`src/lib/grantless.ts`** (pure; import `GoalProgress`, `TaskStatus`, `TaskProposal` from `catallax`):
  - `export type TaskSort = 'newest' | 'funding' | 'amount';`
  - `export interface TaskFilter { statuses: TaskStatus[]; seekingFunding: boolean; needsWorker: boolean; }`
  - `filterTasks(tasks, filter, progressByGoal: Map<string, GoalProgress>): TaskProposal[]` — keep if `statuses.includes(status)`; AND if `seekingFunding` then `goalId && progressByGoal.get(goalId)` exists and `!isGoalMet`; AND if `needsWorker` then `status === 'funded' && !workerPubkey`.
  - `sortTasks(tasks, sort, progressByGoal): TaskProposal[]` — `newest`: `created_at` desc; `amount`: `parseInt(amount)` desc; `funding`: `percentComplete` desc (no goal/progress → treat as `-1`, sorts last), tiebreak `created_at` desc. Returns a new array.
- **`src/hooks/useGoalsProgress.ts`** (new): `useGoalsProgress(goalIds: string[]) → { progressByGoal: Map<string, GoalProgress>; isLoading }`. Query (pooled, configured relays) `[{ kinds:[9041], ids: goalIds }, { kinds:[9735], '#e': goalIds }]`; group receipts by their `e` tag; `calculateGoalProgress(goal, receiptsForGoal)` per goal → Map. `enabled: goalIds.length > 0`; keyed by sorted `goalIds` + relays.
- **`src/components/grantless/NomineeProjectItem.tsx`**: add optional `progress?: GoalProgress`. When `task.goalId && progress && task.status !== 'concluded'`, render a `Progress` bar + `"{raised}/{target} sats · N backers"` (alongside a compact status); `concluded` → de-emphasized; no goal → status badge as today. Keep the `/task/:naddr` link.
- **`src/components/grantless/NomineeGrid.tsx` / `NomineeCard.tsx`**: thread an optional `progressByGoal?: Map<string, GoalProgress>` down to `NomineeProjectItem` (look up `task.goalId`).
- **`src/components/grantless/BrowseControls.tsx`** (new, presentational): status `ToggleGroup` (multi: proposed/funded/in-progress/submitted/concluded), `Switch`es (Seeking funding, Needs a worker, Hide empty applicants), and a sort `Select` (Newest / Funding progress / Largest goal). Controlled via props from `CuratorBrowser`.
- **`src/components/grantless/CuratorBrowser.tsx`**:
  - State: `statuses` (default `['proposed','funded','in_progress','submitted']` — concluded off), `seekingFunding`, `needsWorker`, `hideEmpty`, `sort` (default `'newest'`).
  - `goalIds` = distinct `task.goalId` across the selected curator's applicants' tasks → `useGoalsProgress(goalIds)`.
  - Per applicant: `sortTasks(filterTasks(tasksByPatron.get(a) ?? [], filter, progressByGoal), sort, progressByGoal)` → a filtered `Map`; `applicantsToShow = hideEmpty ? applicants.filter(a => filtered.get(a)?.length) : applicants`.
  - Render `<BrowseControls …/>` (when a curator with applicants is selected) + `<NomineeGrid pubkeys={applicantsToShow} tasksByPatron={filtered} profiles progressByGoal />`.
  - **Curator URL:** accept `curatorNpub?: string` prop; `routeCurator = curatorNpub ? parsePubkey(curatorNpub) : null`; `selected = routeCurator ?? savedCurator`; selecting → `setSavedCurator(hex)` + `navigate('/c/' + nip19.npubEncode(hex))`. Persist a valid `routeCurator` to `lastCurator` (so `/` remembers).
- **`src/pages/GrantlessBrowse.tsx`**: `const { npub } = useParams(); <CuratorBrowser curatorNpub={npub} />`.
- **`src/AppRouter.tsx`**: `<Route path="/c/:npub" element={<GrantlessBrowse />} />`.

### Tests the Tester will write
- **Unit (`npm test`):** `grantless.browse.test.ts` — `filterTasks` (status filter, seeking-funding needs goal+unmet, needs-worker = funded+no-worker, combinations) and `sortTasks` (newest/amount/funding incl. no-goal-last) over constructed tasks + a progress map.
- **Browser (`npm run test:browser`):** `browse.spec.ts` — funding bar shows on a seeded funded project; hide-concluded default (a concluded project absent until its chip is enabled); a sort changes order; seeking-funding / needs-a-worker filters narrow the set; `/c/<Quinn npub>` deep-links to Quinn (her applicant set renders); selecting a curator updates the URL.
- (No new nak e2e — the logic is pure/unit-covered and funding queries are exercised by Story 7's e2e.)

## Openness / permissionlessness check (required)

- **Privileged actors?** None. Filters/sorts/cards shape the *selected curator's* set; the URL is any npub; no curator/relay special-cased. ✅ no.
- **Trust WoT-derived?** Funding is a derived tally of public receipts; the URL is a pointer, not a grant of status; unknown npub degrades to the picker. ✅ yes.
- **Hardcoded defaults?** None new; configured/overridable relay. ✅
- **Fork test:** anyone shares their curators' `/c/:npub` against their own relay identically. ✅ yes.

## Out of scope
- Date-based sorts (submitted/completed — need extra reads); text search; filters-in-URL; multi-curator union; real Lightning.
