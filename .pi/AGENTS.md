# Catallax Reference Client

A Nostr client demonstrating the Catallax protocol for decentralized gig marketplaces settled via Lightning. This is a **reference implementation** for developers — not a production end-user app. It covers all basic protocol functionality with no opinionated customizations, so other devs can fork it and narrow it down (filter by tags, authors, etc.) for their own use cases.

**Catallax is open, permissionless, and Web-of-Trust based.** No pubkey, relay, or arbiter holds special privileges or capabilities — trust is social, via the WoT, never granted by the client. Some defaults may be hardcoded to ease bootstrapping, but everything is overridable, and anyone must be able to clone, reconfigure, and run it for their own purpose. See the prime directive under [House rules](#house-rules).

**Stage:** Active rewrite — migrating away from MKStack toward a more framework-agnostic approach (vanilla React, Alpine.js, or similar). Stack decisions are in flux.

## Tech stack

**Current (legacy, being replaced):**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS 3 + shadcn/ui
- Nostrify (Nostr protocol)
- TanStack Query (data fetching)
- React Router

**Target direction:**
- More framework-agnostic — less opinionated stack so it's easier to fork
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

## Architecture rules

- **Open & permissionless by construction**: The architecture must not encode privileged pubkeys, relays, or arbiters. No allowlist, no special-cased operator, no trust granted in code. Trust is WoT-derived and surfaced, not conferred. Any bootstrapping default is a plain, overridable suggestion with no elevated capability. (See the prime directive in House rules.)
- **Wrapper/adapter layer**: Implementation code talks to our wrappers around Nostr protocol functions, not directly to library APIs. Swapping out `nostr-tools` or any other library should only require changes at the wrapper layer.
- **Minimal coupling to opinionated frameworks**: Keep the codebase forkable. Nostr-specific libraries are acceptable where they provide fundamental value (relay pool management, NIP implementations, event signing). Avoid opinionated "stacks" that bundle too many decisions.
- **Clear separation of concerns**: UI layer, protocol layer, and data layer should be separable so someone forking can swap out UI or narrow functionality without untangling deeply coupled code.
- **Reference client philosophy**: Every design decision should ask "would this make it harder for someone to fork and customize this?" If yes, reconsider.

## House rules

### Open, permissionless, Web-of-Trust based (the prime directive)

**Catallax is open, permissionless, and Web-of-Trust based. This is the single most important property of the system, and every other house rule serves it.**

- **No privileged actors.** No pubkey, relay, arbiter, Blossom server, or any other party has special privileges, elevated capabilities, or a built-in role that others cannot also fill. There are no admins, no allowlists baked into the client, no gatekeepers. Anyone can be a patron, worker, arbiter, or relay operator simply by participating.
- **Trust comes from the Web of Trust, never from the client.** Reputation, arbiter selection, and counterparty trust are established socially through the WoT — the client surfaces that signal; it does not confer, hardcode, or arbitrate it. The code must never encode "this pubkey/relay is trusted" as a privileged fact.
- **Bootstrapping defaults are allowed; privilege is not.** Hardcoded values that exist purely to make first-run convenient (default relay URLs, Blossom servers, suggested arbiters, API endpoints) are fine *as conveniences only*. Every one MUST be:
  - Flagged prominently in docs as a default, not a requirement.
  - Trivially overridable via ENV variables or configuration settings.
  - Obvious and *invited* to change — the UI/docs make clear these are starting points.
  - Free of any special status: a default relay/arbiter is just a suggestion, identical in capability to any other the user picks.
- **Anyone can fork, clone, and reconfigure for their own purpose.** This is a reference client. A default must never be load-bearing in a way that makes the system depend on *us*, our infrastructure, or any specific operator. If someone clones the repo, points it at their own relays/arbiters, and changes the settings, it must work exactly as well. Always ask: "does this create a dependency on a specific party, or could anyone stand this up themselves?"
- We are building a **decentralization-friendly UI**, not accidentally creating de facto centralization via helpful defaults or privileged pubkeys/relays.

### Other house rules

- **nsec handling**: Never expose, log, or persist private keys carelessly. Treat nsecs as radioactive.
- **User signaling**: Clear, explicit user confirmation for signing events and payment confirmations. No silent actions that spend sats or publish on behalf of the user.
- Basic Nostr security best practices throughout.

## Engineering Team Mode

This project uses Engineering Team Mode at strictness level **Standard**.

The harness lives in `.pi/engineering-team/`. Roles, phase workflows, and templates are all there. Read `.pi/engineering-team/README.md` for the full picture.

When working on this codebase, default to operating inside the harness:
- Use `/skill:plan-feature` to start a new feature.
- Use `/skill:review-changes` to audit a diff before commit.
- Don't skip phase gates without an explicit user instruction to do so.

ADRs are enabled. They live in `.pi/engineering-team/decisions/`.

Git hygiene:
- Clean working tree required before starting a feature: **yes**
- Commit at each phase boundary: **yes**
- Special emphasis: capture the TDD inflection point — failing tests and passing tests should be separate commits.

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

This project is in an active rewrite phase. The existing MKStack code is the baseline, but decisions about the target stack are being made now. ADRs from the Architect role will be especially important for documenting these choices — they serve double duty as developer documentation for anyone forking the reference client.
