# Test Plan: Story 12 — Become an Arbiter

**Story:** `.pi/engineering-team/stories/12-become-an-arbiter.md`
**ADR:** `.pi/engineering-team/decisions/0011-become-an-arbiter.md`
**Date:** 2026-06-04

## Coverage map

| Criterion | Test name | Test file | Level |
|---|---|---|---|
| AC-1 (logged-in announce → real 33400 discoverable) | `announces an arbiter service, lands a real 33400, and is told they are not yet selectable` | `test/browser/become-arbiter.spec.ts` | e2e (real relay) |
| AC-1 (event shape) | `buildArbiterAnnouncementTemplate — minimal …` + `round-trips through the existing parser` | `src/lib/catallax.buildArbiterAnnouncement.test.ts` | unit |
| AC-2 (logged-out → login prompt, no publish) | `logged-out: the Become an Arbiter flow prompts login and publishes no announcement` | `test/browser/become-arbiter.spec.ts` | e2e |
| AC-3 (announced ≠ vouched message) | (same as AC-1 e2e — asserts the "not yet selectable" panel + an About link) | `test/browser/become-arbiter.spec.ts` | e2e |
| AC-4 (repeat visit reflects existing service) | `an arbiter who already announced sees the entry point reflect it` | `test/browser/become-arbiter.spec.ts` | e2e |
| AC-5 (About CTA leads into the flow) | `the About page CTA leads into the Become an Arbiter flow` | `test/browser/become-arbiter.spec.ts` | e2e |
| AC-6 (arbiter identity surfaced where chosen) | builder emits the `p` announcer tag (round-trip parses `arbiterPubkey`); task-side disclosure is pre-existing (Story 6 / `FilteredArbiterSelect`, `NomineeProjectItem` arbiter line) | `src/lib/catallax.buildArbiterAnnouncement.test.ts` | unit + pre-existing |

## Edge cases

- [x] **Minimal vs full input.** The builder is tested with only the required fields (omits the
      optional `about`/`r`/`min_amount`/`max_amount`/category tags) and with all optionals present.
- [x] **Round-trip agreement.** The builder's output parses back through the existing
      `parseArbiterAnnouncement`, proving the new builder and the consumer agree on the 33400 shape.
- [x] **Openness / permissionlessness.** `buildArbiterAnnouncementTemplate — openness: no pubkey is
      special-cased` builds for two different announcers and asserts each is tagged as itself with
      identical `d`/fee terms — no key is privileged. The e2e announce runs as a plain applicant key
      (Alice), not a seeded "arbiter", proving announcing is permissionless for any key.
- [x] **Replaceable re-announce.** Covered implicitly: `d = generateServiceId(name)`; the repeat-visit
      e2e logs in as a seeded arbiter (Dave) who already has a 33400 and asserts the entry point
      reflects it rather than implying none.
- [ ] Field validation (empty name / non-numeric fee) — left to the form's zod schema; not asserted
      here (low-signal UI validation, per the house "don't over-test" guidance).

## Test infrastructure

- **Unit:** Vitest — pure `buildArbiterAnnouncementTemplate`, round-tripped through
  `parseArbiterAnnouncement`. No relay, no mocks.
- **E2E:** Playwright against the seeded local strfry (the `playwright.config.ts` webServer brings up
  the relay, seeds it, and starts Vite pointed at `ws://127.0.0.1:7787`). The announce test asserts a
  **real kind-33400** on the relay via the nak harness `query(RELAY_URL, …)` — real events, not mocks
  (per the AGENTS.md "prefer real-event e2e over mocked-useNostr" rule).
- **Fixtures:** the existing dev seed (curators, applicants, and seeded arbiters Dave/Erin with
  `svc-grantless` 33400s). New helper export `DAVE` in `test/browser/helpers.ts`.

### Labels/handles the Implementer must provide (so these tests pass)

- A trigger button matching `/become an arbiter/i` (and, when the user already has a service,
  `/update arbiter service|announced/i`).
- The dialog auto-opens on `/?compose=arbiter`.
- Form controls: a field labelled `/service name/i`, a fee-type `combobox` with a `/flat/i` option,
  a field labelled `/fee amount/i`, and a submit button matching `/announce|publish/i`.
- A post-success panel containing text matching `/not yet (selectable|vouched)|vouch/i` and a link
  matching `/about|how/i`.
- An About-page CTA link matching `/become an arbiter/i` pointing at `/?compose=arbiter`.

## How to run

```
# unit
npx vitest run src/lib/catallax.buildArbiterAnnouncement.test.ts
# e2e (needs a working chromium; on NixOS set PLAYWRIGHT_CHROMIUM_PATH)
npx playwright test test/browser/become-arbiter.spec.ts
# full gate
npm test
```

## Verification

The new tests fail with the current code. Confirmed 2026-06-04 (pre-implementation):

- **Unit** — fails for the right reason (function not yet implemented):

```
FAIL src/lib/catallax.buildArbiterAnnouncement.test.ts
TypeError: (0 , buildArbiterAnnouncementTemplate) is not a function
 ❯ src/lib/catallax.buildArbiterAnnouncement.test.ts:29:16
```

- **E2E** — the spec collects cleanly (no syntax/import errors); all 4 tests are listed by
  `playwright test --list`. Execution is blocked **in this environment only** (the sandbox lacks
  `libnspr4`/nss for the bundled chromium — all launches fail at browser start, not at assertions);
  the Implementer/Reviewer runs it with a working chromium (`PLAYWRIGHT_CHROMIUM_PATH`). The tests
  necessarily fail pre-implementation: there is no "Become an Arbiter" trigger, dialog, `compose`
  param, or About CTA yet.

```
Listing tests:
  [chromium] › become-arbiter.spec.ts:12 › logged-out: … prompts login and publishes no announcement
  [chromium] › become-arbiter.spec.ts:21 › … announces an arbiter service, lands a real 33400, …
  [chromium] › become-arbiter.spec.ts:44 › an arbiter who already announced sees the entry point reflect it
  [chromium] › become-arbiter.spec.ts:53 › the About page CTA leads into the Become an Arbiter flow
Total: 4 tests in 1 file
```
