# Test Plan: Story 2 — Test infrastructure

**Story:** `.pi/engineering-team/stories/2-test-infrastructure.md`
**ADR:** `.pi/engineering-team/decisions/0002-test-infrastructure.md`
**Date:** 2026-06-02

## Approach

This story's deliverable *is* an e2e test harness, so the test is the spec. One real-event e2e suite (`test/e2e/happy-path.e2e.test.ts`) runs against a live local **strfry** (started in `beforeAll`, stopped in `afterAll`), authoring/querying via **nak**. It runs under a dedicated `vitest.e2e.config.ts` (command `npm run test:e2e`), separate from the fast unit gate (`npm test`). The unit gate stays green and Docker-free.

The harness API the test imports (`./relay`, `./harness`) is built in Implementation; the test fails RED until then.

## Coverage map

| Criterion (AC) | Test | Level |
|---|---|---|
| Relay auto-starts for tests | `beforeAll(relayUp)` + "relay is reachable and starts clean" | e2e |
| Run isolation / teardown | "relay starts clean" asserts no prior events at suite start | e2e |
| Authors real protocol events | publish/query round-trip used throughout; explicit round-trip check | e2e |
| Curation chain resolves | "resolves a curator's grantless-applicants list via observer+source-tag" | e2e |
| Happy-path lifecycle | "runs the full Catallax lifecycle, each transition authoritative" | e2e |
| Replaceable-event correctness | "older revision published after newer does not win" | e2e |

(Relay auto-start for **dev** and the `npm run dev` wiring are verified manually — `npm run dev` brings the relay up; not automatable in the unit/e2e runner.)

## Harness API the test expects (built in Implementation)

- `./relay`: `relayUp()`, `relayDown()`, `RELAY_URL`.
- `./harness`: `genAccount()`, `publish(relay, {kind, content?, tags?, sec})`, `query(relay, filter)`, `publishCurationList(relay, {taSec, observer, slug, members})`, `resolveCuration(relay, {curator, slug})`, `publishArbiter`, `publishTask`, `publishGoal`, `mockZapReceipt`, `publishConclusion`, `latestTask(events, {patron, d})`.

## How to run

```
npm run test:e2e
```

## Verification

The e2e fails RED until the harness + relay config exist (missing `./relay` / `./harness` modules + no `test:e2e` script). Confirmed failing for the right reason (modules not implemented, not a typo) on 2026-06-02 — see commit. Goes GREEN once Implementation builds the compose/strfry.conf/harness/scripts.
