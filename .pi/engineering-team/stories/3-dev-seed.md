# Story 3: Dev seed — a fixed, browsable local dataset

**Status:** Approved
**Created:** 2026-06-03
**Type:** Feature (infrastructure)

## Background
Story 2 gave us a local strfry relay + a nak harness, but it starts **empty** — every test mints throwaway keys and tears them down. To develop and visually test the Grantless UI (the curator selector of Story 4, and the write/browse flows after it), a developer needs a relay that already has a realistic, **always-the-same** world in it: known curators, applicants, arbiters, funders, and projects spanning every lifecycle status. Fixed accounts also let a developer paste a known nsec into the signer and *act as* a specific role (applicant, arbiter, worker, funder) to exercise write flows by hand.

This story builds that seed: a reproducible dataset published to the local relay, with a fixed cast whose keys are stable across runs and available to load into a signer. It is **dev/test tooling only** — no app feature, no production data, no privileged actor.

## User-facing description
As a Grantless developer, I want a single command that fills my local relay with a fixed, realistic dataset — known curator/applicants/arbiters/worker/funders and projects across every status — and that hands me the accounts' nsecs, so that the UI is browsable without hand-authoring events and I can log in as any role to test write flows manually.

## Acceptance criteria
- [ ] **Fixed cast.** Given the seed is run, then it uses a **fixed, deterministic** set of accounts — **1 curator, 2 applicants/patrons, 1 separate worker, 3 funders, 2 arbiters** (plus the list-publishing agent that signs curation lists) — whose pubkeys are **identical on every run** (re-deriving a role's pubkey from its committed secret always yields the same value). The keys are documented, committed dev-only fixtures, never real user keys, and never wired into any production default.
- [ ] **Seeds to a relay, idempotent on the cast.** Given a target relay URL and a freshly-started (empty) relay, when the seed runs, then all of the dataset below is published and queryable on that relay; the relay URL is a parameter/override, not hardcoded to a single privileged relay.
- [ ] **Profiles.** Given the seed ran, then every account in the cast has a kind-0 profile (at least a name) on the relay, so the browser shows real names/avatars rather than only fallbacks.
- [ ] **Curation chain — applicants.** Given the seed ran, when a consumer resolves the curator's **`grantless-applicants`** list via the `observer` + `source-tag` chain (the Story 2 resolver), then exactly the 2 applicant pubkeys come back — the data Story 4's curator selector will consume.
- [ ] **Curation chain — arbiters.** Given the seed ran, when a consumer resolves the curator's **`grantless-arbiter`** list the same way, then exactly the 2 arbiter pubkeys come back.
- [ ] **Arbiter announcements.** Given the seed ran, then each of the 2 arbiters has published a kind-33400 arbiter announcement, queryable on the relay.
- [ ] **Projects across every status.** Given the seed ran, then the relay holds task proposals (kind 33401) authored by the applicants such that **every** lifecycle status — `proposed`, `funded`, `in_progress`, `submitted`, `concluded` — is represented by at least one project, and for each project only its **latest authoritative version** is current (no stale revision wins). Projects are distributed across both applicants and reference both arbiters.
- [ ] **Funding + conclusion artifacts.** Given a seeded project at `funded` or beyond, then it has a linked NIP-75 zap goal (kind 9041) with **mocked** zap receipts (kind 9735) from the funders; given a `concluded` project, then it has a kind-3402 conclusion that references the task and a (mocked) payout receipt.
- [ ] **Self-assignment example surfaced.** Given the seed ran, then **at least one** project has the applicant as its own worker (proposer = worker), so the UI's proposer-is-worker disclosure can be exercised, **and at least one** uses the separate worker — both shapes are present.
- [ ] **Nsecs available for manual login.** Given the seed is run, then the cast's accounts (role → npub + nsec) are made available to the developer (printed and/or in a committed dev-only fixture) so any role can be pasted into the signer to act as that account.
- [ ] **Browsable in the app (manual).** Given the relay is seeded and the app is pointed at the local relay, then the Grantless browser shows the seeded curator's applicants and their projects. Pointing the dev app at the local relay must be a documented, **overridable** convenience (e.g. an env/config override that defaults to the existing behavior when unset) — not a hardcoded privileged relay.
- [ ] **Run + teardown.** Given the seed and relay lifecycle, then there is a documented way to seed and to tear everything down (the local relay's existing teardown wipes seeded data); the fast unit gate (`npm test`) stays Docker-free and is not coupled to the seed.

## Out of scope
- **The curator selector UI and any feature flow** (Stories 4–11). This story produces *data* and *accounts*, not UI behavior. (It points the existing Story-1 browser at the data for manual verification only.)
- **Real Lightning** — zap receipts and payouts are mocked (fabricated 9735s), as in Story 2.
- **Negentropy / mirroring real curation data** from a live relay — a later epic chore; the seed *fabricates* its data with nak.
- **Browser-level (Playwright) e2e** — still the Story 2.5 fast-follow; this story's automated tests stay at the nak/relay level.
- **CI / cross-platform** portability — local dev-machine use is sufficient (per direction, same as Story 2).
- **Re-seed-without-reset idempotency for non-replaceable events** — the seed assumes a fresh (tmpfs) relay, matching the Story-2 lifecycle; re-running against a dirty relay may duplicate regular events (goals/receipts/conclusions). Documented, not solved here.

## Openness check
The seeded relay and the fixed accounts are **dev/test-only** resources — a relay anyone can run and throwaway keys anyone can regenerate; nothing is special-cased or privileged. The curation lists model trust exactly as the app reads it (`observer`/`source-tag`), not via hardcoding. The committed fixed nsecs are clearly-labeled dev fixtures, never real keys and never wired into a production path. The env/config override that points the dev app at the local relay defaults to the existing behavior when unset and is documented as a plain, overridable convenience. Fork test: anyone with Docker + nak runs the same seed against their own relay and gets the same browsable world. Consistent with the prime directive.

## Open questions
Resolved during planning (decisions made for an autonomous run, per the epic's detailed sketch):
- **Fixed keys committed in-repo?** Yes — the explicit ask is "fixed nsecs, always the same." They are dev-only throwaway fixtures, prominently labeled, never real keys, never in a prod default. The Reviewer enforces this framing.
- **How are nsecs surfaced?** Both: a committed dev-only roster fixture (role → keys) and a printed roster when the seed runs.
- **Auto-point the dev app at the local relay?** Yes, via an **optional** env override (e.g. `VITE_RELAY_URL`) that is unset by default (no behavior change) — included because "browsable" is a core criterion and switching relays by hand every dev session is poor DX. Kept openness-clean (documented, overridable, no elevated status). This is the one app-code touch in an otherwise tooling-only story; called out explicitly so it is a conscious decision, not scope creep.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md` (Story 3 row)
- Builds on: `.pi/engineering-team/stories/2-test-infrastructure.md` + `.pi/engineering-team/decisions/0002-test-infrastructure.md` (relay + harness)
- ADR: `.pi/engineering-team/decisions/0003-dev-seed.md`
- Test plan: `.pi/engineering-team/stories/3-dev-seed.test-plan.md`
- Review: `.pi/engineering-team/reviews/3-dev-seed.md`
