# ADR 0006: Assign an arbiter — reuse the resolver + builder, add a task→input reconstructor

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/6-assent-to-arbitrate.md`

## Context

Story 6: the patron attaches a **curator-vouched arbiter** to their `proposed` 33401. Per `NIP.md:22` there is **no assent event** — the patron coordinates out-of-band and then **re-publishes the task** with the arbiter's `p` + `a` tags. The task stays `proposed`. The app surfaces the arbiter (house rule: surface trust-relevant relationships), never enforces.

**Existing assets (verified):**
- `src/lib/grantless.ts` — `resolveCuratorApplicants(events, curator, slug = GRANTLESS_APPLICANTS_SLUG)` is **already slug-parameterized**; passing `'grantless-arbiter'` resolves the arbiter list via the same `observer`/`source-tag` chain (latest-wins, signer-independent). `applicantCurationLists(events, slug)` / `applicantsForCurator` likewise. (`'grantless-arbiter'` is used as a string literal in the seed but has **no constant** yet.)
- `src/lib/catallax.ts` — `buildTaskProposalTemplate(input)` **already emits** the arbiter `p` (second) + `a` tags and preserves positional `p` ordering (Story 5). `parseTaskProposal` reads patron/arbiter/worker positionally; `ArbiterAnnouncement` carries `arbiterPubkey` (its `p`) + `d`. No `TaskProposal → TaskProposalInput` reconstructor exists yet (needed to re-publish an existing task with a change).
- `src/hooks/useCatallax.ts` — `useArbiterAnnouncements()` returns parsed 33400s (deduped latest per `pubkey:d`); `useTaskProposals` authorized-updater rule: an update is accepted only if signed by patron/arbiter/worker — so the **patron** signs the arbiter assignment.
- `src/hooks/useApplicantCurationLists.ts` — queries `{kinds:[30392], limit:500}` on the configured relays (Story 4). Story-4 `CuratorBrowser` → `NomineeGrid` → `NomineeCard` → `NomineeProjectItem` renders projects; `NomineeProjectItem` is a single `<Link>` to the task detail (no room for an inline control).
- `useNostrPublish` (signs + publishes, invalidates `['catallax']`), `useCurrentUser`, `useAuthor`, shadcn `Select`, `useToast`, `genUserName`, Story-3 seed (`grantless-arbiter` → Dave/Erin with 33400s).

**Constraints (`.pi/AGENTS.md`, `NIP.md`):** no new event kinds (use existing; `NIP.md:22` keeps assent out-of-band); the patron's own choice, only *filtered* by the curator's list (no privilege); resolve by `observer`/`source-tag`, never by signer; surface (don't hide) arbiter==patron; explicit signing; configured/overridable relay; lib/hook/component seam; no mocked-`useNostr` tests (real events; UI manual).

## Options considered

### Option A — Reuse the slug-parameterized resolver + builder; add a pure `taskProposalToInput`; surface + assign in `NomineeProjectItem` *(chosen)*
Add `GRANTLESS_ARBITER_SLUG` and a pure `selectArbiterCandidates(memberPubkeys, announcements)` to `grantless.ts`; add a pure `taskProposalToInput(task)` to `catallax.ts` so an existing task can be re-published with a change (`buildTaskProposalTemplate({ ...taskProposalToInput(task), arbiterPubkey, arbiterService })`). A `useCuratorArbiterCandidates(curatorPubkey)` hook resolves the curator's `grantless-arbiter` members ∩ their 33400s. Restructure `NomineeProjectItem` so the title/status stays a link but an arbiter line + a patron-only `AssignArbiterControl` sit outside it; thread `curatorPubkey` from `CuratorBrowser` down.
- **Pros:** maximal reuse (resolver + builder already do the hard parts); `taskProposalToInput` is the reusable re-publish primitive **every** later status-transition story (8–10) needs, not a one-off; honors NIP (no assent kind), the prime directive (curator only filters; resolve by observer), and surfacing; pure core is unit + e2e testable.
- **Cons:** a second `{kinds:[30392]}` query (the arbiter hook) alongside Story 4's applicants query — minor, dev-scale (bounded by `limit`; same note as Story 4); some prop-drilling of `curatorPubkey`.

### Option B — Reuse the legacy `/catallax` `FilteredArbiterSelect` + `TaskProposalForm`
- **Pros:** an arbiter dropdown exists.
- **Cons:** it filters by GrapeRank PoV, not the Grantless `grantless-arbiter` curation chain; it's wired to full task *creation*, not editing an existing task's arbiter; pulling it in drags GrapeRank coupling and the goal-creation path (Story 7). **Rejected** — wrong filter + wrong scope.

### Option C — Introduce an in-app arbiter "assent" event/kind
- **Cons:** `NIP.md:22` puts assent out-of-band; a new kind breaks interoperability and the "prefer existing kinds" rule. **Rejected** (flagged in the story for the user's veto; would be a separate story + NIP change).

## Decision

**Option A.** Reuse the slug-parameterized resolver and the 33401 builder; add the pure `taskProposalToInput` re-publish primitive and `selectArbiterCandidates`; resolve candidates with a small hook; surface the arbiter and offer a patron-only assign control in `NomineeProjectItem`. No assent kind — assent stays out-of-band and surfaced.

## Consequences

- **Enables** funding (Story 7): a task now carries an arbiter (escrow recipient) so a 9041 goal can target it.
- **`taskProposalToInput` is the re-publish primitive** Stories 8–10 (assign worker, mark submitted, conclude) reuse to mutate one field and re-emit — avoids per-story tag duplication.
- **No new event kinds; `NIP.md` unchanged.** Assent remains out-of-band, surfaced not enforced.
- **No new dependencies.** Browse refreshes via the existing `['catallax']` invalidation after the re-publish.
- A second 30392 query (arbiter candidates) — minor; could later share one query with Story 4's applicants hook. Flagged, not done here.
- `NomineeProjectItem` gains an arbiter line + a patron-only control and now takes `curatorPubkey` (prop-drilled). Story-4 rendering is otherwise unchanged.

## Implementation notes

- **`src/lib/grantless.ts`**:
  - `export const GRANTLESS_ARBITER_SLUG = 'grantless-arbiter';`
  - `export interface ArbiterCandidate { pubkey: string; serviceD: string; serviceCoord: string; name?: string; }`
  - `export function selectArbiterCandidates(memberPubkeys: string[], announcements: ArbiterAnnouncement[]): ArbiterCandidate[]` — for each member pubkey that has ≥1 announcement (match on `announcement.arbiterPubkey`), pick the latest (`created_at`) and emit `{ pubkey, serviceD: a.d, serviceCoord: \`33400:${a.arbiterPubkey}:${a.d}\`, name: a.content.name }`, preserving `memberPubkeys` order; drop members with no announcement. Pure (import type `ArbiterAnnouncement` from `./catallax`).
- **`src/lib/catallax.ts`**:
  - `export function taskProposalToInput(task: TaskProposal): TaskProposalInput` — reconstruct the builder input from a parsed task: `{ d, patronPubkey, title/description/requirements/deadline from content, amount, status, fundingType, arbiterPubkey, arbiterService, workerPubkey, goalId, detailsUrl, categories }`. Pure; `buildTaskProposalTemplate(taskProposalToInput(task))` round-trips to an equivalent task.
- **`src/hooks/useCuratorArbiterCandidates.ts`** (new): given `curatorPubkey`, query `{kinds:[30392], limit:500}` on configured relays, `resolveCuratorApplicants(events, curatorPubkey, GRANTLESS_ARBITER_SLUG)` → member pubkeys; combine with `useArbiterAnnouncements()` via `selectArbiterCandidates`. Return `{ candidates: ArbiterCandidate[]; status; relays }`. (Disabled/empty when `curatorPubkey` is falsy.)
- **`src/components/grantless/AssignArbiterControl.tsx`** (new): props `{ task: TaskProposal; curatorPubkey: string }`. Renders only when `useCurrentUser().user?.pubkey === task.patronPubkey`. A `Select` of `useCuratorArbiterCandidates(curatorPubkey)` candidates (label = name ∥ `genUserName(pubkey)`), defaulting to the current `task.arbiterPubkey`; a confirm `Button` that builds `buildTaskProposalTemplate({ ...taskProposalToInput(task), arbiterPubkey: c.pubkey, arbiterService: c.serviceCoord })`, `publishEvent`s it, toasts, done. Disabled while pending or when no candidates (with a hint to pick a curator/relay).
- **`src/components/grantless/NomineeProjectItem.tsx`**: restructure to a container `div` — keep the title/status `<Link>`; below it, if `task.arbiterPubkey`, an **arbiter line** (`useAuthor(task.arbiterPubkey)` → name/`genUserName`, with a "proposer is also the arbiter" note when `arbiterPubkey === patronPubkey`); and `<AssignArbiterControl task curatorPubkey />` (it self-gates to the patron). Accept a new optional `curatorPubkey?: string` prop.
- **Thread `curatorPubkey`**: `CuratorBrowser` (has `selected`) → `NomineeGrid` (new `curatorPubkey` prop) → `NomineeCard` (new prop) → `NomineeProjectItem`.

### Tests the Tester will write (anticipated)
- **Unit (`npm test`):** `src/lib/grantless.arbiter.test.ts` — `selectArbiterCandidates` (member ∩ announcement, latest per member, order preserved, members without a 33400 dropped, `serviceCoord` shape) and `resolveCuratorApplicants(events, curator, GRANTLESS_ARBITER_SLUG)` resolving the arbiter list (signer-independent, latest-wins). `src/lib/catallax.taskProposalToInput.test.ts` — round-trip: `parseTaskProposal(eventFrom(buildTaskProposalTemplate(taskProposalToInput(task))))` preserves all fields; and assigning an arbiter to a proposed task yields `arbiterPubkey` as the 2nd `p`, the `a` coord, status still `proposed`, patron/amount/content preserved.
- **Real-event e2e (`npm run test:e2e`):** `test/e2e/assign-arbiter.e2e.test.ts` — publish a curator `grantless-arbiter` list (members = two arbiters) + their 33400s + a patron's `proposed` task; resolve candidates; build the assignment and publish it **patron-signed**; query the task `#d`, parse latest, assert arbiter `p[1]` + `a` coord + status `proposed`; re-assign to the other arbiter and assert latest-wins; assert `resolveCuratorApplicants(.., 'grantless-arbiter')` returns exactly the two arbiters and is signer-independent.
- **Manual (browser, dev seed):** as Alice browsing Cleo, open her project → assign Dave/Erin (Cleo's `grantless-arbiter`) → signer prompts → arbiter shown on the card; non-patron sees no control; re-assign works; arbiter==patron surfaces a note.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. The arbiter is the patron's choice; the curator's list only filters the *options* (no elevated status); resolution by `observer`/`source-tag`, never signer. ✅ no.
- **Trust WoT-derived?** Yes — out-of-band/social assent, surfaced not enforced; arbiter==patron is shown, the WoT judges. ✅ yes.
- **Hardcoded defaults?** None new; configured/overridable relay; `grantless-arbiter` is a slug, not a privilege. ✅
- **nsec/signing:** the patron signs their own task update via the signer; no key exposed. ✅
- **Fork test:** point at another curator/relay → that curator's arbiter options resolve identically. ✅ yes.

## Out of scope
- Any assent/acceptance event or kind (out-of-band per NIP); the 9041 goal + funding (Story 7); worker assignment + status transitions (Stories 8–10); arbiter fee/policy UI beyond identity; the arbiter's own 33400 onboarding (exists on `/catallax`); sharing one 30392 query between the applicants and arbiter hooks (later).
