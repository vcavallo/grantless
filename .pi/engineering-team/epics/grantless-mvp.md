# Epic: Grantless MVP — curated, crowdfunded open-source grants

**Status:** Active
**Created:** 2026-06-02
**Builds on:** Story 1 (Done) — `stories/1-minimal-nominee-browser.md` (the rendering engine + relay plumbing)

## What this is

The first real, end-to-end Grantless: pick a **Curator**, see the projects of the applicants *that curator* vouches for, and run the full Catallax workflow on them — an open-source team posts a crowdfunded gig, the community funds it, a worker (often the team itself) delivers, and an arbiter releases the pooled sats. All discovery and trust is Web-of-Trust curated; no privileged actors. *The Invisible Handout*, working.

## Why now

Story 1 proved the engine against real Nostr events: resolve a list → render members → profiles + projects, querying the right relays. The next leverage points, in order:
1. Replace the "paste a list" demo with **real curation** (a Curator's WoT-curated applicant set).
2. Stand up a **local relay + e2e harness + dev seed** so we can TDD the write flows against real events (the project's stated testing philosophy: nak + local strfry, not mocks).
3. TDD the **seven write/browse features** that make it an actual product.

## Cross-epic architectural shape

### Curation via the `observer` / `source-tag` chain (the resolver)

A Curator's curated set of pubkeys for a tag is a Brainstorm-published **kind 30392** trusted-list. Validated against real data on `wss://tags.brainstorm.world/relay` (21/21 carry this chain). Shape:

```
kind 30392                         # signed by Brainstorm's agent (TA), NOT the curator
  ["d",         "tl-pin-<observer8>-<tagAuthor8>-<tagSlug>"]
  ["title",     "<human tag name>"]
  ["metric",    "pinned-tag-membership"]
  ["observer",  "<curatorPubkey>"]                              # ← the PoV / curator
  ["source-tag","<tagEventId>","<tagAuthorPubkey>","<tagSlug>"] # ← [id, author, slug]
  ["cutoff","1"], ["min-rank","0"]
  ["p", "<memberPubkey>", …]                                    # members (may carry rank)
```

**Resolver** — get curator `C`'s members for tag `T`:
> query `{ kinds:[30392] }`, keep events where `observer == C` **and** `source-tag[3] == T`, take the **latest by `created_at`** (replaceable), extract `p` tags. The list is signed by the TA, so **never** filter by `authors:[C]` — resolve through `observer`.

Two tags drive the whole product, one resolver each:
- **`grantless-applicants`** — who shows up as a project-poster under a curator.
- **`grantless-arbiter`** — which arbiters are offered when an applicant picks one.

Relay-indexing note: only `d` and `p` are single-letter/indexed; `observer`/`source-tag` are not. So resolution = fetch 30392s from the dedicated tags relay (prod) / local relay (dev) and filter client-side. An exact `#d` fast-path (`tl-pin-{observer8}-{tagAuthor8}-{slug}`) is an optimization the Architect may add, but the `observer`/`source-tag` filter is the source of truth.

**Prod vs dev:**
- **Prod:** Brainstorm runs as an external hosted service; Grantless reads its real 30392s from the hosted relay.
- **Dev/tests:** we fabricate byte-compatible 30392s on the local strfry with nak (we set `observer`, `source-tag`, `p` ourselves; sign with a seed "TA" key). The resolver can't tell the difference — **no Brainstorm process required locally.**

### Roles & trust

- **Curator** pulls anyone; an applicant does **not** choose their curator. A viewer picks which curator's world to browse from a **grantless-curators** list (a default-but-overridable list of curator npubs; "anyone who published a grantless-applicants TL" is a discovery fallback).
- **Arbiter** is the applicant/patron's own choice (base Catallax — the escrow goes to the arbiter, so choose carefully), but the **selectable** arbiters are filtered through the curator's `grantless-arbiter` list.
- **No `arbiter ≠ team` enforcement.** A team may propose, self-assign as worker, and pick a friendly arbiter — the UI must **surface** these relationships (proposer = worker; arbiter identity) and let the WoT and social standing judge.

### Replaceable events (cross-cutting — handle in every read path)

Status updates (33401), curation lists (30392), arbiter announcements (33400) are all replaceable. Old revisions leaking through is the known footgun. Rules for every consumer:
- Dedupe to the **latest `created_at`** per addressable coordinate; honor the authorized-updater rule (patron/arbiter/worker for 33401).
- Assume **multi-relay divergence**: a user on their own relays can see v1 on relay A and v3 on relay B. Defaulting to our relay mitigates but does not remove this.
- **Test it explicitly**: publish v1→v2→v3 (and out-of-order `created_at`, and split across relays) → assert only the newest renders.

### Relays

- **Dev/tests:** local **strfry in Docker**, auto-started; used for *both* the curation lists and the Catallax kind events.
- **Prod:** `relay.grantless.org` (strfry) is always in the read+write set for Catallax events, *in addition to* the user's relays — a removable default, never a privilege (per the prime directive). Curation/list events are read from where they live (Brainstorm's relay / hints).

## Story decomposition

Story 1 is Done. Numbers below are the intended sequence; the final `<n>` is assigned when each is promoted via `/plan-feature`.

| # | Title | Status | Scope sketch |
|---|---|---|---|
| 2 | **Test infrastructure** | Next | strfry-in-Docker auto-started for tests & dev; nak e2e harness; fabricated curation-chain fixtures (30392 w/ observer+source-tag); happy-path Catallax flow with mocked zaps; teardown so no stale data lingers. |
| 3 | **Dev seed** | Stub | Fixed nsecs (always the same): 1 curator, 2 applicants/patrons, 1 separate worker, 3 funders, **2 arbiters**. Full historical data — applicant + arbiter 30392s, projects across every status — so the UI is browsable. Leave accounts' nsecs available to load into a signer for manual role testing. Run + teardown. |
| 4 | **Curator selector + real applicant view** | Stub | grantless-curators list → pick a curator → resolve their `grantless-applicants` 30392 (observer/source-tag) → render via Story 1's engine. Replaces the paste-a-list demo. First TDD'd feature (uses Stories 2–3). |
| 5 | **Create a project** | Stub | Grantee creates a task (33401) through the UI. |
| 6 | **Assent to arbitrate** | Stub | Applicant picks an arbiter; the selector is filtered by the curator's `grantless-arbiter` 30392 (same resolver). Arbiter assents. |
| 7 | **Contribute to a crowdfund** | Stub | Funder contributes toward the 9041 zap goal; payments mocked. Funding progress shown. |
| 8 | **Assign a worker** | Stub | Grantee assigns a worker (33401 `p` + status `in_progress`). |
| 9 | **Mark work submitted** | Stub | Worker marks `submitted`. |
| 10 | **Conclude as satisfactory** | Stub | Arbiter marks satisfactory → 3402 conclusion + payout to worker (mocked). |
| 11 | **Browse under a Curator** | Stub | Filters (completed / in-progress / awaiting-funding / …), date sorts (submitted/completed/created), and **shareable project URLs**. |

Playwright browser-e2e is desired; fold it into Story 2 if cheap, else a fast-follow after the nak-level harness lands.

## Cross-cutting (bake into the relevant ADRs, not separate stories)

- **Replaceable-event correctness** (see above) — every read path + explicit tests.
- **Prime directive** — no privileged pubkey/relay/curator/arbiter; every default overridable; fork test passes.
- **Shareable URLs** — projects addressable by naddr in the route (reuse the existing `/task/:nip19` pattern; extend for the curator-scoped view).

## Chores (not feature stories — track and do at the right time)

- **Vercel deploy + `grantless.org` domain** — gated on a deployable artifact; Story 1 already qualifies, so this can happen any time we want a live preview.
- **Stand up / host the live `relay.grantless.org`** (strfry) in prod — the always-on Catallax relay. Needed before the prod relay-policy is meaningful; the same strfry image used in Story 2's Docker setup can inform it.
- **`relay.grantless.org` default-relay policy wiring** — the code that adds our relay to the read/write set for Catallax events (overridable). Small; fold into the relay work or a tiny story when the prod relay exists. (Previously queued in `stories/_intake.md`.)

## Out of epic (deferred)

- **Gig-level** curation (we curate at the applicant-profile level); multi-curator union views; encryption of curation events.
- The **Brainstorm-side** UI for minting tags / pinning / publishing TLs — that's Brainstorm's job; Grantless only consumes the 30392s.
- **Real Lightning** settlement — payments are mocked in tests; real zaps are a later hardening pass.

## Linked artifacts

- Engine: `stories/1-minimal-nominee-browser.md`, `decisions/0001-minimal-nominee-browser.md`
- Intake: `stories/_intake.md` (deploy chore, relay-policy)
- Live curation reference: `wss://tags.brainstorm.world/relay` (real 30392s with the observer/source-tag chain)
