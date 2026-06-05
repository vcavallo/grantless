# Story 15: NIP-75 contribution relays (zap the goal's relays)

**Status:** Draft
**Created:** 2026-06-05
**Type:** Bug

## Background

NIP-75 (kind 9041 zap goal) is explicit about where a goal's zaps live: the goal's `relays` tag lists
the relays where zaps "**will be sent to and tallied from**," and a client zapping a goal "**MUST
include the relays in the `relays` tag of the goal event in the zap request** `relays` tag."

Our contribute flow (Story 13) violates this. When a funder contributes, the produced zap request
(kind 9734) advertises the **funder's active relay set**, not the **goal's** declared relays. So the
resulting 9735 receipt can be published to relays the goal never advertised — where a spec-compliant
tally (which reads the goal's relays) will never find it. The contribution is real, but it can become
invisible to anyone counting the goal correctly.

(The read side was already hardened — `useZapGoal` now tallies from `union(active, goal.relays)`,
commit `c5ca929`. This story fixes the **write** side so contributions are published where the goal
says to look, per the spec.)

## User-facing description

As a funder contributing to a project's crowdfund goal, I want my contribution published to the
relays the **goal** declares (per NIP-75), so it is tallied toward that goal by any compliant
client — while still being resilient enough that a contribution isn't lost if a relay misbehaves.

## Acceptance criteria

Testable from the outside (the real Lightning payment itself remains manual-verify, as in Story 13 —
no Lightning backend on the local relay; these criteria are about the zap request the client builds).

- [ ] Given a goal whose event declares a `relays` tag, when I start a contribution, then the zap
      request the client produces includes **the goal's declared relays** in its `relays` tag
      (satisfying the NIP-75 MUST).
- [ ] Given the same contribution, the zap request's `relays` tag also includes **my active relay
      set** (union with the goal's relays, de-duplicated) — so we comply with the spec *and* stay
      resilient to servers that ignore the relays tag.
- [ ] Given the zap request, it still carries the goal reference (`e` tag = the goal event id), so
      the resulting receipt is attributable to the goal.
- [ ] Given a goal that declares relays I am not currently connected to, when I contribute, then
      those goal relays still appear in my zap request's `relays` tag (the goal's relays are not
      dropped just because they aren't in my active set).

## Out of scope

- **The read/tally side** — already hardened in `c5ca929` (`useZapGoal` reads `union(active,
  goal.relays)`).
- **Whether the LNURL server honors the relays tag** — that's server-side and outside our control;
  this story only fixes the request *we* build (and the read side already compensates for
  non-compliant servers).
- **The goal's own `relays` tag / the dev seed** — the goal already declares relays correctly
  (`buildZapGoalTemplate` writes the active set at open-for-funding); the seed's localhost relay is a
  valid dev address and not changed here.
- **Real Lightning payment verification** — manual, with a real wallet (Story 13 precedent).

## Openness check

Clean. The zap request's relays come entirely from **the goal event** plus the **viewer's
overridable active relay set** — no hardcoded, privileged, or app-chosen relay is introduced. A
forker pointed at their own goal/relays gets identical behavior. This actually *strengthens* the
prime directive: contributions follow the goal's own declared relays (the goal author's choice),
not anything the client imposes.

## Open questions

- **Where the contribute flow reads the goal's relays** (it has the goal id; the goal event carries
  the `relays` tag) — an Architect call on the cleanest source, not a blocker.
- **Dedup/order** of the unioned relay list — minor, Architect's discretion.

## Linked artifacts
- Source intent: 2026-06-05 — read NIP-75 together; goal `relays` is "sent to and tallied from," and
  zappers MUST echo it.
- Spec: NIP-75 (kind 9041); related NIP-57 (9734 zap request / 9735 receipt).
- Related: `src/lib/zap.ts` (`buildZapRequest`), `src/components/grantless/ContributeDialog.tsx`
  (passes the active set today), `src/hooks/useZapGoal.ts` (read side, already hardened `c5ca929`).
- ADR: `.pi/engineering-team/decisions/0014-nip75-contribution-relays.md`
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
