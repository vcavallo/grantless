# Test Plan: Story 3 — Dev seed

**Story:** `.pi/engineering-team/stories/3-dev-seed.md`
**ADR:** `.pi/engineering-team/decisions/0003-dev-seed.md`
**Date:** 2026-06-03

## Approach

Two levels, matching ADR 0003 and the project's testing philosophy:

1. **Unit (`npm test`, Docker/nak-free):** `test/seed/accounts.test.ts` proves the committed fixed roster is deterministic and self-consistent using `nostr-tools` alone — `sec → pub`, `pub ↔ npub`, `sec ↔ nsec`, distinct pubkeys, and the exact cast counts. This is the "always the same" guarantee, testable without a relay.
2. **Real-event e2e (`npm run test:e2e`, Docker + nak):** `test/seed/seed.e2e.test.ts` brings up a fresh local strfry, runs `runSeed(RELAY_URL)`, then queries the relay and asserts the seeded world — profiles, both curation lists (via the `observer`/`source-tag` resolver), arbiter announcements, projects across every status (each latest-authoritative), the full-revision-chain task, funding/conclusion artifacts, and the self-assigned vs separate-worker shapes.

The seed module (`./accounts`, `./seed`) is built in Implementation; both suites fail RED until then.

## Coverage map

| Criterion (AC) | Test | File | Level |
|---|---|---|---|
| Fixed cast / deterministic keys | "has the cast the story specifies", "every account is a self-consistent keypair", "all roles have distinct pubkeys" | `test/seed/accounts.test.ts` | unit |
| Seeds to a relay (parameterized URL) | `runSeed(RELAY_URL)` in `beforeAll` + all e2e assertions | `test/seed/seed.e2e.test.ts` | e2e |
| Profiles | "publishes a kind-0 profile for every account in the cast" | seed.e2e | e2e |
| Curation chain — applicants | "resolves the curator's grantless-applicants list to exactly the two applicants" | seed.e2e | e2e |
| Curation chain — arbiters | "resolves the curator's grantless-arbiter list to exactly the two arbiters" | seed.e2e | e2e |
| Arbiter announcements | "publishes an arbiter announcement for each arbiter" | seed.e2e | e2e |
| Projects across every status / latest-wins | "seeds projects covering every lifecycle status, each authoritative" | seed.e2e | e2e |
| Replaceable correctness (history, stale loses) | "publishes at least one project through a full revision chain" | seed.e2e | e2e |
| Funding + conclusion artifacts | "gives funded-or-later projects a zap goal with mocked receipts", "concludes the concluded project with a 3402 referencing the task and a payout" | seed.e2e | e2e |
| Self-assignment example surfaced | "seeds both a self-assigned (proposer = worker) and a separate-worker project" | seed.e2e | e2e |

## Verified manually (not automatable in the runner)

- **Nsecs available for login.** `npm run seed` prints the role → npub + nsec roster (also committed in `test/seed/accounts.ts`); pasting an nsec into the signer logs in as that role.
- **Browsable in the app.** `npm run dev` (relay up → seed → vite) with the app pointed at the local relay (`VITE_RELAY_URL`, overridable) shows the seeded curator's applicants and their projects in the Story-1 browser.
- **Run + teardown.** `npm run seed` seeds; `npm run relay:down` wipes the tmpfs relay. `npm test` stays Docker-free.

## Edge cases

- **Openness:** `runSeed` takes the relay URL as a parameter and the roster is ordinary throwaway keys — no relay/pubkey is special-cased; the same seed runs against any relay. (`VITE_RELAY_URL` defaults to unset ⇒ app behavior unchanged — verified manually.)
- **Duplicates in curation members** are handled by the Story-2 resolver (deduped, order-preserving) — covered there; the seed publishes clean member lists.
- **Re-seed without reset** may duplicate non-replaceable events — out of scope (seed assumes a fresh tmpfs relay); the e2e seeds exactly once after a clean `relayUp`.

## Test infrastructure

- Unit: Vitest (`npm test`), `nostr-tools` only.
- E2E: Vitest + local strfry (Docker) + `nak` (`npm run test:e2e`), reusing `test/e2e/relay.ts` + `test/e2e/harness.ts`.
- Runner wiring: unit gate excludes `test/**/*.e2e.test.ts`; e2e config includes `test/**/*.e2e.test.ts` (so `test/seed/seed.e2e.test.ts` is picked up).

## How to run

```
npm test          # unit gate (incl. the roster unit test) — no Docker
npm run test:e2e  # the seed e2e (and the happy-path harness) — Docker + nak
```

## Verification

RED confirmed on 2026-06-03 before implementation: both suites import `./accounts` / `./seed`, which do not exist yet.
- Unit: `accounts.test.ts` fails to resolve `./accounts` (feature not implemented).
- E2E: `seed.e2e.test.ts` fails to resolve `./seed` (feature not implemented).
Goes GREEN once Implementation adds `test/seed/accounts.ts` + `test/seed/seed.ts` (+ `run.ts`, scripts, the `VITE_RELAY_URL` override). Failing output pasted in the Phase-3 commit message / below.
