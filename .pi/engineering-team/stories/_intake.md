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

## 2026-06-03 — Fix: CSP blocked ws:// to the local relay (the real blocker)
**Raw:** Local browse showed no data even on the dev machine; console: CSP blocked
ws://127.0.0.1:7787 (connect-src 'self' blob: https: wss:). The static CSP <meta> in
index.html allows secure wss: but not plaintext ws:, so the browser blocked ALL
connections to the local strfry — the actual reason Stories 2–4's local browse never
showed data in-browser. (Supersedes the earlier localStorage/Tailscale theories.)
**Classified:** Bug (obvious) — Implementer + Reviewer. Fix: a dev-server-only Vite
plugin (apply:'serve') adds `ws:` to connect-src via transformIndexHtml; the production
build's CSP stays strict (wss: only). Verified: dev index has ws:, dist/index.html does
not. Belongs to Story 3's local-relay dev infra. Gates clean.

## 2026-06-03 — Create a project (first write flow)
**Raw:** Continue the epic — Story 5. Run all engineering-team phases autonomously;
user checks in after the final review.
**Classified:** Feature (first write flow). Standard strictness → full phase path.
A logged-in grantee posts a crowdfunding kind-33401 task in status `proposed`, authored
by themselves (patron = first p tag), t:catallax — minimal slice, NO arbiter and NO 9041
goal (those are Stories 6–7). Surfaces under the grantee in the Story-4 curator browse.
A full TaskProposalForm exists on /catallax but requires an arbiter + creates the goal
(folds in Stories 6–7), so Story 5 needs the minimal slice.
**Decisions for the autonomous run:** no arbiter at creation (Story 6); no goal at creation
(Story 7); funding_type fixed to crowdfunding; form reachable from the Grantless browse when
logged in (Architect picks dialog vs route + reuse vs fresh).
**Status:** → `stories/5-create-project.md` (Approved).

## 2026-06-03 — Assign an arbiter (curator-vouched) [epic "Assent to arbitrate"]
**Raw:** Continue the epic — Story 6. Run all phases autonomously; user checks in after review.
**Classified:** Feature. Standard strictness → full phase path. The patron assigns an arbiter to
their proposed 33401, chosen from the currently-selected curator's grantless-arbiter list (kind
30392 observer/source-tag, slug grantless-arbiter — reuses Story 4's slug-parameterized resolver);
re-publishes the task (patron-signed) with the arbiter p[1] + a tags via Story 5's builder; status
stays proposed. Arbiter is surfaced in the UI.
**KEY PROTOCOL FINDING:** Catallax has NO arbiter-assent event (NIP.md:22 — out-of-band
coordination, then patron updates the task). Decision: surface the designation, do NOT introduce
an assent kind (would deviate from NIP / break interop). Flagged for review veto; an explicit
in-app assent would be a separate story + NIP change.
**Status:** → `stories/6-assent-to-arbitrate.md` (Approved).

## 2026-06-03 — Browser e2e (Playwright) + UX hardening [Story 2.5]
**Raw:** During Story 6 manual testing the user hit: no visible login button (only via Post-a-
project), arbiter control only on the browse index (not the task detail page), and a recurring
"No curators found" regression in a returning logged-in session (incognito works). User: "perhaps
it's time to finally add the Playwright tests so this kind of thing would have been caught."
**Classified:** Feature (test infra + UX/bug fixes). Standard → full phase path. User chose "Full
Story 2.5 now" (Playwright harness + reproduce/fix the persisted-session regression + persistent
login button + arbiter-on-detail). Lands before Story 7.
**Decisions:** Playwright headless vs seeded local relay; regression root-caused via Playwright in
the Architecture phase (not yet pinned by inspection); arbiter detail-page curator-context is an
Architect decision; login affordance in the browse header.
**Status:** → `stories/2.5-browser-e2e-ux-hardening.md` (Approved).

## 2026-06-03 — Fix: retry-once on publish (transient cold-socket write failure)
**Raw:** User hit "Couldn't assign the arbiter — No Promise in Promise.any was resolved" once
when changing the arbiter from the task detail page right after a hard refresh + login; worked on
retry and on the index. Root cause: first write after a cold load races the relay websocket
(NPool.event → Promise.any over the single local relay → NRelay1.event rejects when the socket
isn't open/acked within 5s; RelayEnvOverride's resetQueries compounds it). Index warms the socket
via browse queries first, so it doesn't surface there.
**Classified:** Bug (obvious) — Implementer + Reviewer. Fix: useNostrPublish wraps nostr.event in
publishWithRetry (one retry after 600ms; re-sending the same signed event is idempotent — relays
dedupe by id). Helps all write flows. Gates clean.
