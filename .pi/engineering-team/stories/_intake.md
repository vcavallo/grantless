# Intake log

Append-only triage log for Grantless. Newest at the bottom. The Product Owner records
raw requests here, classifies them, and notes the phase path before a story is written.

---

## 2026-06-01 — Minimal nominee browser
**Raw:** Build the minimal gig browser for a Curator's chosen OpenSet. Paste an naddr of a
30392 TL / 30000 follow set / 39089 starter pack as a stand-in for the "Grantless Nominee"
set; show each nominee profile with their Catallax projects beneath ("No projects yet" when
none) so the screen is never empty.
**Classified:** Feature. Standard strictness → full phase path.
**Status:** In planning → `stories/1-minimal-nominee-browser.md`.

## 2026-06-01 — Deploy to Vercel + grantless.org domain
**Raw:** "i bought grantless.org … get SOMETHING up on vercel, and the domain settings so i
can test it out at grantless.org. As soon as we have anything at all ready to deploy."
**Classified:** Ops / deployment chore (not an app-behavior feature; no test phase needed).
Gated on the first deployable artifact — Story 1 is the natural candidate.
**Action when Story 1 is mergeable:** deploy to Vercel, wire the `grantless.org` domain,
confirm it loads. Treat as a chore, executed on explicit go-ahead (outward action).

## 2026-06-01 — Grantless default relay policy (relay.grantless.org)
**Raw:** Host a strfry relay at `wss://relay.grantless.org`. All **Catallax events** should
broadcast to that relay (in addition to the user's relay set) AND be read from it (in addition
to the user's relay set) — an "always-on failsafe" for Grantless Catallax events. Explicitly
**NOT** the tagging/list events.
**Classified:** Feature — a wrapper-layer relay policy. Next story candidate after Story 1.
**Scope:** applies to Catallax protocol events — arbiter announcements (33400), task proposals
(33401), zap goals (9041), conclusions (3402), and their zap receipts. **Excludes** curation/
list events (30000 / 30392 / 39089), which stay on the user's / curator's relays.
**PRIME-DIRECTIVE GUARDRAIL:** `relay.grantless.org` must be a **default, not a privilege** —
documented as a default, ENV/config + UI overridable AND removable, with no special protocol
capability. A forker who swaps in their own relay (or removes it) must get an identically
working app. It is "always-on by default," never "mandatory." Confirm this framing with the
user before writing the story.

## 2026-06-02 — Grantless MVP epic
**Raw:** Curator selector via grantless-applicants curation; full test infra (strfry-in-Docker
+ nak e2e + dev seed); TDD the 7 write/browse features; shareable URLs; replaceable-event care.
**Classified:** Epic → `epics/grantless-mvp.md`. Curation chain resolved (`observer`/`source-tag`
on kind 30392; validated on `wss://tags.brainstorm.world/relay`). Sequence: test infra →
dev seed → curator selector → the 7 features. Prod uses hosted Brainstorm; dev fabricates the
chain with nak.
**Chores tracked in the epic:** Vercel deploy + grantless.org domain; **stand up / host the live
`relay.grantless.org` (strfry) in prod**; relay default-relay policy wiring.
**Next:** `/plan-feature` → Story 2 (test infrastructure).

## 2026-06-03 — Dev seed
**Raw:** Continue the epic — Story 3 (dev seed). Run all engineering-team phases autonomously;
user checks in after the final review.
**Classified:** Feature (infrastructure). Standard strictness → full phase path
(Plan → Architecture → Test Design → Implement → Review). Scope is well-specified by the epic's
Story 3 row: fixed nsecs (1 curator, 2 applicants, 1 worker, 3 funders, 2 arbiters + a list-
publishing agent); full historical data (applicant + arbiter 30392s, projects across every
status); nsecs loadable into a signer; run + teardown. Builds on Story 2's relay + harness.
**Decisions for the autonomous run:** fixed keys committed as labeled dev-only fixtures; nsecs
surfaced via a roster fixture + printed on run; optional `VITE_RELAY_URL` (unset by default) so
`npm run dev` can auto-point the app at the local relay.
**Status:** → `stories/3-dev-seed.md` (Approved).

## 2026-06-03 — Curator selector + real applicant view
**Raw:** Continue the epic — Story 4. Run all engineering-team phases autonomously;
user checks in after the final review.
**Classified:** Feature. Standard strictness → full phase path
(Plan → Architecture → Test Design → Implement → Review). First TDD'd product feature.
Replaces Story 1's paste-a-list demo: discover curators → pick one → resolve their
`grantless-applicants` 30392 via observer/source-tag → render with Story 1's engine.
Builds on Stories 1 (engine), 2 (harness/resolver shape), 3 (seeded curator/applicant data).
**Decisions for the autonomous run:** curators sourced via discovery (distinct observers of
grantless-applicants TLs) + optional empty-by-default configurable list; paste-naddr path
superseded; curator-in-URL deferred to Story 11.
**Status:** → `stories/4-curator-selector.md` (Approved).

## 2026-06-03 — Fix: VITE_RELAY_URL ignored for returning users
**Raw:** During Story 4 manual verification, `npm run dev` showed "No curators found" —
the app queried a stale relay. Root cause: `VITE_RELAY_URL` was only the *default* for
empty localStorage, so AppProvider's persisted `nostr:app-config` won over it for anyone
who'd used the app before. The seed→browse flow was silently broken for returning users.
**Classified:** Bug (obvious) — Standard strictness → Implementer + Reviewer (skip
Architecture). Fix: `RelayEnvOverride` makes `VITE_RELAY_URL` authoritative on load when
set (overrides persisted relay → custom/customRelay), no-op when unset. Belongs to Story 3's
`VITE_RELAY_URL` feature. Gates clean; manual-verify (UI, per the feature's nature).
