# Story 2: Test infrastructure — local relay + e2e harness

**Status:** Done
**Created:** 2026-06-02
**Type:** Feature (infrastructure)

## Background
Per the project's testing philosophy (real events on a local relay via `nak`, not mocks) and the Grantless MVP epic, every feature from here is TDD'd. That requires a foundation that doesn't exist yet: a local relay we control, a harness that authors real Nostr events, and a way to tear everything down between runs. This story builds that foundation and proves it with one full happy-path Catallax lifecycle test. It does **not** build the dev seed (Story 3) or any feature.

## User-facing description
As a Grantless developer, I want a local relay plus an e2e harness that exercises real Nostr events end-to-end, so that I can TDD the write/browse features against real protocol behavior instead of mocks — and trust that each run starts clean.

## Acceptance criteria
- [ ] **Relay auto-starts for tests.** Given the test command runs, then a local strfry relay is started and reachable for the duration of the suite, with no manual setup step.
- [ ] **Relay auto-starts for dev.** Given the dev environment is started, then the same local relay is available and the app can be pointed at it.
- [ ] **Run isolation / teardown.** Given two consecutive test runs, then the second sees none of the first run's events — state does not persist across runs.
- [ ] **Authors real protocol events.** Given the harness, when a test publishes accounts and events — Catallax `33400`/`33401`/`9041`/`9735`/`3402` and a curation `30392` carrying `observer` + `source-tag` — then those events are present and queryable on the local relay.
- [ ] **Curation chain resolves.** Given a fabricated `30392` with `observer=<curator>` and `source-tag` slug `grantless-applicants`, when resolved by `(curator, slug)`, then exactly that list's member `p` pubkeys come back — proving the harness can produce the curation data Story 4 will consume.
- [ ] **Happy-path Catallax lifecycle (the proof).** Given fresh test accounts, when the suite runs the full flow — applicant creates a task (`proposed`) → an arbiter is set → funders crowdfund a `9041` goal with **mocked** zap receipts → the task is marked `funded` → a worker is assigned (`in_progress`) → work is submitted (`submitted`) → the arbiter concludes satisfactory with a (mocked) payout and a `3402` (`concluded`) — then **each status transition is observable, in turn, as the task's authoritative latest version**, and the final `3402` references the task and the payout receipt. (Exact crowdfunding goal-sum math is **not** a required assertion — the funding *step* and the resulting `funded` status are what matter.)
- [ ] **Replaceable-event correctness.** Given the `33401` was replaced across the lifecycle (proposed → funded → in_progress → submitted → concluded), when the task is queried, then only the latest version is treated as current — no stale revision leaks (the pattern later stories depend on).

## Out of scope
- **Browser-level (Playwright) e2e** — fast-follow as a Story 2.5 right after this nak/event-level harness works.
- **Dev seed** (fixed nsecs, browsable historical data, login-ready accounts) — Story 3.
- The **curator selector UI** and the seven feature flows — Stories 4–11 (this story gives them the harness).
- **Real Lightning** settlement — zaps are mocked (fabricated `9735` receipts); no real payments.
- **Precise crowdfunding math** assertions (goal-sum, payout splits) — the flow is exercised, but the math isn't the bar here.
- **CI / cross-platform** portability — local dev-machine use is sufficient for now (per direction).

## Openness check
The local relay is a **dev/test-only** resource, never a prod default or privileged actor — a standard strfry anyone could run. The harness authors events for arbitrary keys it generates; nothing is special-cased. Consistent with the prime directive.

## Open questions
- None outstanding. Resolved during planning: Playwright is a fast-follow (not this story); kept as one story; the happy-path assertions focus on **state transitions** (each authoritative in turn), with crowdfunding goal-math intentionally not a required assertion.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md`
- ADR: `.pi/engineering-team/decisions/0002-test-infrastructure.md`
- Test plan: `.pi/engineering-team/stories/2-test-infrastructure.test-plan.md`
- Review: `.pi/engineering-team/reviews/2-test-infrastructure.md` — **PASS**
