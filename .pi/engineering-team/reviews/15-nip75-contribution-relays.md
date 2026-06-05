# Review: Story 15 — NIP-75 contribution relays

**Date:** 2026-06-05
**Reviewer:** Reviewer (Phase 5)
**Story:** `.pi/engineering-team/stories/15-nip75-contribution-relays.md`
**ADR:** `.pi/engineering-team/decisions/0014-nip75-contribution-relays.md`
**Test plan:** `.pi/engineering-team/stories/15-nip75-contribution-relays.test-plan.md`
**Diff reviewed:** `5afaf93~1..HEAD` (failing tests `5afaf93`, impl `e7dbdaa`)

## Verdict: **PASS**

A precise, minimal spec-compliance fix: contributions now advertise the goal's declared relays
(NIP-75 MUST) unioned with the viewer's active set, deduped. Matches the ADR exactly; pure core is
unit-tested; all runnable gates green; no privilege introduced.

## Gates (run by the reviewer)

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | **exit 0** |
| `npx eslint` | **exit 0** |
| `npx vitest run` | **100 passed** (16 files); +4 from `zap.test.ts` (dedupe ×2, `extractGoalRelays` ×2) |
| `npx vite build` | **exit 0** |
| `npx playwright test` | no new/affected specs (change is the outgoing zap request, not UI/relay-published); not executable here (no chromium) |

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| Goal relays present in the zap request | ✅ | `ContributeDialog` passes `[...goalRelays, ...activeRelays]`; `goalRelays` from `extractGoalRelays(zapData.goal)`. |
| Unioned with active set, **de-duplicated** | ✅ | `buildZapRequest` → `['relays', ...new Set(input.relays)]` (order-preserving). Unit-tested. |
| Still carries `e`=goalId + msat amount | ✅ | unchanged tags; unit test `still carries the goal reference and msat amount`. |
| Goal relays not dropped when absent from active set | ✅ | union puts goal relays first; dedupe preserves first-seen; unit `… goal relays kept, not dropped`. |

## ADR conformance

Exactly Option A: `buildZapRequest` dedupe (no signature change); pure `extractGoalRelays`; the caller
(`ContributeDialog`) sources goal relays from the **cached** `useZapGoal(task.goalId)` (shared key with
`CrowdfundSection` — no extra fetch) and unions with the active set. The optional consistency item was
taken — `startWatch`'s `waitForReceipt` poll also uses the union (`ContributeDialog.tsx:93`), so we
watch the goal's relays too. No deviations.

## Openness / permissionlessness

- **No privileged actor.** The zap request's relays are the **goal author's declared relays** + the
  **viewer's overridable active set** — no hardcoded/app-chosen/privileged relay added or removed.
  This *strengthens* the prime directive (contributions follow the goal author's choice). Grep of the
  diff shows no literal relay URLs.
- **Trust from WoT, not client?** Unchanged — pure relay plumbing.
- **Fork test:** ✅ own goal/relays → identical behavior.

## Security / signing

No change to signing/custody: the zap request is still signed by the contributor's signer
(`useLightningZap`); this story only changes which relays the request advertises. No nsec exposure.

## Findings (non-blocking)

1. **Playwright not executed here** (no chromium) — and there are no new or affected specs: the
   behavior is the *contents of the outgoing 9734* (sent to the LNURL callback, not relay-published),
   which the e2e layer can't observe without intercepting the LNURL HTTP request. Pure unit coverage +
   inspection is the right level (per the test plan).
2. **Manual before launch:** real payment + confirming the receipt lands on the goal's relays needs a
   real wallet (no LN backend on the local relay).
3. `contributionRelays` recomputes per render (cheap spread); used only in handlers, so no effect-loop.

None block the story.

## Linked artifacts
- Story / ADR / Test plan as above
- Implementation: `e7dbdaa`; failing tests: `5afaf93`
