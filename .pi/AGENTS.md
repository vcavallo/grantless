# Grantless

**Grantless** — *The Invisible Handout.*

A decentralized, crowdfunded grants program for open-source work, built on the Catallax protocol over Nostr. Open-source projects post Catallax gigs for their apps or features, the community crowdfunds them with Lightning, and teams **self-assign and build the work themselves**. No board, no application, no grantmaker — the market (*catallaxy*) does what the committee used to.

The name is a nod to every dev who never got a grant from a managed fund. The mechanism is deliberately the *opposite* of the OpenSats playbook: instead of a foundation doing diligence and picking winners, community-curated **OpenSets** (Nostr sets/lists) power discovery and trust, and funders steer with their sats and their social standing. (The "OpenSets" name is itself a wink — inspired by OpenSats, in the sense of doing the inverse of their playbook.)

**Grantless is open, permissionless, and Web-of-Trust based.** No pubkey, relay, or arbiter holds special privileges or capabilities — trust is social, via the WoT, never granted by the client. Some defaults may be hardcoded to ease bootstrapping, but everything is overridable, and anyone must be able to clone, reconfigure, and run their own Grantless instance for their own purpose. See the prime directive under [House rules](#house-rules).

**Forked from the Catallax reference client.** Grantless is a narrowed, opinionated front-end. The Catallax protocol + wrapper/adapter layer stays shared with upstream (`catallax-reference-client`) and flows downstream via one-way merges; the Grantless framing (grants UX, OpenSets curation, self-assignment) lives only here. See [Relationship to upstream](#relationship-to-upstream).

## What Grantless is (product scope)

**The core loop:**

1. An OSS project/team publishes a Catallax **crowdfunded** task — kind `33401` with `["funding_type","crowdfunding"]` plus a linked **NIP-75 Zap Goal** (kind `9041`) carrying the target amount. (See `NIP.md`; crowdfunding is native to the protocol — Grantless does not reinvent it.)
2. The community **zaps the goal** to fund it. Lightning value is custodied by the task's chosen **arbiter** as escrow.
3. The team **self-assigns as the worker** (the patron and worker may be the same party — see scope decisions).
4. Work is delivered; the arbiter releases escrow to the worker, or refunds contributors proportionally on cancel (kind `3402` conclusion).

**Discovery & curation — the OpenSets model:**

- A **host** publishes a curated **set of eligible profiles** — either a plain **NIP-51 list (kind `30000`)** generated at `tags.brainstorm.world`, or a WoT-scored **list (kind `30392`)** derived from a Brainstorm/GrapeRank **point-of-view (PoV)**. Brainstorm is *optional*: a hand-curated `30000` list is the no-dependency fallback any forker can use.
- The Grantless front-end loads **one host's set** (one `a`-coordinate) and shows only crowdfunded gigs authored by pubkeys in that set. Choosing a different **Host** switches which set is loaded — and thus which gigs appear.
- **Arbiter discovery works the same way:** a host curates a set of trusted arbiters; Grantless filters arbiter selection to that set.
- **Anyone can self-tag, self-list, or post a gig** — that's the permissionless floor — but visibility in a given Grantless instance is the *viewer's chosen host's* curation. Open by default, filterable by choice. That is the whole trick: fully open and permissionless, yet controllable and noise-resistant.

**Scope decisions locked for v1** (deliberately narrow — revisit as the app proves out):

- **Eligibility is profile/list-level, not gig-level.** Once a team's pubkey is in the host's set, *all* their crowdfunded gigs appear. Gig-level curation is a known follow-on, deferred for complexity. The cost is noise (a hosted team's weakest gigs show alongside their best) — accepted for v1.
- **Brainstorm-optional.** A host PoV may be GrapeRank-scored (`30392`) *or* a plain curated list (`30000`). Never require Brainstorm or GrapeRank to stand up a host — the plain-list path must always work. This is what keeps Grantless forkable.
- **Single host at a time.** No multi-host union/dedup yet. The viewer picks one host and browses its world.
- **No `arbiter ≠ team` enforcement.** A team may propose a gig, self-assign as worker, and use any arbiter — including a friendly one. We do **not** forbid this in code. Instead the UI **must surface the relationship** (e.g. "proposer is also the worker," arbiter identity shown prominently) so the community can steer clear of risky setups and social standing does the slashing. Trust is WoT-derived, not enforced by the client — consistent with the prime directive. Always present the full picture; let the WoT judge.

## OpenSets architecture (curation & trust)

Discovery and trust are driven by **host-published Nostr sets**, never by hardcoded allowlists:

- A **host** is just a pubkey that publishes one or more sets: eligible projects (`30000`/`30392`) and trusted arbiters (`30000`/`30392`). There is nothing privileged about being a host — any pubkey can be one.
- The front-end resolves a host's set by its `a`-coordinate (`kind:pubkey:d-tag`) and uses the member pubkeys as the filter for gig and arbiter queries (`{kinds:[33401], authors:[…set…]}` etc.).
- The **host is viewer-selectable and self-hostable.** Any default host shipped with an instance is an **overridable convenience**, never a privileged anchor — a forker points their instance at their own host/PoV and it works identically.
- This pattern (publish a curated list from a PoV, switch consumers by swapping the `a`-coordinate) mirrors the "trusted-list / host-switching" approach proven upstream in tapestry; reuse those ideas where they fit.

## Relationship to upstream

- **Upstream:** `catallax-reference-client` — the unopinionated Catallax reference client. Grantless began as a branch (`grantless`) of it and may later become a separate repo.
- **One-way merges only: upstream → Grantless.** Nothing Grantless-specific goes back upstream. The reference client stays unopinionated.
- **Shared / pulled from upstream:** Catallax protocol code, the wrapper/adapter layer around Nostr, `NIP.md`, and the engineering-team harness itself.
- **Grantless-only:** grants framing/UX, OpenSets curation + host-switching, the self-assignment flow, the proposer=worker disclosure.
- **Expect divergence here.** This `AGENTS.md` and the READMEs intentionally diverge from upstream; resolve merge conflicts in favor of the Grantless versions ("keep ours").
- **When to extract a separate repo:** when the reference client starts actively using its *own* harness backlog (so both product lines write to the same `.pi/engineering-team/stories/` paths and collide), or when `git merge` from upstream starts to genuinely hurt — whichever comes first. Until then, staying a branch is cheaper and earns free upstream fixes.

## Tech stack

Inherited from the reference client (and in flux as that rewrite progresses):

**Current (legacy, being replaced):**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS 3 + shadcn/ui
- Nostrify (Nostr protocol)
- TanStack Query (data fetching)
- React Router

**Target direction:**
- More framework-agnostic — less opinionated stack so it stays forkable and self-hostable
- Nostr ecosystem libraries are OK where they provide protocol fundamentals (relay pools, NIP implementations, event signing)
- Wrapper/adapter layer around Nostr protocol functions so library swaps happen at the wrapper, not in implementation code

## Commands

| Purpose | Command |
|---|---|
| Run tests | `npm test` |
| Lint | `npx eslint` |
| Type-check | `npx tsc -p tsconfig.app.json --noEmit` |
| Build | `npm run build` |
| Dev server | `npm run dev` |

> ⚠️ These commands reflect the current MKStack setup and will change as the rewrite progresses. Update this table when they do.

## Testing approach

- **Unit tests**: Vitest — isolated logic, pure functions, wrapper layer
- **Integration tests**: Vitest + local relay + `nak` — real Nostr protocol behavior without hitting live network relays
- **E2E tests**: Playwright or Puppeteer — browser-level confidence for user flows
- All three levels required
- **Outside-in TDD**: feature/e2e tests written first (failing), then progressively more granular unit tests added as implementation drills inward, then bubble back out until all pass
- Local relay + nak for anything requiring actual Nostr events — never hit live relays in tests
- **Assert the openness properties** where features touch them: a non-default host/relay/arbiter works identically, no pubkey is special-cased, and overriding a hardcoded default behaves the same as the default.

## Architecture rules

- **Open & permissionless by construction**: The architecture must not encode privileged pubkeys, relays, or arbiters. No allowlist, no special-cased operator, no trust granted in code. Trust is WoT-derived and surfaced, not conferred. Any bootstrapping default is a plain, overridable suggestion with no elevated capability. (See the prime directive in House rules.)
- **Curation via OpenSets**: Discovery and trust are driven by host-published Nostr sets (`30000`/`30392`) resolved by `a`-coordinate, never by hardcoded allowlists. The host is viewer-selectable and self-hostable; any default host is an overridable convenience.
- **Wrapper/adapter layer**: Implementation code talks to our wrappers around Nostr protocol functions, not directly to library APIs. Swapping out `nostr-tools` or any other library should only require changes at the wrapper layer. Keep this seam clean — it is the boundary that stays shared with upstream.
- **Minimal coupling to opinionated frameworks**: Keep the codebase forkable. Nostr-specific libraries are acceptable where they provide fundamental value (relay pool management, NIP implementations, event signing). Avoid opinionated "stacks" that bundle too many decisions.
- **Clear separation of concerns**: UI layer, protocol layer, and data layer should be separable so someone forking can swap out UI or narrow functionality without untangling deeply coupled code.
- **Forkable & self-hostable philosophy**: Grantless is itself a fork — keep it just as forkable. Every design decision should ask "would this make it harder for someone to run their own Grantless instance, with their own host, relays, and arbiters?" If yes, reconsider.

## House rules

### Open, permissionless, Web-of-Trust based (the prime directive)

**Grantless is open, permissionless, and Web-of-Trust based. This is the single most important property of the system, and every other house rule serves it.**

- **No privileged actors.** No pubkey, relay, arbiter, Blossom server, host, or any other party has special privileges, elevated capabilities, or a built-in role that others cannot also fill. There are no admins, no allowlists baked into the client, no gatekeepers. Anyone can be a patron, worker, arbiter, host, or relay operator simply by participating.
- **Trust comes from the Web of Trust, never from the client.** Reputation, arbiter selection, host curation, and counterparty trust are established socially through the WoT — the client surfaces that signal; it does not confer, hardcode, or arbitrate it. The code must never encode "this pubkey/relay/host is trusted" as a privileged fact.
- **Bootstrapping defaults are allowed; privilege is not.** Hardcoded values that exist purely to make first-run convenient (default host, relay URLs, Blossom servers, suggested arbiters, API endpoints) are fine *as conveniences only*. Every one MUST be:
  - Flagged prominently in docs as a default, not a requirement.
  - Trivially overridable via ENV variables or configuration settings.
  - Obvious and *invited* to change — the UI/docs make clear these are starting points.
  - Free of any special status: a default host/relay/arbiter is just a suggestion, identical in capability to any other the user picks.
- **Anyone can run their own instance.** A default must never be load-bearing in a way that makes the system depend on *us*, our infrastructure, or any specific operator. If someone clones the repo, points it at their own host/relays/arbiters, and changes the settings, it must work exactly as well. Always ask: "does this create a dependency on a specific party, or could anyone stand this up themselves?"
- We are building a **decentralization-friendly UI**, not accidentally creating de facto centralization via helpful defaults or privileged pubkeys/relays/hosts.

### Other house rules

- **nsec handling**: Never expose, log, or persist private keys carelessly. Treat nsecs as radioactive.
- **User signaling**: Clear, explicit user confirmation for signing events and payment confirmations. No silent actions that spend sats or publish on behalf of the user. (Especially important here: contributors are zapping real sats into arbiter-custodied escrow.)
- **Surface, don't hide, trust-relevant relationships**: where a setup carries risk the WoT should judge (e.g. proposer is also the worker, or the arbiter is close to the team), show it plainly rather than suppressing it.
- Basic Nostr security best practices throughout.

## Engineering Team Mode

This project uses Engineering Team Mode at strictness level **Standard**.

The harness lives in `.pi/engineering-team/` (and, for Claude Code, `.claude/agents/` + `.claude/commands/`). Roles, phase workflows, and templates are all in `.pi/engineering-team/`. Read `.pi/engineering-team/README.md` for the full picture.

When working on this codebase, default to operating inside the harness:
- **pi:** `/skill:plan-feature` to start a new feature, `/skill:review-changes` to audit a diff.
- **Claude Code:** `/plan-feature`, `/design-architecture`, `/design-tests`, `/implement-feature`, `/review-changes`, and `/discuss` (advisory/roundtable).
- Don't skip phase gates without an explicit user instruction to do so.

ADRs are enabled. They live in `.pi/engineering-team/decisions/`.

Git hygiene:
- Clean working tree required before starting a feature: **yes**
- Commit at each phase boundary: **yes**
- Special emphasis: capture the TDD inflection point — failing tests and passing tests should be separate commits.
- **One-way upstream merges:** pull from `catallax-reference-client`; never push Grantless-specific work back.

## TDD workflow

This project follows **outside-in TDD**:

1. User Story → human approves
2. Outer tests first — feature/e2e level tests written from the story, all failing
3. Drill inward — as implementation begins, write progressively more granular unit tests
4. Bubble back out — unit tests pass, then integration tests pass, then feature/e2e tests pass
5. Human review — actual UI testing in the browser
6. Done

The Tester role writes the outer failing tests. The Implementer drills inward adding unit tests as they go. The whole thing converges back outward.

## Notes

Grantless is a fork of the Catallax reference client, currently living on the `grantless` branch of `catallax-reference-client`. The reference client is mid-rewrite off MKStack; Grantless inherits that baseline and its wrapper-layer direction. ADRs from the Architect role are especially important here — they document both the Grantless-specific design (OpenSets curation, host-switching, crowdfunded-gig discovery, self-assignment) and any shared protocol/wrapper work that should be merged back upstream rather than kept Grantless-only.
