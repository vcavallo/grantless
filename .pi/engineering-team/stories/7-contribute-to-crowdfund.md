# Story 7: Contribute to a crowdfund

**Status:** Approved
**Created:** 2026-06-03
**Type:** Feature

## Background
This is where the community's sats enter the loop. Grantless projects are **crowdfunded** Catallax tasks (kind 33401, `funding_type: crowdfunding`) backed by a **NIP-75 Zap Goal** (kind 9041) that carries the funding target and directs contributions to the task's **arbiter** as escrow. Story 5 posts the proposal, Story 6 attaches an arbiter, and Story 6.5 lets the patron/arbiter manually flip to `funded` — but there is currently **no goal and no way to contribute**, so "funded" is just an unbacked status flip.

Story 7 closes that gap: open a task for funding (create its 9041 goal), let anyone contribute toward the target, and show funding progress — so the `funded` transition is backed by real (mocked) contributions. Real Lightning settlement stays deferred; contributions are **mocked** zap receipts (kind 9735), exactly as the seed and nak harness model them.

Protocol grounding (`NIP.md`, `src/lib/catallax.ts`): a 9041 goal carries `amount` (target, msats), a `zap` tag (the arbiter — escrow recipient), and an `a` tag (the task coordinate); the linked 33401 gets a `goal` tag. Contributors publish 9735 zap receipts that reference the goal (`e` = goal event id) and carry their amount. Progress = sum of receipt amounts vs. the target (`calculateGoalProgress` already computes this).

## User-facing description
As a member of the community, I want to chip in sats toward a project's funding goal and watch the goal fill up, so that projects I care about get funded; and as the project's patron, I want to open my project for funding so contributions can begin.

## Acceptance criteria
- [ ] **Open for funding (Patron, creates the goal).** Given a `proposed` task that **has an arbiter** and no goal yet, when its patron opens it for funding, then a kind-9041 zap goal is published — `amount` = the task's target (in millisats), a `zap` tag naming the **arbiter** as recipient, and an `a` tag = the task coordinate — and the task's 33401 is re-published (patron-signed) with a `goal` tag referencing the new goal event. The task stays `proposed`. (Opening for funding **requires an arbiter**, since the escrow recipient must be known; with none, the UI says to assign one first.)
- [ ] **Contribute (anyone, mocked).** Given a task with a goal, when a logged-in user contributes an amount (sats), then a **mocked** kind-9735 zap receipt is published referencing the goal (`e` = goal event id), with the contribution amount and the contributor as sender, recipient = the arbiter. No real Lightning is involved; the receipt is a dev stand-in (as in the seed/harness). Contributing is permissionless — any logged-in pubkey may contribute, including the patron.
- [ ] **Funding progress is shown.** Given a task with a goal, then the detail page shows the **amount raised vs. the target**, a progress indicator (percentage/bar), and the **number of contributors**; the display updates as contributions are added.
- [ ] **Goal-reached is surfaced and enables funding.** Given contributions reach or exceed the target, then the page surfaces that the goal is reached, and the patron/arbiter's existing **"Mark funded"** action (Story 6.5) is available so the task can advance to `funded`. (Marking funded does not *require* the goal to be reached — it stays a manual action — but reaching it is surfaced.)
- [ ] **Replaceable/latest correctness.** Given the task is re-published with the `goal` tag, then only the latest authoritative version is current (the goal link is not lost on later transitions); given multiple zap receipts, then progress reflects all of them without double-counting a single receipt.
- [ ] **No privileged actor (openness).** Given the above, then no pubkey, relay, or goal is special-cased: the goal directs escrow to the task's own chosen arbiter (the patron's decision), contributions are the contributor's own signed events, progress is computed from public receipts, and reads/writes use the configured, overridable relay. Anyone could run their own instance and fund identically. Mocked receipts are clearly dev stand-ins for real Lightning.

## Out of scope
- **Real Lightning / LNURL settlement** — contributions are mocked 9735s; real zaps are a later hardening pass.
- **Refunds and proportional split math** on cancellation — surfaced by the conclusion flow later; not built here.
- **Editing, closing, or deleting a goal**; multiple goals per task; changing the target after opening.
- **Enforcing** that "mark funded" requires the goal be reached — it remains a manual patron/arbiter action (Story 6.5); Story 7 only *surfaces* reached-ness.
- **Auto-creating the goal at task creation** (Story 5) — the goal is created when opening for funding, after an arbiter exists.
- **Contributor identity/leaderboard polish** beyond a count (and basic list if cheap).

## Openness check
Crowdfunding is permissionless: anyone logged in can contribute; the goal and receipts are the participants' own signed events. Escrow is directed to the task's **chosen arbiter** (the patron's decision, per the prime directive — no privileged escrow agent). Progress is derived from public zap receipts, not a trusted tally. Reads/writes use the configured, overridable relay. Mocked receipts are dev stand-ins, not a privileged payment endpoint. A forker funds projects on their own relay identically. Consistent with the prime directive.

## Open questions
Resolved during planning (decisions for the autonomous run, grounded in the epic):
- **When is the goal created?** On a patron "open for funding" action (a task that already has an arbiter), not at task creation. Keeps Story 5 minimal and ensures the escrow recipient is known.
- **Who may contribute?** Anyone logged in (permissionless floor), including the patron.
- **Mocked payments:** contributions are mocked 9735 receipts referencing the goal; real Lightning deferred.
- **Does reaching the goal auto-fund?** No — "mark funded" stays the manual patron/arbiter action (Story 6.5); reaching the goal is surfaced, not auto-applied.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md` (Story 7 row; "core loop" steps 1–2; crowdfunding workflow in `NIP.md`)
- Builds on: Story 5 (`buildTaskProposalTemplate`/`taskProposalToInput`), Story 6 (arbiter), Story 6.5 (`buildMockZapReceiptTemplate`, `markTaskStatus`, `TaskLifecycleActions`, `latestAuthoritativeTask`), Story 3 seed (funded+ tasks already carry 9041 goals + mocked receipts).
- Reuse: `calculateGoalProgress`, `parseZapReceiptAmount/Sender`, `buildGoalEventTags`, `GoalProgress`/`GoalContributor`, `useZapGoal` (`src/lib/catallax.ts`, `src/hooks/useZapGoal.ts`); the existing `GoalProgressBar`/`ContributorsList` may inform the UI.
- ADR: `.pi/engineering-team/decisions/0009-contribute-to-crowdfund.md`
- Test plan / Review: filled in later phases.
