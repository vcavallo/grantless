# Story 4: Curator selector + real applicant view

**Status:** Approved
**Created:** 2026-06-03
**Type:** Feature

## Background
Story 1 built the rendering engine (resolve a set of pubkeys → render each as a profile with their Catallax projects beneath) but fed it from a **pasted list `naddr`** — explicit scaffolding. The Grantless model is that a **viewer picks a Curator's world**: the applicants a curator vouches for are a Brainstorm-style **kind-30392** trusted list, addressed not by who signed it but by its `observer` (the curator) and its `source-tag` (the tag slug `grantless-applicants`). Story 3 now seeds exactly this data on the local relay (curator Cleo with two applicants).

This story replaces the paste-a-list demo with the real thing: discover the available curators, pick one, resolve **that curator's** `grantless-applicants` list through the `observer`/`source-tag` chain, and render the resolved applicants with Story 1's engine. It is the first TDD'd product feature, and it builds directly on Stories 1–3.

A correctness note that shapes the whole feature: the trusted list is signed by a list-publishing agent (the "TA"), **not** by the curator. Trust resolves through `observer` + `source-tag`, never by trusting whoever signed the event — consistent with the prime directive (trust is WoT-derived, not conferred by a signer).

## User-facing description
As a Grantless viewer, I want to choose a curator and immediately see the applicants that curator vouches for — each with their open-source projects — so that I can browse a curated, trustworthy slice of Grantless without pasting raw Nostr addresses.

## Acceptance criteria
- [ ] **Curators are discoverable and selectable.** Given the relay holds `grantless-applicants` curation lists (kind 30392 carrying `observer` + a `source-tag` whose slug is `grantless-applicants`), when the browse screen loads, then the viewer is offered the set of available curators — at minimum every distinct `observer` who has published such a list, plus any curators from a configurable default set — and can select one. No curator is treated specially; the set comes from a plain, overridable source, not a hardcoded privileged list.
- [ ] **Selecting a curator resolves their applicants.** Given a selected curator `C`, when their `grantless-applicants` list resolves — keep 30392 events where `observer == C` **and** the `source-tag` slug is `grantless-applicants`, take the **latest** by `created_at`, read its `p` tags — then the screen shows exactly that list's applicant pubkeys, **distinct and in `p`-tag order** (first occurrence wins). Resolution must **not** filter by the event's author/signer.
- [ ] **Applicants render via Story 1's engine.** Given the resolved applicants, then each one shows their profile (display name + avatar from kind-0, with a generated fallback when absent) and, beneath it, **all** their Catallax task proposals (kind 33401) with at least a title — or an explicit **"No projects yet"** when they have none, so the view is never blank for a sparse applicant.
- [ ] **Replaceable-list correctness.** Given a curator republished their `grantless-applicants` list (an older version and a newer version both present, possibly out of `created_at` order), when resolved, then **only the latest version's** members render — no stale revision's applicants leak.
- [ ] **Remembers the last curator.** Given a curator was selected, when the page is refreshed, then that curator's world re-loads automatically (the selection is remembered locally); selecting a different curator replaces it.
- [ ] **Empty and error states.** Given no curators can be discovered on the current relay, then the screen shows an empty state inviting the viewer to try another relay (the `RelaySelector`); given a selected curator whose `grantless-applicants` list has zero members, then it shows an explicit empty state; given a relay/lookup failure, then it shows a clear, non-crashing message.
- [ ] **No privileged source (openness).** Given two different curators, each with their own `grantless-applicants` list (from different signers/relays), when each is selected, then each produces its own applicant set, with no curator, signer, or relay treated specially — the displayed applicants are driven entirely by the selected curator's resolved list, and pointing the app at a different (overridable) relay/curator source works identically.

## Out of scope
- **Arbiter curation/filtering** (the `grantless-arbiter` list) — Story 6, even though Story 3 already seeds it.
- **Crowdfunding / funding UI** — goals, zap progress, amounts, contributor counts — Story 7. Projects still render regardless of funding type, with no funding UI (as in Story 1).
- **Write actions, project/profile detail pages, self-assignment** — later stories.
- **Shareable curator/project URLs** (curator or project encoded in the route) — Story 11 owns shareable URLs; Story 4 uses local persistence for the remembered curator.
- **Multi-curator union / switching between several at once** — single curator at a time (per the epic's "single host at a time").
- **Brainstorm/GrapeRank scoring, rank ordering of applicants** — we render the list's `p`-tag order; weighting is out of scope.
- **The pasted-`naddr` dev path** — superseded by the curator selector as the default browse experience. (Whether to retain it as an advanced/fallback affordance is an architecture decision; it is not required by this story.)

## Openness check
The curator set is a plain, overridable source (discovery of `grantless-applicants` publishers on the configured relay, optionally augmented by a configurable default list) — **no curator is hardcoded as privileged**. Trust resolves through the `observer`/`source-tag` chain, never by trusting the event's signer, so no pubkey is special-cased. All reads use the app's configured, overridable relay set. Any default curators shipped for convenience must be overridable and carry no elevated status. Fork test: someone points the app at their own relay (with their own curators' lists) and the selector shows their curators and resolves their applicants identically. Consistent with the prime directive.

## Open questions
Resolved during planning (decisions for the autonomous run, grounded in the epic):
- **Where do curators come from?** Primary: **discovery** — the distinct `observer`s of `grantless-applicants` 30392s on the configured relay (the epic's stated fallback, which is sufficient and the most open). Optionally merged with a **configurable, empty-by-default** curator list (so a forker can pin their own without any privileged default baked in). Exact mechanism is the Architect's call.
- **Keep the paste-naddr UI?** Not required; superseded. The Architect decides whether to retire it cleanly or keep it as an advanced affordance — the default browse experience becomes curator-driven either way.
- **Curator in the URL (shareable)?** Deferred to Story 11 (shareable URLs); Story 4 only remembers the last curator locally.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md` (Story 4 row; curation resolver section)
- Builds on: Story 1 (engine) `stories/1-minimal-nominee-browser.md` + ADR 0001; Story 2 (harness/resolver shape) ADR 0002; Story 3 (seeded curator/applicant data) `stories/3-dev-seed.md`
- ADR: `.pi/engineering-team/decisions/0004-curator-selector.md`
- Test plan: `.pi/engineering-team/stories/4-curator-selector.test-plan.md`
- Review: `.pi/engineering-team/reviews/4-curator-selector.md`
