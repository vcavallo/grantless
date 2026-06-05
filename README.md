# Grantless

**The Invisible Handout.**

A decentralized, crowdfunded grants program for open-source work, built on the
[Catallax](https://catallax.network) protocol over Nostr. Open-source teams post crowdfunded
gigs for their apps or features, the community funds them with Lightning, teams **self-assign and
build the work themselves**, and an arbiter releases the pooled sats when it's delivered. No board,
no application, no grantmaker — the market does what the committee used to.

The name is a nod to every dev who never got a grant from a managed fund. The mechanism is
deliberately the *opposite* of the OpenSats playbook: instead of a foundation doing diligence and
picking winners, community-curated **OpenSets** (Nostr lists) power discovery and trust, and funders
steer with their sats and their social standing.

## Open, permissionless, Web-of-Trust based

This is the most important property of the system. **No pubkey, relay, arbiter, or host holds any
special privilege or capability.** Trust is social — derived from the Web of Trust — never granted
by the client. Hardcoded values (the default relay, suggested curators) exist only to make first-run
convenient; every one is documented as a default, trivially overridable, and free of elevated
status. Anyone can clone this, point it at their own relay/curators/arbiters, and run an identical
Grantless. See [`.pi/AGENTS.md`](.pi/AGENTS.md) for the full prime directive.

## The core loop

1. You pick a **curator** to browse — you see the applicants that curator vouches for, and their
   projects.
2. An applicant **posts a project** (a crowdfunding task) and assigns an **arbiter** from the
   curator's trusted-arbiter set.
3. The community **funds** it. Contributions are custodied by the arbiter as escrow — not by
   Grantless and not by any central treasury.
4. A **worker** (often the team itself) delivers the work and marks it submitted.
5. The arbiter **concludes** it: release the pooled sats to the worker, or refund the crowd.

Discovery and trust run on **OpenSets** — curated Nostr lists (kind `30000`/`30392`) published from
a curator's point of view. Choosing a different curator switches whose world you see. Anyone can be
a curator, an arbiter, or an applicant; visibility in a given instance is the *viewer's* chosen
curation. Open by default, filterable by choice.

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` spins up a local [strfry](https://github.com/hoytech/strfry) relay in Docker, seeds it
with a fixed, browsable dataset, and starts Vite pointed at it — so you get a working Grantless world
with zero external dependencies. Open http://localhost:5173 and log in with a Nostr extension
(Alby, nos2x, …). Requires Docker for the local relay.

## Configuration

Everything is an optional, overridable convenience — see [`.env.example`](.env.example):

| Env var | Purpose |
|---|---|
| `VITE_DEFAULT_RELAY` | Override the shipped default relay (`wss://relay.grantless.org`). |
| `VITE_RELAY_URL` | Point the whole app at one relay (e.g. a local strfry). |
| `VITE_GRANTLESS_CURATORS` | Seed the curator picker with specific npubs (merged with discovered curators). |

The default read set also includes `wss://tags.brainstorm.world/relay`, where curators mint their
OpenSets — none of these is privileged, and the in-app Settings let users repoint or remove any of
them.

## Testing

Three levels, real events over mocks (the point of building on Nostr):

```bash
npm test                                    # tsc + eslint + unit/integration (vitest) + build
npx playwright test                         # browser e2e against a seeded local relay
```

- **Unit/integration** (Vitest): pure helpers and the wrapper layer; relay-touching paths are
  exercised with **real events** via a local strfry + [`nak`](https://github.com/fiatjaf/nak), never
  mocked.
- **E2E** (Playwright): drives the real browser against the seeded relay. On NixOS, set
  `PLAYWRIGHT_CHROMIUM_PATH` to a working chromium.

## Deploying

- **App** → Vercel. The repo ships [`vercel.json`](vercel.json) (Vite + SPA rewrites); connect the
  repo and point your domain at it. No env vars are required; defaults work.
- **Relay** → the always-on default `wss://relay.grantless.org` is a plain strfry. See
  [`relay/README.md`](relay/README.md) for the production config and reverse-proxy setup. (It's a
  default, not a dependency — run your own and repoint `VITE_DEFAULT_RELAY`.)

## Project layout

- `src/` — the app (UI in `src/components/grantless`, shared protocol layer in `src/lib/catallax.ts`).
- `relay/` — strfry configs for dev/test and production.
- `test/` — the nak harness, dev seed, and Playwright specs.
- [`NIP.md`](NIP.md) — the Catallax protocol document.
- `.pi/` — the engineering-team harness (roles, workflows, stories, ADRs, reviews) this project is
  built with.

## Relationship to upstream

Grantless is a narrowed, opinionated front-end forked from the unopinionated
[`catallax-reference-client`](https://github.com/vcavallo/catallax-reference-client). The Catallax
protocol layer and the wrapper around Nostr stay shared with upstream; the grants framing, OpenSets
curation, and self-assignment flow live only here. Merges flow one way (upstream → Grantless).

---

Vibed with [MKStack](https://soapbox.pub/mkstack)
