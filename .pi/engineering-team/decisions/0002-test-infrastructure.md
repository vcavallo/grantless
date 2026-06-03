# ADR 0002: Test infrastructure — strfry-in-Docker + nak e2e harness

**Status:** Accepted
**Date:** 2026-06-02
**Story:** `.pi/engineering-team/stories/2-test-infrastructure.md`

## Context

Story 2 needs a local relay + an e2e harness so every later feature is TDD'd against real Nostr events (the project's stated philosophy: nak + a local relay, not mocks). Requirements: relay auto-starts for tests and dev; the harness authors real protocol + curation-chain events and queries them; runs are isolated (teardown); and one happy-path Catallax lifecycle test proves it.

**Environment probed (this machine):**
- Docker `28.5.2` daemon up, `docker compose 2.40.3`, image pulls work.
- `nak 0.16.2` present, incl. `nak serve` (in-memory relay) as a fallback. nak authors multi-value tags via `;` (`-t "source-tag=v1;v2;v3"`) — needed for the `source-tag` chain.
- No `strfry` binary → use a Docker image.
- vitest supports `setupFiles`/`globalSetup` (`vite.config.ts:19-25`).

**Proven before deciding (round-trips on this machine):**
- `dockurr/strfry` starts and serves once given (a) a writable LMDB dir at `/app/strfry-db/` and (b) `nofiles = 0` in `strfry.conf` — its default `nofiles = 1000000` exceeds the host max (524288) and crashes the relay. With both, kind-1 events publish and read back via `nak`.

**Existing code to reuse:** `src/lib/catallax.ts` parsers (`parseTaskProposal`, `CATALLAX_KINDS`) and the live curation shape (`observer`/`source-tag` on kind 30392, per ADR/epic). `src/lib/grantless.ts` (`extractNomineePubkeys`) for member extraction.

**Constraints (`.pi/AGENTS.md`):** local relay must be a dev/test-only resource, never a privileged prod default. Keep `npm test` (the unit gate) fast and not Docker-coupled.

## Options considered

### Option A — strfry-in-Docker (compose) + nak harness, e2e as a separate vitest project *(chosen)*
A `dockurr/strfry` service via docker compose with a committed `strfry.conf` (`nofiles = 0`, permissive write policy) and a **tmpfs** db (RAM-backed → wiped on stop, free isolation). A thin TS harness shells out to `nak` to author/query. The happy-path e2e is a **separate vitest config** (`test:e2e`) whose `globalSetup` brings the relay up/down. `npm test` stays exactly as-is.
- **Pros:** matches the prod relay (strfry); proven to run here; tmpfs gives teardown for free; keeps the fast unit gate Docker-free; honors the "use nak" directive.
- **Cons:** adds Docker + nak as e2e prerequisites; shelling to nak per event is slower than in-process publishing.

### Option B — `nak serve` (in-memory) instead of strfry
- **Pros:** zero Docker, instant start/stop, simplest.
- **Cons:** not the prod relay; the user explicitly chose strfry-in-Docker for prod-parity. **Rejected** — but kept documented as the fast fallback if Docker is ever unavailable (the harness's relay layer is the only thing that would change).

### Option C — in-process authoring via nostr-tools/nostrify (no nak)
- **Pros:** faster, dependency-light, no CLI shell-outs.
- **Cons:** the user explicitly wants nak as the test tool; nak is the project's stated harness vocabulary. **Rejected** to honor that; in-process helpers can be added later if speed matters.

## Decision

**Option A.** strfry-in-Docker (compose) + a nak-based TS harness, with the Docker-dependent e2e isolated in its own vitest config/command so the existing `npm test` gate is untouched and fast. The relay's db is tmpfs for guaranteed per-run isolation.

## Consequences

- Adds **Docker + `nak` on PATH** as prerequisites for the e2e command (not for `npm test`). Acceptable per direction (local dev-machine use; not optimizing for CI/forkers).
- New committed test assets: a compose file + `strfry.conf`. No new event kinds; `NIP.md` unchanged.
- `npm test` (tsc + eslint + vitest unit + build) stays as the fast gate; the relay e2e is `npm run test:e2e`.
- tmpfs db ⇒ every relay start is a clean slate ⇒ AC "run isolation" is structural, not cleanup-dependent.
- Establishes the harness vocabulary (author via nak, assert via nak/lib parsers) every later feature story reuses.
- The relay layer is swappable (Option B fallback) without touching test logic.

## Implementation notes

- **`relay/strfry.conf`** (committed): derived from `dockurr/strfry`'s default, with `nofiles = 0`, `db = "/app/strfry-db/"`, and a permissive (accept-all) write policy. Header comment: dev/test only.
- **`relay/docker-compose.yml`** (committed): one `strfry` service, image `dockurr/strfry`, port `${RELAY_PORT:-7777}:7777`, mounts `./strfry.conf:/etc/strfry.conf`, db on a **tmpfs** mount at `/app/strfry-db`. A fixed container name for easy lifecycle control.
- **`test/e2e/relay.ts`**: `relayUp()` / `relayDown()` via `docker compose -f relay/docker-compose.yml up -d --wait` / `down -v`, plus a readiness check (a nak publish/req round-trip) before returning. `RELAY_URL` derived from `RELAY_PORT` (default `ws://127.0.0.1:7777`).
- **`test/e2e/nak.ts`**: thin wrappers over `child_process` — `genKey()`, `pubkey(sec)`, `publish({kind, content, tags, sec}, relay)` (mapping tag arrays to `nak event -t name=v1;v2;…`), `query(filter, relay)` → parsed events. Multi-value tags use the `;` syntax confirmed in nak.
- **`test/e2e/fixtures.ts`**: account roster generator; `publishCurationList({curator, slug, members, relay})` → a kind-30392 with `observer`, `source-tag=[id, tagAuthor, slug]`, `p` members; `resolveCuration({curator, slug, relay})` → members, filtering on `observer == curator && source-tag[3] === slug` (mirrors what the app will do); `mockZapReceipt({goalId, sender, amount, relay})` → a kind-9735 referencing the 9041 goal (fake bolt11/amount — no real Lightning).
- **`test/e2e/happy-path.e2e.test.ts`**: drives the full lifecycle (33400 arbiter announce → 33401 proposed → 9041 goal + mocked 9735s → 33401 funded → in_progress → submitted → 3402 concluded), re-publishing the replaceable 33401 each transition. After each transition, query the relay and assert the **latest `created_at`** version is the expected status (latest-wins selection done inline in the test — no hook refactor). Final asserts: task status `concluded`; a 3402 references the task + payout receipt. Uses `parseTaskProposal` from `src/lib/catallax.ts` to validate the app's parser against real events. (Crowdfunding goal-sum math intentionally not asserted, per the story.)
- **`vitest.e2e.config.ts`**: includes `test/e2e/**/*.e2e.test.ts`, sets `globalSetup` (relay up/down), long `testTimeout`, single-threaded/serial.
- **`package.json` scripts**: `relay:up`, `relay:down`, `test:e2e` (= relay up → `vitest run -c vitest.e2e.config.ts` → relay down), and a dev convenience so `npm run dev` brings the relay up alongside Vite (a `predev`-style relay start, or a `dev:full` that runs both; leave the bare `dev` working if Docker is absent). `.gitignore` any local relay scratch dirs.

## Openness / permissionlessness check (required)

- **Privileged actors?** None. The local relay is a dev/test-only resource; the harness mints throwaway keys; no pubkey/relay is special-cased. ✅
- **Trust WoT-derived, not encoded?** N/A (tooling) — and the curation fixtures model trust exactly as the app reads it (`observer`/`source-tag`), not via hardcoding. ✅
- **Hardcoded defaults introduced?** The relay URL/port are env-overridable; the relay is never wired into the app's prod defaults. ✅
- **Fork test:** anyone with Docker + nak runs the harness identically; no dependency on a specific operator/infra. ✅

## Out of scope

- **Playwright** browser e2e — fast-follow (Story 2.5).
- **Dev seed** (fixed nsecs, browsable data) — Story 3.
- Extracting the `useTaskProposals` dedup into a shared helper — not needed here (the e2e selects latest-wins inline); a later feature story may do it.
- Real Lightning settlement, CI/cross-platform portability.
