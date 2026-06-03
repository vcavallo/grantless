# ADR 0003: Dev seed — fixed-key roster + nak orchestrator on the Story-2 harness

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/3-dev-seed.md`

## Context

Story 3 needs a **reproducible, browsable** local dataset: a fixed cast (1 curator, 2 applicants, 1 separate worker, 3 funders, 2 arbiters, plus the list-publishing agent that signs the curation lists), profiles for all of them, both curation lists (`grantless-applicants`, `grantless-arbiter`) in the real `observer`/`source-tag` shape, arbiter announcements, and projects spanning **every** status (`proposed → funded → in_progress → submitted → concluded`) with mocked funding/conclusion artifacts. The cast's nsecs must be available to paste into the signer so a developer can act as any role, and the dev app must be pointable at the local relay so the UI is browsable.

**Assets to build on (verified):**
- **Story 2 harness** `test/e2e/harness.ts`: `publish()`, `query()`, `publishArbiter()`, `publishTask()`, `publishGoal()`, `mockZapReceipt()`, `publishConclusion()`, `publishCurationList()`, `resolveCuration()`, `latestTask()` — the established nak vocabulary. It already encodes the curation chain (`observer` + `source-tag`) and the monotonic `created_at` invariant for replaceable revisions.
- **Story 2 relay** `relay/docker-compose.yml` (strfry, tmpfs, port `${RELAY_PORT:-7787}`) + `test/e2e/relay.ts` (`relayUp`/`relayDown`/`RELAY_URL`, readiness via a nak round-trip). tmpfs ⇒ every `relay:up` is a clean slate.
- **e2e runner** `vitest.e2e.config.ts` (`npm run test:e2e`), separate from the Docker-free unit gate `npm test`. Resolves the `@` alias.
- **Login** `src/hooks/useLoginActions.ts` → `NLogin.fromNsec(nsec)`; `LoginDialog` accepts a pasted nsec. So a printed nsec is directly usable.
- **Relay config** `src/App.tsx:26-30` `defaultConfig` (`relayUrl: "wss://relay.primal.net"`, `relayMode: "default"`); `src/contexts/AppContext.ts` `AppConfig` supports `relayMode: "custom"` + `customRelay`. **No env override exists today** — the app is pointed at a relay only via the `RelaySelector` UI / localStorage.
- `vite-node` binary ships with vitest (already a devDependency); it resolves the `@` alias from `vite.config.ts`, so a standalone TS script can import the harness.

**Constraints (`.pi/AGENTS.md`, ADR 0002):** keep `npm test` fast and **free of Docker and nak**; the relay and accounts are dev/test-only, never privileged; fixed keys are explicitly requested but must be labeled dev-only fixtures, never wired into a production default; any relay-pointing default must be overridable and default to current behavior when unset. nsec house rule ("treat as radioactive") is in tension with the explicit "surface the nsecs" requirement — resolved by labeling + scoping to dev tooling only (see Openness check).

## Options considered

### Option A — `test/seed/` module: fixed roster + orchestrator reusing the Story-2 harness, run via `vite-node` *(chosen)*
A `test/seed/accounts.ts` holding the fixed, committed, dev-only roster (hex sec + pub + npub + nsec + name per role). A `test/seed/seed.ts` exporting `runSeed(relayUrl)` that drives the harness publishers to lay down profiles, both curation lists, arbiter announcements, and a fixed table of projects across all statuses (incl. one self-assigned and one full-revision-chain task). A thin `test/seed/run.ts` CLI (waits for relay readiness, calls `runSeed`, prints the roster + a summary), wired to `npm run seed` via `vite-node`. `npm run dev` does `relay:up → seed → vite`, with `VITE_RELAY_URL` defaulted to the local relay (overridable). App side: `src/App.tsx` reads `import.meta.env.VITE_RELAY_URL` and, when set, defaults `relayMode:"custom"` + `customRelay` to it; unset ⇒ unchanged.
- **Pros:** Reuses the reviewed, working harness verbatim (one source of truth for event shapes); the fixed roster is pure data (unit-testable for fixity with `nostr-tools` alone, no nak); `vite-node` adds no dependency; keeps `npm test` Docker/nak-free; the relay override is a clean, overridable, no-status default.
- **Cons:** Committing private keys (even throwaway) needs careful labeling and a Reviewer sign-off; `npm run dev` now also seeds (slightly slower start); touches one app file (`App.tsx`) for the relay override.

### Option B — Seed as a special vitest "test" that publishes (no separate CLI)
Drive the seed from inside a vitest file run on demand.
- **Pros:** No `vite-node`/CLI entry; reuses the e2e runner's alias + lifecycle.
- **Cons:** Conflates "seed my dev relay" with "run tests" (vitest tears down / is not a natural `npm run dev` step); awkward to invoke as part of `dev`; the roster printout fights vitest's reporter. **Rejected** — a seed is an operational command, not a test; it should be runnable standalone.

### Option C — Generate keys at runtime from fixed string seeds (deterministic derivation) instead of committing them
Derive each role's key by hashing a fixed label (e.g. `sha256("grantless-dev-curator")`).
- **Pros:** No literal secrets committed; still deterministic/"always the same."
- **Cons:** The nsec a developer must paste is then *computed*, so we'd print/commit it anyway to make it usable — the secret ends up visible regardless, with more indirection. Derivation logic is one more thing to get right and to keep stable across libc/runtime. **Rejected** — committing labeled, dev-only fixtures is simpler and the keys are non-secret by construction. (Noted as a fallback if we ever want to avoid literal keys.)

## Decision

**Option A.** A `test/seed/` module (fixed roster + harness-driven orchestrator) run by a `vite-node` CLI, plus an overridable `VITE_RELAY_URL` so the dev app auto-points at the local relay. This maximally reuses Story 2, keeps the unit gate clean, and surfaces the nsecs the explicit way the story asks — scoped, labeled, and unprivileged.

## Consequences

- **Enables** Story 4+ to develop and be visually tested against a stable, realistic world; lets a developer log in as any role to exercise write flows by hand before those flows are automated.
- **No new event kinds; `NIP.md` unchanged.** No new runtime/`dependencies`; uses the `vite-node` binary already provided by vitest (dev tooling).
- **Touches one app file** (`src/App.tsx`) for the `VITE_RELAY_URL` override — the single app-code change, deliberately minimal and openness-clean (unset ⇒ current behavior).
- **Broadens** `vitest.e2e.config.ts`'s include glob from `test/e2e/**` to `test/**/*.e2e.test.ts` so the seed e2e under `test/seed/` is picked up (additive).
- **Commits dev-only private keys.** Acceptable per the explicit story requirement and the prime directive (they confer nothing); mitigated by prominent DEV-ONLY headers, a unit test asserting they are internally consistent fixtures, and the Reviewer confirming none is wired into a prod path. The seed prints them, labeled, because that is the feature.
- **`npm run dev` now seeds** after bringing the relay up (tmpfs ⇒ fresh each time, so the seed must re-run per start). Standalone `npm run seed` and `relay:down` remain available.
- Establishes the **fixed-roster** convention later stories reuse when they need named actors in manual testing.

## Implementation notes

Concrete targets for the Implementer:

- **`test/seed/accounts.ts`** (new — pure data, no nak):
  - A prominent header: *DEV-ONLY THROWAWAY KEYS — never used on mainnet, never real users, never a production default.*
  - `export interface SeedAccount { name: string; sec: string; pub: string; npub: string; nsec: string }` (sec/pub are 64-char hex).
  - `export const ROSTER` with named roles: `ta`, `curator`, `applicants: [a1, a2]`, `worker`, `arbiters: [arb1, arb2]`, `funders: [f1, f2, f3]`. Generate the 10 keypairs once with nak during implementation and paste the literal values; fill `npub`/`nsec` with the encoded forms.
  - `export function formatRoster(): string` — a human-readable role → npub + nsec table (used by `run.ts` and printable).
- **`test/seed/seed.ts`** (new — orchestration, reuses `../e2e/harness`):
  - `export interface SeedSummary { profiles: number; curationLists: number; arbiters: number; tasks: Array<{ d: string; patron: string; status: string; worker?: string }>; goals: number; receipts: number; conclusions: number }`.
  - `export async function runSeed(relayUrl: string): Promise<SeedSummary>`:
    1. Publish kind-0 profiles (`publish(relayUrl, { kind: 0, content: JSON.stringify({ name }), sec })`) for every account.
    2. `publishArbiter(relayUrl, { sec: arb.sec, d })` for both arbiters.
    3. `publishCurationList(relayUrl, { taSec: ta.sec, observer: curator.pub, slug: 'grantless-applicants', members: [a1.pub, a2.pub] })` and the same for `slug: 'grantless-arbiter'` with `[arb1.pub, arb2.pub]`.
    4. A fixed `PROJECTS` table covering every status, distributed across both applicants and both arbiters, including **one self-assigned** (`worker === patron`, status `submitted`) and **one published through its full revision chain** to `concluded` (proposed→funded→in_progress→submitted→concluded, re-publishing the replaceable 33401 so latest-wins is exercised). For `funded`+ projects, `publishGoal` + `mockZapReceipt` from the funders; for `concluded`, a payout `mockZapReceipt` to the worker + `publishConclusion`.
    - Returns the `SeedSummary`. Pure orchestration over the harness — no new event-shaping logic.
- **`test/seed/run.ts`** (new — CLI entry for `vite-node`):
  - Resolve the relay URL from `process.env.SEED_RELAY_URL ?? process.env.RELAY_URL ?? 'ws://127.0.0.1:7787'`.
  - Wait for relay readiness (a short nak `req` retry loop, mirroring `relay.ts`'s readiness check — keep it local to avoid importing Docker lifecycle), then `await runSeed(url)`, then print `formatRoster()` + the summary. Non-zero exit on failure.
- **`test/seed/accounts.test.ts`** (new — unit, runs under `npm test`, **no nak/Docker**): using `nostr-tools` only — for each account assert `getPublicKey(hexToBytes(sec)) === pub`, `nip19.npubEncode(pub) === npub`, `nip19.nsecEncode(hexToBytes(sec)) === nsec`; assert exact role counts (1/2/1/2/3 + ta) and that all pubkeys are distinct. Proves the fixtures are deterministic and self-consistent without touching a relay.
- **`test/seed/seed.e2e.test.ts`** (new — e2e, `npm run test:e2e`): `relayUp()` → `runSeed(RELAY_URL)` → assert: profiles present for all; `resolveCuration` for `grantless-applicants` === the 2 applicant pubkeys and for `grantless-arbiter` === the 2 arbiter pubkeys; both arbiters have a 33400; the set of **latest** task statuses covers all five; the revision-chain task's latest is `concluded` (stale revisions don't win); the concluded task has a 3402 referencing its task `a`-coord + a payout `e`; funded+ tasks have a 9041 + ≥1 9735; at least one task has `worker === patron` and at least one has `worker === ROSTER.worker.pub`. Openness: `runSeed` takes the relay URL as a parameter (no hardcoded relay).
- **`vitest.e2e.config.ts`**: change `include` to `['test/**/*.e2e.test.ts']`.
- **`package.json` scripts**: add `"seed": "vite-node test/seed/run.ts"`; change `"dev"` to `"npm i && npm run relay:up && npm run seed && vite"` and rely on `VITE_RELAY_URL` (set with a default in the script or `.env`, overridable). Keep `relay:up`/`relay:down`/`test`/`test:e2e` unchanged.
- **`src/App.tsx`**: in `defaultConfig`, when `import.meta.env.VITE_RELAY_URL` is a non-empty string, default `relayMode: "custom"` and `customRelay: import.meta.env.VITE_RELAY_URL` (and set `relayUrl` to it for display); otherwise leave the current default. A short comment marks it a documented, overridable convenience.
- **`.env.example`** (new or extended): document `VITE_RELAY_URL=ws://127.0.0.1:7787` as an optional dev convenience (commented), pointing at the local strfry. **`test/seed/README.md`** (new, short): what the seed does, how to run (`npm run seed` / it runs under `npm run dev`), the DEV-ONLY key warning, and how to paste an nsec into the signer.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. The relay and all accounts are dev/test-only; the curator/arbiters/applicants are ordinary throwaway pubkeys with no special status — `runSeed` would behave identically for any roster against any relay. The curation lists model trust via `observer`/`source-tag`, exactly as the app reads it, not via hardcoding. ✅ no.
- **Trust WoT-derived, not encoded?** Yes — the seed *fabricates curation data* the same way Brainstorm would; the app still resolves trust through the chain. Nothing in the app privileges a seeded key. ✅ yes.
- **Hardcoded defaults introduced?** `VITE_RELAY_URL` — unset by default (current behavior unchanged), documented in `.env.example`, trivially overridable, no elevated status. The seed relay URL defaults to the local strfry but is a parameter/override. ✅
- **Committed private keys?** Yes, but they are non-secret dev fixtures (confer nothing, never real users, never a prod default), prominently labeled, and unit-tested only for internal consistency. A forker regenerates their own with nak. ✅
- **Fork test:** anyone with Docker + nak runs `npm run seed` against their own relay and gets the same browsable world; points the app at any relay via `VITE_RELAY_URL` or the UI. ✅ yes.

## Out of scope
- The curator selector UI and feature flows (Stories 4–11) — this ADR produces data + accounts only.
- Real Lightning settlement (zaps/payouts mocked, per Story 2).
- Playwright browser e2e (Story 2.5), CI/cross-platform portability.
- Re-seed-without-reset idempotency for non-replaceable events — the seed assumes a fresh tmpfs relay.
- Negentropy mirroring of real curation data — later epic chore.
