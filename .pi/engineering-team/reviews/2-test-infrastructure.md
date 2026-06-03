# Review: Story 2 — Test infrastructure

**Reviewer:** Claude (acting as Reviewer)
**Date:** 2026-06-02
**Diff:** `git diff 06ce494..HEAD` on branch `grantless` (test+impl commits `f2e7b61`, `50059c9`)
**Artifacts:** Story `stories/2-test-infrastructure.md`, ADR `decisions/0002-test-infrastructure.md`, Test plan `stories/2-test-infrastructure.test-plan.md`, Epic `epics/grantless-mvp.md`

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS**
- [x] `npx eslint` — **PASS** (0 errors; 2 pre-existing `react-refresh` warnings in untouched `catallax/` files)
- [x] `npx vitest run` (unit gate) — **PASS** (4 files, 13/13; e2e correctly excluded via `vite.config.ts`)
- [x] `npm run build` — **PASS**
- [x] `npm run test:e2e` — **PASS** (5/5), and **reproducible** on a 2nd clean run
- [x] **Teardown verified** — no `grantless-strfry` container or volume lingers after the suite (tmpfs + `down -v`)

## Spec adherence (acceptance criteria)

- [x] **Relay auto-starts for tests** — `beforeAll(relayUp)` brings up strfry via compose + a host-side `nak` readiness poll.
- [x] **Relay auto-starts for dev** — `npm run dev` now runs `relay:up` before Vite (verified by script; runtime dev is manual).
- [x] **Run isolation / teardown** — tmpfs db ⇒ clean slate each start; the "starts from a clean relay" test asserts zero prior events; 2nd run confirmed clean.
- [x] **Authors real protocol events** — `nak`-based publish/query round-trips kind 1 and all Catallax + 30392 events.
- [x] **Curation chain resolves** — fabricated 30392 with `observer`/`source-tag` resolves by `(curator, slug)`; deduped/ordered members; other curators/slugs don't bleed in.
- [x] **Happy-path lifecycle** — proposed→funded→in_progress→submitted→concluded, mocked 9735 zaps, 3402 referencing task + payout; each transition asserted as the authoritative latest version.
- [x] **Replaceable-event correctness** — an older-`created_at` revision published *after* a newer one does not win.

All 7 ACs met, proven against a real relay.

## ADR adherence — deviations reviewed and **ratified**

ADR 0002 was followed (strfry-in-Docker via compose, nak harness, isolated e2e config, fast unit gate untouched). Four deviations, all discovered by running it and all correct:
1. **Port 7787, not 7777** — 7777 is held by the `tapestry` container on this host. Overridable via `RELAY_PORT`. **Ratified.**
2. **No Docker healthcheck / `--wait`** — the image's busybox `sh` can't do the `/dev/tcp` check; replaced with a host-side `nak` readiness poll, which is more robust. **Ratified.**
3. **Write-policy whitelist disabled** in `strfry.conf` (`plugin = ""`) — the dockurr default ships a whitelist that blocked all test writes (`blocked: pubkey not in whitelist`). Accept-all is correct for a dev/test relay. **Ratified.**
4. **Monotonic `created_at`** in the harness — same-second replaceable re-publishes collided (relay keeps the first). Strictly-increasing timestamps model the real "each revision is newer" invariant. **Ratified** (and it surfaced a genuine replaceable-event gotcha worth carrying into feature stories).

## Things tests can't catch

- [x] No secrets / nsecs / hardcoded pubkeys in the diff (harness mints keys at runtime).
- [x] No leftover debug/`console` code; no commented-out code.
- [x] No resource leak — containers + tmpfs volumes are removed on `afterAll` and before each `up`.
- [x] The lifecycle's `concluded` is published under the **arbiter's** pubkey (a distinct addressable coordinate); `latestTask` resolves via the patron `p`-tag, matching the app's `useTaskProposals` authorized-updater handling. Correct.

## House rules check

- [x] **Open / permissionless / WoT (prime directive):** the local relay is a **dev/test-only** resource, never a prod default or privileged actor. No pubkey/relay is hardcoded or special-cased; the only relay literal is `ws://127.0.0.1:${RELAY_PORT}` (overridable). The curation fixtures model trust exactly as the app reads it (`observer`/`source-tag`), not via hardcoding.
- [x] **Fork test:** anyone with Docker + nak runs it identically; no dependency on a specific operator.
- [x] nsec handling / user signaling: N/A (tooling, no app signing/payments; zaps mocked).

## Findings

### Blocking
None.

### Non-blocking (notes / follow-ups)
1. **`npm run dev` now requires Docker** (it starts the relay). Intended per the AC and fine on this Docker-equipped machine; if Docker is absent, `dev` fails. Acceptable per direction (not optimizing for forkers/CI here).
2. **e2e prerequisites**: Docker daemon + `nak` on PATH. Per ADR; not part of the `npm test` gate.
3. **`mockZapReceipt` is signed by the sender** (a real 9735 is signed by the LNURL server). Acknowledged mock; sufficient for the lifecycle test, revisit if a feature asserts zap-receipt authenticity.
4. **`relay/strfry.conf` is ~198 lines** (vendored default + 3 patched lines). Fine; the patched lines are commented.
5. **Replaceable same-second collision** is now handled in the harness; feature stories that re-publish 33401 from the app must ensure newer `created_at` too (carry into their ADRs — already a cross-cutting epic note).

## Verdict

**PASS.** The harness is real, green (unit 13/13 + e2e 5/5), reproducible, and leaves no residue. All acceptance criteria are met against a live strfry, the prime directive holds (dev/test-only relay, no hardcoded actors), and the four ADR deviations are necessary corrections discovered by actually running it. Mergeable; non-blocking items are noted for later stories.
