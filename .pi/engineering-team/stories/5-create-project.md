# Story 5: Create a project

**Status:** Done
**Created:** 2026-06-03
**Type:** Feature

## Background
Stories 1–4 are read-only: browse a curator's applicants and their projects. Story 5 is the **first write flow** and the start of the Grantless core loop — a grantee (an applicant) posts a crowdfunded project of their own. In Catallax terms that's a **kind-33401 task proposal** with `funding_type: crowdfunding`, status `proposed`, authored by the grantee (the patron). Once posted, it appears beneath that grantee in the browse view (Story 1/4's engine), so the community can see what they want to build.

This story deliberately stops at the **proposal**. Two things the full Catallax crowdfund needs come in later stories the epic already sequences: **choosing an arbiter** (Story 6 — filtered by the curator's `grantless-arbiter` list, plus the arbiter's assent) and the **NIP-75 zap goal + funding** (Story 7). A `proposed` task is therefore valid and parseable without an arbiter or a goal — it's a project idea on the record, awaiting an arbiter and then funding.

A complete `TaskProposalForm` already exists on the legacy `/catallax` dashboard, but it *requires* arbiter selection and creates the 9041 goal inline — i.e. it folds Stories 6 and 7 into creation. Story 5 needs the minimal slice that matches the epic's decomposition; how much of that form to reuse vs. build fresh is the Architect's call.

## User-facing description
As a logged-in grantee, I want to post a crowdfunded project — a title, what it is, what "done" looks like, and a funding target — so that it appears under me in the browse view and the community can begin to rally around it (with an arbiter and funding to follow).

## Acceptance criteria
- [ ] **Login-gated.** Given a logged-out visitor, when they look for the create-a-project affordance, then they are prompted to log in (or it is clearly disabled) and cannot publish; given a logged-in user, then the create form is available.
- [ ] **Creates a valid proposal.** Given a logged-in grantee fills in title, description, requirements, and a funding-target amount (sats) — plus optional details URL / categories / deadline — and submits, then the app publishes a **kind-33401** event, **signed by that grantee**, carrying: a unique `d`; a first `p` tag equal to the grantee's pubkey (the patron); `amount` = the entered target; `status` = `proposed`; `funding_type` = `crowdfunding`; a `t` = `catallax` tag; and `content` = JSON `{ title, description, requirements, deadline? }`. The proposal carries **no arbiter `p`/`a` tag and no `goal`** (deferred to Stories 6–7).
- [ ] **Input validation.** Given required fields are missing or the amount is not a positive number, when the user submits, then the form shows clear field-level errors and publishes nothing.
- [ ] **Surfaces under the grantee.** Given the grantee is a member of the selected curator's `grantless-applicants` list, when their new proposal is published and the browse view refreshes, then the project appears beneath that grantee (title shown), via the Story-1/4 engine — because it is `t:catallax`, parses (`d`/patron/amount/status present), and is signed by the patron (passing the authorized-updater check).
- [ ] **Clear feedback + safe signing.** Given a submit, then signing is an explicit user action (the signer prompts; no silent publish); on success the user gets clear confirmation (e.g. a toast and the form resets/closes); on failure a non-crashing error is shown and nothing is half-created.
- [ ] **No privileged actor (openness).** Given any logged-in pubkey, when they create a project, then it is authored entirely by their own key with no relay, arbiter, or pubkey special-cased — anyone can post permissionlessly (visibility is still governed by the viewer's chosen curator, per Story 4). Writes use the app's configured, overridable relay.

## Out of scope
- **Choosing/assigning an arbiter** and the arbiter's assent — Story 6 (the selector is filtered by the curator's `grantless-arbiter` list). The proposal starts arbiter-less.
- **The NIP-75 zap goal (kind 9041) and any funding/contribution** — Story 7. No goal is created at proposal time.
- **Assigning a worker / self-assignment**, status transitions beyond `proposed` (`funded`/`in_progress`/`submitted`/`concluded`) — Stories 8–10.
- **Editing, withdrawing, or deleting** a project after posting; a project **detail page**; shareable project URLs (Story 11).
- **Non-crowdfunding (`single`) funding type** — Grantless is crowdfunding-first; `funding_type` is fixed to `crowdfunding` here.
- Reworking or removing the legacy `/catallax` `TaskProposalForm`.

## Openness check
Creating a project is permissionless: any logged-in user posts a 33401 authored by their own key; no pubkey, relay, or arbiter is privileged or required at creation. The grantee is the patron (first `p` tag) — their own event. Visibility remains curator-governed (Story 4), but **posting** is open to all, which is the permissionless floor the prime directive requires. The write targets the app's configured, overridable relay. nsec/signing is handled by the user's signer with an explicit confirmation; no key is exposed. Consistent with the prime directive.

## Open questions
Resolved during planning (decisions for the autonomous run, grounded in the epic):
- **Arbiter at creation?** No — arbiter selection is Story 6; the proposal is posted arbiter-less and un-funded. A `proposed` 33401 without an arbiter/goal is valid and parseable.
- **Zap goal at creation?** No — Story 7. The funding *target* is captured as the 33401 `amount`; the 9041 goal is created when funding is set up.
- **Reuse the legacy `TaskProposalForm` or build fresh?** Architect's call. It currently requires an arbiter and creates the goal (Stories 6–7 concerns), so at minimum those must not be required here.
- **Where the form lives** (dialog on `/` vs. a route) — Architect's call; it must be reachable from the Grantless browse experience when logged in.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md` (Story 5 row; core loop step 1)
- Builds on: Story 1 (engine) + Story 4 (curator browse that surfaces the new project); reuses the protocol seam in `src/lib/catallax.ts` and `useNostrPublish`.
- Reference: `src/components/catallax/TaskProposalForm.tsx` (existing full form — folds in Stories 6–7), `NIP.md` (33401 schema).
- ADR: `.pi/engineering-team/decisions/0005-create-project.md`
- Test plan: `.pi/engineering-team/stories/5-create-project.test-plan.md`
- Review: `.pi/engineering-team/reviews/5-create-project.md` — **PASS**
