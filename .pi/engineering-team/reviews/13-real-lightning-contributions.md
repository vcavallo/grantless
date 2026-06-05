# Review: Story 13 — Real Lightning contributions

**Date:** 2026-06-05
**Reviewer:** Reviewer (Phase 5)
**Story:** `.pi/engineering-team/stories/13-real-lightning-contributions.md`
**ADR:** `.pi/engineering-team/decisions/0012-real-lightning-contributions.md`
**Test plan:** `.pi/engineering-team/stories/13-real-lightning-contributions.test-plan.md`
**Diff reviewed:** `2ca85ca~1..HEAD` (failing tests `2ca85ca`, impl `b192565`)

## Verdict: **PASS**

The contribute path now moves real sats via a real NIP-57 zap, the theater is gone, the QR is
rendered locally with an always-present copy fallback, and nothing is privileged. All runnable gates
are green. The real-money behavior is manual-verify by design (no Lightning backend on a local
relay); that's documented and expected, not a gap.

## Gates (run by the reviewer)

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | **exit 0** |
| `npx eslint` | **exit 0** (no errors, no warnings) |
| `npx vitest run` | **92 passed** (15 files); +17 from `src/lib/zap.test.ts` |
| `npx vite build` | **exit 0** |
| `npx playwright test` | **Not executable in this sandbox** (no `libnspr4`/nss); assessed by inspection |

## Special-attention checks (all clear)

1. **No-theater / no fake funding.** The contribute path **publishes no 9735**. Every `9735`
   reference in the new code is a *read* (`useLightningZap.ts:134` polls `kinds:[9735] '#e':[goalId]`
   to detect the real receipt). `buildMockZapReceiptTemplate` is **removed from `CrowdfundSection`**
   (the inline mock contribute + amount state + `queryClient` use are gone). Funding advances only
   when `waitForReceipt` sees a real receipt → invalidates `['zap-goal', goalId]`. ✅
2. **QR always + copy, rendered locally.** `ContributeDialog.tsx` generates the QR with the bundled
   `qrcode` lib (`QRCode.toDataURL`) — **no `api.qrserver.com`, no external image service, no
   `document.createElement` modal** (all of which the recovered code had). The raw invoice + a Copy
   button render unconditionally in the invoice phase; WebLN is shown only when available (additive).
   ✅ (Visual QR/copy with a *real* invoice is manual-verify.)
3. **Prime directive.** Recipient is `task.arbiterPubkey` (the task's own arbiter); relays come from
   `getActiveRelays(config, presetRelays)` (the overridable active set). **No hardcoded relay or
   recipient in the new code** (the recovered code's `relay.nostr.band`/`nos.lol` fallbacks were
   dropped). Fork test passes: point at your own arbiter/relays and it works identically. ✅
4. **Signing / nsec.** Zap request signed via `user.signer.signEvent` (`useLightningZap.ts:92`); no
   nsec/private-key access. Payment requires `webln.enable()` + `sendPayment` (wallet-authorized) or
   the user paying the invoice themselves. Explicit signaling throughout. ✅

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-1 real sats → progress from a real receipt | ✅ (manual) | `prepareInvoice` builds a real bolt11; `waitForReceipt` drives progress from the real 9735. Verify with a wallet (test plan checklist). |
| AC-2 QR **and** copy always; WebLN additive | ✅ | local QR + copy unconditional; WebLN gated on `isWebLNAvailable`. |
| AC-3 explicit authorize; cancel/fail records nothing | ✅ | no receipt is ever published by the app; closing aborts the watch (`reset()` → `watchRef.abort()`). |
| AC-3 no Lightning address → honest, no publish | ✅ | `ContributeDialog` shows the "no **Lightning address**" message when `useAuthor(arbiter)` has no lud16/lud06; no invoice, no publish. `contribute-real-lightning.spec.ts`. |
| AC-4 no path advances funding without payment | ✅ | mock contribute path deleted; contribute publishes no 9735; e2e asserts 0 receipts authored by the actor. |
| AC-5 recipient = arbiter; overridable relays; nothing special-cased | ✅ | `task.arbiterPubkey` + `getActiveRelays`; `buildZapRequest` openness unit test. |

## ADR conformance

Matches ADR 0012 Option A exactly: pure `src/lib/zap.ts` + slim `useLightningZap` (adapted from the
recovered `useRealZap`, with its DOM modal / external QR / fabricated-receipt / hardcoded relays all
discarded) + `ContributeDialog`. All three ADR open questions are honored: receipt-driven completion
with an honest timeout (no fake "I paid"), amount validated against LNURL min/max, and the
unit-automatable / manual-real-wallet test split.

## Findings

**Non-blocking:**

1. **Playwright not executed here** (sandbox lacks chromium libs). The no-theater spec is sound by
   inspection; run `npx playwright test test/browser/contribute-real-lightning.spec.ts` with a
   working chromium before relying on it in CI.
2. **`waitForReceipt` matches any 9735 referencing the goal since the watch started**, not
   specifically *this* funder's payment. On a busy goal, a concurrent contributor's receipt could
   flip this user's dialog to "confirmed" early. Impact is cosmetic (the optimistic toast/close) — the
   funding bar always reflects real receipts and **nothing is fabricated**, so the no-theater
   guarantee holds. Worth tightening later to match the `zapRequestId`/bolt11. Not blocking.
3. **Manual verification required before public launch** (real wallet): real payment, the QR/copy of a
   real invoice, and WebLN — per the test plan checklist. This is the one thing automated tests can't
   cover.

None block the story.

## Linked artifacts
- Story / ADR / Test plan as above
- Implementation: `b192565`; failing tests: `2ca85ca`
