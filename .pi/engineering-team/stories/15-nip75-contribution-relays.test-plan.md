# Test Plan: Story 15 — NIP-75 contribution relays

**Story:** `.pi/engineering-team/stories/15-nip75-contribution-relays.md`
**ADR:** `.pi/engineering-team/decisions/0014-nip75-contribution-relays.md`
**Date:** 2026-06-05

## Coverage map

| Criterion | Test | File | Level |
|---|---|---|---|
| Goal relays present + unioned with active set, **de-duplicated**, goal relays kept (not dropped) | `buildZapRequest — relays are de-duplicated, order-preserving` | `src/lib/zap.test.ts` | unit |
| Zap request still carries `e`=goalId and msat amount | `still carries the goal reference and msat amount` | `src/lib/zap.test.ts` | unit |
| Source the goal's declared relays from the goal event | `extractGoalRelays` (values + empty when no tag) | `src/lib/zap.test.ts` | unit |
| ContributeDialog passes `union(goalRelays, activeRelays)` to the zap request | inspection (component wiring; reads cached `useZapGoal` goal) | — | inspection |
| Real Lightning payment / receipt lands on the goal's relays | manual real-wallet verification (no LN backend; Story 13 precedent) | — | manual |

## Edge cases

- [x] **Dedup, order-preserving** — `[goal-a, goal-b, active-a, goal-a]` → `[goal-a, goal-b, active-a]`
      (goal relays first, never dropped, no duplicate).
- [x] **No relays tag on the goal** — `extractGoalRelays` returns `[]` (caller then falls back to the
      active set; the builder dedup makes an empty goal-relays harmless).
- [x] **Openness** — covered by the existing `openness: no recipient or relay is special-cased` test;
      the new relays come only from the goal event + the overridable active set.
- [ ] **ContributeDialog union wiring** — not unit-tested (it's component glue over the cached goal);
      verified by inspection. The pure pieces it composes (`extractGoalRelays`, `buildZapRequest`
      dedup) are unit-tested.

## Why no e2e/Playwright here

The behavior is the *contents of the outgoing zap request* (a 9734 sent to the recipient's LNURL
callback, not published to a relay we can read), so a seeded-relay e2e can't observe it without
intercepting the LNURL HTTP request — low-signal and flaky. The pure builders are unit-tested; the
dialog wiring and the real payment (no Lightning backend on the local strfry) are inspection/manual,
consistent with Story 13.

## How to run

```
npx vitest run src/lib/zap.test.ts
npm test
```

## Verification (pre-implementation)

Confirmed failing 2026-06-05 — exactly the 3 new assertions fail, for the right reasons; the 18
existing zap tests pass:

```
FAIL src/lib/zap.test.ts > buildZapRequest — relays are de-duplicated … (duplicate goal-a remains)
FAIL src/lib/zap.test.ts > extractGoalRelays > returns the values … (extractGoalRelays is not a function)
FAIL src/lib/zap.test.ts > extractGoalRelays > returns an empty array … (extractGoalRelays is not a function)
Tests  3 failed | 18 passed (21)
```
