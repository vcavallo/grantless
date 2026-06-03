# Review: Story 3 — Dev seed

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-03
**Diff:** `git diff b294aba..HEAD` (15 files, +902/-12)

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean).
- [x] `npx eslint` — **PASS** (exit 0; 0 errors, 2 pre-existing warnings in `ArbiterFilters.tsx`/`TaskFilters.tsx`, untouched by this story).
- [x] `npx vitest run` (unit gate) — **PASS** (5 files, 16 tests; includes the 3 new roster tests).
- [x] `npx vite build` — **PASS** (built in ~2.4s; the >500 kB chunk warning is pre-existing, not introduced here).
- [x] `npm run test:e2e` (the proof) — **PASS** (2 files, 14 tests: 5 happy-path + 9 dev-seed, run serially against fresh strfry containers).

## Spec adherence

Walked every acceptance criterion against a test or a verified manual step:

| AC | Evidence | Verdict |
|---|---|---|
| Fixed, deterministic cast (1/2/1/2/3 + list agent) | `accounts.test.ts` — counts, `getPublicKey(sec)===pub`, `npub`/`nsec` round-trip, distinct pubkeys (unit, no nak) | ✅ |
| Seeds to a parameterized relay | `runSeed(RELAY_URL)` in e2e `beforeAll`; relay URL is an argument, not hardcoded | ✅ |
| Profiles for all | e2e "publishes a kind-0 profile for every account" | ✅ |
| `grantless-applicants` resolves to the 2 applicants | e2e resolves via `observer`/`source-tag` → exact members | ✅ |
| `grantless-arbiter` resolves to the 2 arbiters | e2e, same resolver | ✅ |
| Arbiter announcements (33400) | e2e "publishes an arbiter announcement for each arbiter" | ✅ |
| Projects across every status, latest-authoritative | e2e "covering every lifecycle status, each authoritative" — set equals all five; per-task `latestTask` matches | ✅ |
| Replaceable correctness / revision chain | e2e "full revision chain" — concluded task has >1 coordinate, latest is `concluded` | ✅ |
| Funding + conclusion artifacts (9041/9735/3402) | e2e goal+receipts (4 goals, 13 receipts) and 3402 referencing task coord + payout `e` | ✅ |
| Self-assignment surfaced (proposer=worker) + separate worker | e2e "seeds both…"; `seed-submitted-bob-self` (Bob=worker) and Carol on others | ✅ |
| Nsecs available for login | `formatRoster()` printed by `npm run seed` (verified: roster printed) + committed in `accounts.ts` | ✅ manual |
| Browsable in app (local relay) | `VITE_RELAY_URL` override + `npm run dev` wiring | ✅ manual (per test plan; not runner-automatable) |
| Run + teardown; unit gate Docker-free | `npm run seed` / `npm run relay:down`; unit gate excludes `test/**/*.e2e.test.ts` (verified it collects only `accounts.test.ts`) | ✅ |

No criterion silently dropped. No behavior beyond the story (the single app-code touch, `VITE_RELAY_URL`, is explicitly called out in the story's Open Questions and authorized by the ADR).

## ADR adherence

- Files match ADR 0003's implementation notes exactly: `test/seed/{accounts.ts,seed.ts,run.ts}`, the two test files, `vitest.e2e.config.ts` glob broadening, `vite.config.ts` unit-exclude, `package.json` `seed`/`dev`, `src/App.tsx` override, `.env.example`, `test/seed/README.md`.
- Layering respected: `seed.ts` is pure orchestration over the Story-2 harness — **no new event-shaping logic**, no new event kinds, `NIP.md` unchanged.
- No new dependencies: `npm run seed` uses the `vite-node` binary already provided by vitest. Confirmed `package-lock.json` unchanged.

## Things tests can't catch

- **Committed private keys** (`test/seed/accounts.ts`): present **by design** (the story's explicit ask — paste an nsec to act as a role). They are throwaway dev fixtures with a prominent DEV-ONLY header, confer nothing, are not real users, and are not wired into any production path (`git grep` confirms nsecs appear only in the fixture; `App.tsx` references none of them). Accepted under the prime directive's "bootstrapping conveniences" allowance. **Non-blocking, by design.**
- No real `.env` or `dist/` tracked (verified); only `.env.example`.
- No leftover debug logging in `src/`. The `console.*` in `run.ts`/CLI is the intended roster output. The pre-existing `console.log` noise in `useTaskProposals` is out of scope (flagged back in ADR 0001), not touched here.
- No `TODO`/`fixme`/placeholder comments (the custom eslint rules would have blocked them).
- Replaceable footgun handled: status transitions are signed by their acting role (patron → worker → arbiter), so the concluded project leaves a real multi-coordinate history and latest-wins is exercised — consistent with the happy-path harness.

## House rules check

- [x] **Open / permissionless / WoT:** no pubkey/relay/arbiter is special-cased. `runSeed` takes the relay as a parameter and behaves identically for any roster; the curation lists model trust via `observer`/`source-tag`, not hardcoding; seeded keys carry no elevated status.
- [x] **Trust WoT-derived:** the seed fabricates curation data the way Brainstorm would; the app still resolves trust through the chain.
- [x] **Bootstrapping defaults only:** `VITE_RELAY_URL` is unset by default (behavior unchanged), documented in `.env.example`, trivially overridable; the seed relay URL is a parameter defaulting to the local strfry.
- [x] **Fork test:** anyone with Docker + nak runs `npm run seed` against their own relay and gets the same world; points the app anywhere via `VITE_RELAY_URL` or the UI.
- [x] **nsec handling:** the only keys are deliberate, labeled dev fixtures (see above); no real keys touched, logged, or persisted.
- [x] **User signaling:** N/A (tooling; no in-app signing/payments added). Payouts/zaps are mocked, as in Story 2.

## Findings

### Blocking
None.

### Non-blocking
1. **`package.json:7`** — the `dev` script uses POSIX `${VITE_RELAY_URL:-…}` expansion; it won't expand under Windows `cmd`. Cross-platform is explicitly out of scope (local dev-machine, per Stories 2–3), so this is fine; noted for whenever CI/Windows support is taken up.
2. **`test/seed/seed.ts` re-seed on a dirty relay** duplicates non-replaceable events (goals/receipts/conclusions). Documented as out-of-scope (seed assumes a fresh tmpfs relay); `npm run dev`'s `relay:up` reuses a running container, so a manual `relay:down` is the documented reset. Acceptable.
3. **`src/App.tsx:31`** — `import.meta.env.VITE_RELAY_URL` is typed `any` (vite/client index signature), so the `: string | undefined` annotation is a readability aid rather than an enforced type. Harmless.

## Verdict
**PASS** — the diff matches the story, ADR 0003, and the test plan; all four quality gates are clean and both real-event e2e suites pass; house rules (especially the prime directive and nsec handling) are satisfied, with the committed dev keys accepted by design and confirmed unprivileged. Mergeable as-is.
