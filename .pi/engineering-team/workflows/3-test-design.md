# Phase 3: Test Design

> **Prime directive:** Catallax is open, permissionless, and WoT-based — no pubkey, relay, or arbiter has special privileges or capabilities; trust is Web-of-Trust based. Where the feature touches this, *assert* it in tests: a non-default relay/arbiter works identically, no pubkey is special-cased, and overriding a hardcoded default via ENV/config behaves the same as the default. Full statement: `.pi/AGENTS.md` → House rules.

## Role
Tester. See `.pi/engineering-team/roles/tester.md`.

## Input
- An approved user story.
- An approved ADR (or design doc).

## Output
1. A test plan at `.pi/engineering-team/stories/<n>-<slug>.test-plan.md`.
2. Failing tests committed to the project's test directory.
3. Verification: `npm test` runs and the new tests fail for the right reason.

## Steps

1. **Map every acceptance criterion to at least one test.** If a criterion can't be tested, push back to PO/Architect.
2. **Start with the outermost tests.** Feature/e2e level first (Playwright/Puppeteer for UI flows, integration tests with local relay + nak for protocol behavior). These are the "outer ring" of the outside-in TDD approach.
3. **Decide test levels.** Unit, integration, e2e. Pick the highest-confidence level you can afford to run frequently. Default to integration (local relay + nak) for anything involving Nostr events.
4. **Use the project's testing approach:**

   - **Unit tests**: Vitest — isolated logic, pure functions, wrapper layer
   - **Integration tests**: Vitest + local relay + `nak` — real Nostr protocol behavior, no live relays
   - **E2E tests**: Playwright or Puppeteer — browser-level user flow confidence
   - All three levels required

5. **Write failing tests.** Test names should describe behavior in plain language.
6. **Run `npm test`.** Confirm the tests fail — and that they fail because the feature isn't implemented, not because of a typo or import error.
7. **Show plan + diff.** Iterate to approval.
8. **Gate:** "Test plan approved and tests fail correctly? Ready for Implementation?"
9. Hand off to `/skill:implement-feature`.

## Common pitfalls
- Testing implementation details that the spec doesn't constrain. Brittle.
- Single happy-path test. Edge cases need explicit tests too.
- Skipping the "confirm the test fails" step. A test that doesn't actually fail tells you nothing.

## Per-phase commits
yes. Commit the failing tests before moving on. The commit message should make clear these are intentionally failing: `git commit -m "test(failing): <slug> — outer tests for story <n>"`.
