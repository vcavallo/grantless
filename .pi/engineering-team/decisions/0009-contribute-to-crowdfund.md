# ADR 0009: Contribute to a crowdfund — open a goal, contribute (mocked), show progress

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/7-contribute-to-crowdfund.md`

## Context

Story 7 adds the NIP-75 crowdfund: open a task's **kind-9041 zap goal**, let anyone **contribute** (mocked), and **show funding progress**. Story 5 creates the 33401 with no goal; Story 6 attaches the arbiter; Story 6.5 lets the patron flip to `funded`. Story 7 makes that flip backed by (mocked) contributions.

**Reuse surface (verified in `src/lib/catallax.ts` / hooks):**
- `buildGoalEventTags(task, patron, arbiter, relays)` → the 9041 tags: `amount` (target msats), `summary`, `a` (task coord), `zap` (arbiter = escrow recipient), `relays`, `alt`.
- `calculateGoalProgress(goal, receipts): GoalProgress` → `{ targetSats, raisedSats, percentComplete, isGoalMet, contributors }`. Reads target msats→sats; sums receipt amounts (via `parseZapReceiptAmount`, which reads the `description` zap-request's `amount` msats) →sats; aggregates contributors by `parseZapReceiptSender`.
- `buildMockZapReceiptTemplate({ senderPubkey, recipient, amountSats, referencedId })` (Story 6.5) → a kind-9735 with `['e', referencedId]`, `['p', recipient]`, and a `description` carrying `amount = sats*1000` — exactly the shape `parseZapReceiptAmount`/`Sender` expect.
- `useZapGoal(goalId)` → fetches the 9041 by id, then **queries the goal's `relays` tag** (raw WebSocket) for `{kinds:[9735], '#e':[goalId]}` receipts, and returns `progress`. So a goal whose `relays` tag is the configured relay yields progress from receipts on that relay (the dev CSP already allows `ws:`).
- `buildTaskProposalTemplate`/`taskProposalToInput` (Story 5/6) emit a `goal` tag when `goalId` is set, and `latestAuthoritativeTask`/the detail query (Story 6.5) keep the latest version — so the goal link survives later transitions.
- `TaskDetail` already renders a legacy "Crowdfunding Progress" block (`GoalProgressBar` + `CrowdfundButton`, gated on `task.goalId`) wired to **real Lightning** — to be replaced.

**Constraints (`.pi/AGENTS.md`):** permissionless contribution (any logged-in pubkey); escrow goes to the task's **chosen arbiter** (no privileged escrow agent); payments **mocked** (no real Lightning); progress derived from public receipts (not a trusted tally); configured/overridable relay; lib/hook/component seam; no mocked-`useNostr` tests.

## Options considered

### Option A — Pure `buildZapGoalTemplate` + a Grantless `CrowdfundSection` (open / contribute / progress) replacing the legacy block; reuse progress math + `useZapGoal` *(chosen)*
Add a pure `buildZapGoalTemplate` (wraps `buildGoalEventTags`). One `CrowdfundSection` on `TaskDetail`: when there's no goal, a patron "Open for funding" action (publish 9041 with the configured relay in its `relays` tag, then re-publish the 33401 with the `goal` tag); when there's a goal, a progress display (`useZapGoal` → raised/target/%, contributor count) + a "Contribute" form (any logged-in user → mocked 9735 to the goal). Replace `TaskDetail`'s legacy `GoalProgressBar`/`CrowdfundButton` block.
- **Pros:** maximal reuse (goal tags, progress math, `useZapGoal`, the Story-6.5 mock receipt); one Grantless funding surface, mocked and goal-`relays`-correct so `useZapGoal` finds receipts on the local relay; permissionless contribution; pure builder + progress math are unit/e2e testable, UI gets Playwright coverage; honors the prime directive (escrow = chosen arbiter, public-receipt tally).
- **Cons:** removes the real-Lightning `CrowdfundButton`/`GoalProgressBar` from the detail page (real zaps deferred project-wide anyway); a 9735 publish needs manual `['zap-goal']` invalidation (the publish hook only auto-invalidates for 9041/33401/33400/3402).

### Option B — Keep the legacy `GoalProgressBar`/`CrowdfundButton` and just add goal creation
- **Cons:** `CrowdfundButton` drives real Lightning and `GoalProgressBar` carries payment-waiting coupling; doesn't fit the mocked Grantless flow and would mix two funding UIs. **Rejected.**

### Option C — Auto-create the goal at task creation (Story 5)
- **Cons:** no arbiter exists at creation (escrow recipient unknown); Story 5 deliberately deferred it. **Rejected** — create the goal on "open for funding", after the arbiter.

## Decision

**Option A.** Pure `buildZapGoalTemplate`; a Grantless `CrowdfundSection` (open-for-funding / contribute / progress) replacing the legacy crowdfunding block on `TaskDetail`; reuse `calculateGoalProgress`, `useZapGoal`, and the Story-6.5 mock receipt. Mocked contributions; escrow directed to the task's arbiter.

## Consequences

- **Completes the core loop's funding step:** a task can be opened for funding, funded by the community (mocked), and then marked `funded` (Story 6.5) — now backed by contributions.
- **No new event kinds; `NIP.md` unchanged.** Reuses 9041/9735 exactly as the seed/harness model them.
- **No new deps.** The contribute action manually invalidates `['zap-goal', goalId]` to refresh progress (the publish hook lacks a 9735 branch).
- **Goal `relays` tag = the configured relay**, so `useZapGoal`'s direct-WebSocket receipt query hits the right relay (and the dev CSP already allows `ws:`).
- Legacy `GoalProgressBar`/`CrowdfundButton`/`ContributorsList` become unused on `TaskDetail` (retained in-repo; retire with the rest of the legacy real-Lightning UI later).
- Real Lightning, refunds/splits, and goal editing remain deferred.

## Implementation notes

- **`src/lib/catallax.ts`**: `buildZapGoalTemplate(task: { title; description; amount; d }, patronPubkey, arbiterPubkey, relays: string[]): { kind: 9041; content: string; tags: string[][] }` — `content = \`Crowdfunding goal for: ${title}\``, `tags = buildGoalEventTags(task, patronPubkey, arbiterPubkey, relays)`. Pure.
- **`src/components/grantless/CrowdfundSection.tsx`** (new): props `{ task: TaskProposal; onUpdate?: () => void }`.
  - `useAppContext` → `getActiveRelays` (relays for the goal + display); `useCurrentUser`; `useNostrPublish`; `useToast`; `useQueryClient`; `useZapGoal(task.goalId)`.
  - Render only for `task.fundingType === 'crowdfunding'`.
  - **No goal yet:** if `isPatron && task.arbiterPubkey && task.status === 'proposed'` → "Open for funding" button → `publishEvent(buildZapGoalTemplate(task, patron, arbiter, relays))` → `goalId`; then `publishEvent(buildTaskProposalTemplate({ ...taskProposalToInput(task), goalId }))` (patron-signed); `onUpdate()`. If no arbiter → hint "assign an arbiter first"; otherwise nothing (non-patron).
  - **Goal exists:** show `progress` (raised/target sats, a percentage bar via shadcn `Progress`, contributor count, "goal reached" when `isGoalMet`); a "Contribute" form — amount (sats, positive int) + button — for any logged-in user → `publishEvent(buildMockZapReceiptTemplate({ senderPubkey: user.pubkey, recipient: task.arbiterPubkey!, amountSats, referencedId: task.goalId! }))`; then `queryClient.invalidateQueries({ queryKey: ['zap-goal', task.goalId] })`; toast.
- **`src/pages/TaskDetail.tsx`**: replace the `task.fundingType === 'crowdfunding' && task.goalId` `GoalProgressBar`/`CrowdfundButton` block with `<CrowdfundSection task={task} onUpdate={refetch} />` (shown for crowdfunding tasks; it branches internally on goal presence). Remove now-unused imports/state (`GoalProgressBar`, `CrowdfundButton`, `ContributorsList`, `waitingForPayment`).

### Tests the Tester will write
- **Unit (`npm test`):** `catallax.goal.test.ts` — `buildZapGoalTemplate` (kind 9041, `amount` = sats*1000 msats, `zap` = arbiter, `a` = coord, `relays`); `calculateGoalProgress` over a constructed goal + mocked receipts (target/raised/percent/isGoalMet, contributor aggregation across multiple receipts, ignore zero/invalid); the goal-link round-trip (`buildTaskProposalTemplate({ ...taskProposalToInput(task), goalId })` → `parseTaskProposal` → `goalId` set, status preserved).
- **Real-event e2e (`npm run test:e2e`):** `crowdfund.e2e.test.ts` — publish a proposed task (with arbiter) + a 9041 via `buildZapGoalTemplate`; re-publish the task with the `goal` tag; publish several mocked 9735 contributions (via `buildMockZapReceiptTemplate`, `e` = goal id) from different funders; query the goal + receipts and assert `calculateGoalProgress` yields the right `raisedSats`/`percentComplete`/`isGoalMet`/contributor count; assert the task's latest version carries the `goal` tag.
- **Browser (`npm run test:browser`):** `crowdfund.spec.ts` — as the patron, "Open for funding" on a seeded proposed task (with arbiter) → a progress display appears; as a funder, contribute an amount → raised increases / progress advances. Role/relay via the seed + helpers.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. Anyone logged in may contribute; escrow is directed to the task's chosen arbiter (the patron's decision); no special pubkey/relay. ✅ no.
- **Trust WoT-derived?** Progress is computed from public zap receipts, not a trusted server tally. ✅ yes.
- **Hardcoded defaults?** None new; the goal's `relays` come from the configured/overridable set; mocked receipts are dev stand-ins. ✅
- **nsec/signing:** contributors/patron sign their own 9041/9735/33401; no key exposed. ✅
- **Fork test:** anyone funds projects on their own relay identically. ✅ yes.

## Out of scope
- Real Lightning / LNURL; refunds + proportional splits; editing/closing/deleting a goal; multiple goals; enforcing goal-reached before "mark funded"; retiring the legacy `GoalProgressBar`/`CrowdfundButton`/`ContributorsList`.
