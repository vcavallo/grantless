# Story 6: Assign an arbiter (curator-vouched)

**Status:** Approved
**Created:** 2026-06-03
**Type:** Feature

## Background
A Catallax crowdfund needs an **arbiter** — the party who custodies the pooled sats as escrow and ultimately releases or refunds them. Story 5 posts a `proposed` project *without* one. This story lets the project's owner (the patron) attach an arbiter, drawn from the arbiters their curator vouches for.

Two protocol facts shape the scope (confirmed against `NIP.md` and `src/lib/catallax.ts`):
- **There is no arbiter-assent event in Catallax.** `NIP.md:22` is explicit: the patron and arbiter *coordinate out-of-band* to agree, and then the patron **replaces their task event** to include the arbiter. So in the protocol, "the arbiter assents" is a social/out-of-band step; the on-protocol act is the patron updating the 33401 with the arbiter's `p` + `a` tags. We honor that — we do **not** invent a new "assent" kind (it would deviate from the NIP and break interoperability, against the house rules). Instead the app **surfaces** the arbiter designation (to everyone, including the arbiter) so the Web of Trust can judge it.
- **The arbiter is the patron's own choice** (escrow goes to them — choose carefully), but Grantless **filters the selectable options** through the curator's `grantless-arbiter` trusted list — the same kind-30392 `observer`/`source-tag` chain as Story 4's applicants, just a different slug. The curator's list narrows *who's offered*; it confers no privilege and forces nothing.

The protocol pieces already exist: Story 4's resolver is slug-parameterized, and Story 5's `buildTaskProposalTemplate` already emits the arbiter `p`/`a` tags. So this story is mostly resolving the arbiter options and re-publishing the patron's task with the chosen arbiter.

## User-facing description
As a grantee (the patron of my project), I want to attach an arbiter that my curator trusts, so that my crowdfund has an escrow holder and can move toward funding — with everyone able to see who the arbiter is.

## Acceptance criteria
- [ ] **Arbiter options come from the curator's `grantless-arbiter` list.** Given a selected curator who published a `grantless-arbiter` trusted list (kind 30392, `observer` = curator, `source-tag` slug `grantless-arbiter`), when the patron opens the assign-arbiter control, then the offered arbiters are exactly the members of that list **who also have a kind-33400 arbiter announcement** (so a service coordinate exists) — resolved via `observer`/`source-tag` (latest list wins), **never** filtered by the list's signer. No arbiter is special-cased.
- [ ] **Assigning updates the task.** Given the patron selects an arbiter and confirms, then the app re-publishes their **kind-33401 signed by the patron**, preserving the existing `d`, patron (`p[0]`), content, `amount`, `status` (stays `proposed`), `funding_type`, categories and details — and adding the arbiter as the **second `p` tag** plus an `a` tag = `33400:<arbiterPubkey>:<serviceD>`. Only the latest version is authoritative (the previous arbiter-less version is replaced).
- [ ] **Only the patron can assign.** Given a viewer who is not the task's patron, when they view the project, then no assign/change-arbiter control is offered to them; given the patron (logged in), the control is available on their own project. (This matches Catallax's authorized-updater rule.)
- [ ] **The arbiter is surfaced.** Given a task with an arbiter assigned, when anyone views it, then the arbiter's identity is shown plainly (name/avatar with fallback). If the arbiter is the same pubkey as the patron (or, later, the worker), that relationship is shown rather than hidden — the WoT judges it. (No protocol assent step is implied; agreement is out-of-band.)
- [ ] **Re-assignable.** Given a project that already has an arbiter, when the patron picks a different curator-vouched arbiter and confirms, then the task is re-published with the new arbiter (second `p` + `a` replaced) and the new arbiter is the one surfaced.
- [ ] **No privileged actor (openness).** Given two curators with different `grantless-arbiter` lists, when the patron is browsing each curator's world, then the offered arbiters are that curator's list respectively; the choice is the patron's own; no arbiter, signer, or relay is special-cased; resolution uses the configured, overridable relay and the `observer`/`source-tag` chain. Anyone could point at their own curator/relay and get their own arbiter options.

## Out of scope
- **Any new "assent"/"acceptance" event or kind** — the protocol coordinates this out-of-band (`NIP.md:22`); we surface the designation, we don't add a kind. (If an explicit in-app assent is ever wanted, it's a separate story *and* a NIP change.)
- **The NIP-75 zap goal + funding** (kind 9041, contributions) — Story 7. Assigning an arbiter does **not** create the goal or change status; the task stays `proposed`.
- **Worker assignment / self-assignment** and status transitions beyond `proposed` — Stories 8–10.
- **Arbiter fee display/negotiation, arbiter policy text/terms UI** beyond showing the arbiter's identity — later polish.
- **The arbiter's own onboarding** (publishing a 33400 service announcement) — already exists on `/catallax`; not rebuilt here. An arbiter must already have a 33400 to be offerable.
- **Curator selection for the arbiter list** as a separate control — it follows the browse's currently-selected curator (Story 4), not a new picker.

## Openness check
The arbiter is the patron's own decision (the escrow depends on it). The curator's `grantless-arbiter` list only *filters the options offered* — it grants no arbiter special status and forces no choice; resolution is by `observer`/`source-tag`, never by trusting a signer, so no pubkey is privileged. Surfacing (not enforcing) risky relationships — e.g. arbiter == patron — is exactly the house rule "surface, don't hide, trust-relevant relationships." Reads/writes use the configured, overridable relay; the patron signs their own task update (no nsec exposure). A forker pointing at their own curator/relay gets their own arbiter options identically. Consistent with the prime directive.

## Open questions
Resolved during planning (decisions for the autonomous run; flagged for review veto):
- **"Arbiter assents" — what is it?** No protocol assent event exists (`NIP.md:22` → out-of-band coordination, then the patron updates the task). **Decision:** Story 6 implements the patron assigning a curator-vouched arbiter and the app *surfacing* the arbiter; assent stays social/out-of-band. We do **not** introduce an assent kind. If the user wants an explicit in-app arbiter confirmation, that's a separate story + NIP change — flagged for veto.
- **Which curator's arbiter list filters the options?** The browse's **currently-selected curator** (Story 4 context), keeping arbiter trust tied to the same curator world the project is viewed in. Architect confirms the wiring.
- **Candidate = list member ∩ has a 33400.** An offered arbiter must be on the curator's `grantless-arbiter` list **and** have a 33400 announcement (needed for the `a` service coordinate). Members without a 33400 aren't offerable.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md` (Story 6 row; "Roles & trust", "No `arbiter ≠ team` enforcement")
- Builds on: Story 4 (slug-parameterized curation resolver `resolveCuratorApplicants(events, curator, slug)`), Story 5 (`buildTaskProposalTemplate` arbiter `p`/`a` tags), `useArbiterAnnouncements` (33400), Story 3 seed (`grantless-arbiter` list for Cleo → Dave/Erin).
- Protocol: `NIP.md` (33400 schema; 33401 arbiter tags; out-of-band assent at line 22), `src/lib/catallax.ts`.
- ADR: `.pi/engineering-team/decisions/0006-assent-to-arbitrate.md`
- Test plan: `.pi/engineering-team/stories/6-assent-to-arbitrate.test-plan.md`
- Review: `.pi/engineering-team/reviews/6-assent-to-arbitrate.md`
