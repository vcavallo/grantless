# ADR 0008: Role-based task management on the detail page

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/6.5-task-management-detail-page.md`

## Context

Story 6.5 wants every lifecycle action (`proposed → funded → in_progress → submitted → concluded`) drivable from `/task/:naddr`, gated to the acting role (patron/arbiter/worker), with mocked payouts.

**Key discovery:** `TaskDetail` already renders the legacy `TaskManagement` (`TaskDetail.tsx:514`, `realZapsEnabled={true}`) — a 1203-line component that *does* implement the lifecycle, but:
- its "Mark as Funded" only shows for a crowdfunding task that has a `goalId` **and** a goal-reached state (`TaskManagement.tsx:763`); Grantless tasks (Story 5) are crowdfunding **without** a goal (that's Story 7), so the patron is stuck at `proposed` and never reaches assign-worker/submit/conclude;
- it's wired to **real Lightning** (fund dialog, real-zap payout/refund, contributor splits) — which doesn't fit Grantless's mocked, local-relay flow.

So the legacy component is effectively unusable for the Grantless loop. The protocol mechanics needed are simple and already half-built here:
- **Status transitions** = re-publish the replaceable 33401 with a new `status` (+ worker `p`). The Story-6 primitive `taskProposalToInput(task)` + `buildTaskProposalTemplate(...)` does exactly this; the authorized-updater rule (`useCatallax.ts`) accepts an update only from the patron/arbiter/worker — i.e. **the acting role signs**.
- **Conclusion** = a kind-3402 (`parseTaskConclusion` exists; no *builder* yet) with `resolution` + payout/refund `e` + the task `a`-coord/id, then the 33401 flips to `concluded`. Payout/refund is **mocked** (a kind-9735 the arbiter signs), matching the seed/nak harness.

**Existing assets:** `taskProposalToInput`, `buildTaskProposalTemplate` (Story 5/6); `AssignArbiterControl` + `useCuratorArbiterCandidates` (Story 6, on the detail page since 2.5); `useNostrPublish` (retry-once); `useCurrentUser`; `useLocalStorage('grantless:lastCurator')`; shadcn `Select`/`Button`/`Input`; the seed (tasks at every status + actors); `ROSTER` for tests; Playwright harness (Story 2.5). `parseTaskConclusion`, `TaskStatus`, `ResolutionType` in `catallax.ts`.

**Constraints (`.pi/AGENTS.md`):** no privileged actor — permission is the protocol authorized-updater rule, never a client allowlist; surface (don't block) risky role overlaps; explicit signing; configured/overridable relay; mocked payments (no real Lightning); reuse the lib/hook/component seam; no mocked-`useNostr` tests.

## Options considered

### Option A — A focused Grantless `TaskLifecycleActions` component (mocked, role+status-gated) that replaces `TaskManagement` on `TaskDetail`; pure transition/conclusion builders in `catallax.ts` *(chosen)*
Add pure builders (`markTaskStatus`, `assignWorker`, `buildTaskConclusionTemplate`, `buildMockZapReceiptTemplate`) reusing `taskProposalToInput`. Build one `TaskLifecycleActions` component that, from the task + current user, renders exactly the valid action(s): assign/change arbiter (reuse `AssignArbiterControl`), mark funded, assign worker (self or other), mark submitted, conclude (resolution select → mocked receipt + 3402 + `concluded`). Mount it on `TaskDetail` **in place of** `<TaskManagement>` (and fold in the 2.5 "Manage arbiter" card); keep `TaskDetail`'s own crowdfunding *display* (`GoalProgressBar`/`ContributorsList`) untouched.
- **Pros:** a working mocked loop with no real-Lightning/goal dependency; one coherent role-gated action surface (no double UI); maximal reuse (`taskProposalToInput`, the builder, `AssignArbiterControl`); pure builders are unit + nak-e2e testable and the UI gets Playwright coverage; honors the prime directive (authorized-updater only).
- **Cons:** replaces the legacy real-Lightning management on the shared `/task/:naddr` (also reachable from `/catallax`); the legacy `TaskManagement` becomes unused (retained for reference, retire later) — consistent with how `Index`/`NomineeBrowser` were handled. Real-Lightning management is deferred project-wide anyway (everything is mocked now).

### Option B — Un-gate / adapt the legacy `TaskManagement` for the mocked flow
- **Cons:** 1203 lines coupled to real zaps, contributor splits, and goal-reached gating; bending it to mocked/goal-less Grantless is high-risk surgery on untested legacy code for little reuse. **Rejected.**

### Option C — Add a Grantless actions panel *alongside* `TaskManagement`
- **Cons:** two overlapping action UIs (assign-worker/submit/conclude would appear twice once a task is funded) — confusing. **Rejected.**

## Decision

**Option A.** Pure transition + conclusion builders in `catallax.ts`; one role+status-gated `TaskLifecycleActions` on `TaskDetail` that replaces the legacy `TaskManagement` render and reuses `AssignArbiterControl`. Mocked payouts via a signed kind-9735, matching the seed.

## Consequences

- **Enables** the full loop from the UI now, mocked, without Story 7 — and gives Story 7 a clean place to swap manual "mark funded" for real crowdfund-driven funding later.
- **No new event kinds; `NIP.md` unchanged.** Reuses 33401/3402/9735 exactly as the seed/harness model them.
- **No new dependencies.** `useNostrPublish` (retry-once) carries the writes; conclude is a 3-event orchestration (mock 9735 → 3402 → 33401 `concluded`), all arbiter-signed.
- **`TaskManagement` is no longer rendered on `TaskDetail`** (becomes unused; retained in-repo, retire later). `TaskDetail`'s crowdfunding *progress display* stays.
- The Story-2.5 "Manage arbiter" card folds into `TaskLifecycleActions` (the Playwright `assign-arbiter` detail spec still sees an assign/change control).
- `taskProposalToInput` proves its worth as the shared re-publish primitive (every transition routes through it).

## Implementation notes

- **`src/lib/catallax.ts`** (pure, reuse `taskProposalToInput`/`buildTaskProposalTemplate`):
  - `markTaskStatus(task: TaskProposal, status: TaskStatus): {kind,content,tags}` = `buildTaskProposalTemplate({ ...taskProposalToInput(task), status })`.
  - `assignWorker(task: TaskProposal, workerPubkey: string): {…}` = `buildTaskProposalTemplate({ ...taskProposalToInput(task), workerPubkey, status: 'in_progress' })`.
  - `buildTaskConclusionTemplate(input: { taskCoord; taskId; payoutReceiptId?; patron; arbiter; worker?; resolution: ResolutionType; details?: string }): {kind:3402, content, tags}` — content `{ resolution_details }`; tags per NIP: `['e', payoutReceiptId?]`, `['e', taskId]`, `['p', patron]`, `['p', arbiter]`, `['p', worker?]`, `['resolution', resolution]`, `['a', taskCoord]`, `['t','catallax']`. Pure; round-trips through `parseTaskConclusion`.
  - `buildMockZapReceiptTemplate(input: { senderPubkey; recipient; amountSats; referencedId }): {kind:9735, content, tags}` — mirrors the harness mock: `['e', referencedId]`, `['p', recipient]`, `['description', JSON.stringify({ pubkey: senderPubkey, tags: [['amount', String(amountSats*1000)]] })]`. Mocked (arbiter signs); documented as a stand-in for a real LNURL receipt.
- **`src/lib/grantless.ts`**: `parsePubkey(input: string): string | null` — accept `npub…` or 64-hex → hex, else null (for the worker input). Pure.
- **`src/components/grantless/TaskLifecycleActions.tsx`** (new): props `{ task: TaskProposal; curatorPubkey?: string; onUpdate?: () => void }`. Computes `isPatron/isArbiter/isWorker` from `useCurrentUser`. Renders, by status:
  - `proposed`: `AssignArbiterControl` (patron); **Mark funded** (patron *or* arbiter) — gated on `task.arbiterPubkey` set (escrow needs an arbiter; otherwise a "assign an arbiter first" hint) → `markTaskStatus(task,'funded')`.
  - `funded`: **Assign worker** (patron) — an npub/hex `Input` defaulting to the patron's own npub (self-assignment) + "Assign" → `assignWorker(task, parsePubkey(input))`.
  - `in_progress`: **Mark submitted** (worker) → `markTaskStatus(task,'submitted')`.
  - `submitted`: **Conclude** (arbiter) — a `Select` of the four resolutions + optional details + "Conclude" → orchestrate: publish `buildMockZapReceiptTemplate` (recipient = worker for `successful`, else patron) → `buildTaskConclusionTemplate({ payoutReceiptId, … })` → `markTaskStatus(task,'concluded')`.
  - `concluded`: show the resolution (from the latest 3402) — read-only.
  - Each action: `useNostrPublish` (signs as the current user → authorized-updater), `useToast`, `onUpdate()` to refetch. A roleless/logged-out viewer sees an explanatory line, no actions.
- **`src/pages/TaskDetail.tsx`**: remove the `<TaskManagement>` import+render and the 2.5 "Manage arbiter" card; render `<TaskLifecycleActions task={task} curatorPubkey={rememberedCurator || undefined} onUpdate={refetch} />`. Keep the crowdfunding progress display.

### Tests the Tester will write
- **Unit (`npm test`):** `catallax.lifecycle.test.ts` — `markTaskStatus` / `assignWorker` (status + worker + field preservation, round-trip via `parseTaskProposal`), `buildTaskConclusionTemplate` (tags/content, round-trip via `parseTaskConclusion`), `buildMockZapReceiptTemplate`; `grantless.parsePubkey.test.ts` (npub/hex/junk).
- **Real-event e2e (`npm run test:e2e`):** `task-lifecycle.e2e.test.ts` — author a proposed task (with arbiter) via the builders, then drive funded (patron-signed) → assign worker (in_progress) → submitted (worker-signed) → conclude (arbiter: mock 9735 + 3402 + concluded) using the app builders, asserting each transition is authoritative on the relay and the 3402 references the task + payout.
- **Browser (`npm run test:browser`):** `task-management.spec.ts` — role gating (a non-participant sees no actions) + drive at least the patron assign-worker, worker mark-submitted, and arbiter conclude against seeded tasks/roles, asserting the status advances on the page.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. Every action is permitted solely by the protocol authorized-updater rule (the user holds that role on the task); the client adds no allowlist. ✅ no.
- **Trust WoT-derived?** Yes — risky role overlaps (proposer==worker/arbiter) are surfaced, not blocked; the WoT judges. ✅ yes.
- **Hardcoded defaults?** None new; configured/overridable relay; mocked receipts are dev stand-ins, not a privileged endpoint. ✅
- **nsec/signing:** the acting user signs their own 33401/3402/9735; no key exposed. ✅
- **Fork test:** anyone runs their own instance/relay/actors and drives the same loop. ✅ yes.

## Out of scope
- Crowdfunding contributions / goal-met detection / real Lightning (Story 7 + later); proportional refund math; editing task content fields; reopening a concluded task; retiring/deleting the legacy `TaskManagement` (left unused for now).
