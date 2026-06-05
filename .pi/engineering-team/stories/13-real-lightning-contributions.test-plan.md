# Test Plan: Story 13 — Real Lightning contributions

**Story:** `.pi/engineering-team/stories/13-real-lightning-contributions.md`
**ADR:** `.pi/engineering-team/decisions/0012-real-lightning-contributions.md`
**Date:** 2026-06-05

## The testing reality (read first)

Real Lightning has **no backend on the local strfry** — we can't make sats actually move in an
automated test. So coverage splits in two:

- **Automatable:** the pure NIP-57/LNURL construction (unit), and the **no-theater** guarantee — when
  a real contribution isn't possible, the app refuses honestly and publishes nothing (Playwright,
  real events on the seeded relay).
- **Manual (real wallet):** actually moving sats, the QR/copy-always rendering of a real invoice, and
  WebLN. Verified by a human with a Lightning wallet (the Story 1 manual-verify precedent). Checklist
  below.

## Coverage map

| Criterion | Test | File | Level |
|---|---|---|---|
| AC-1 real sats → progress advances from a real receipt | manual checklist #1–#3 | — | manual |
| AC-2 QR **and** copy always shown for a real invoice | manual checklist #2 | — | manual |
| AC-2 WebLN additive (when present) | manual checklist #4 | — | manual |
| AC-2/4 explicit authorize; cancel/fail records nothing | manual checklist #5 | — | manual |
| AC-3 no Lightning address → honest message, **no publish** | `contributing when the arbiter has no Lightning address is honest and publishes no receipt` | `test/browser/contribute-real-lightning.spec.ts` | e2e (real relay) |
| AC-4 no path advances funding without payment (actor publishes no 9735) | same e2e (asserts 0 receipts by the actor) + the mock contribute path is deleted | `contribute-real-lightning.spec.ts` / `CrowdfundSection.tsx` | e2e + code |
| AC-5 recipient = task's arbiter; overridable relays; nothing special-cased | `buildZapRequest` tags + `openness: no recipient or relay is special-cased` | `src/lib/zap.test.ts` | unit |
| Pure NIP-57/LNURL construction | `lightningAddressToLnurlPayUrl`, `buildZapRequest`, `validateZapAmount`, `buildInvoiceUrl` | `src/lib/zap.test.ts` | unit |

## Edge cases

- [x] **lud16 and lud06.** `lightningAddressToLnurlPayUrl` is tested for `user@domain`, a bech32
      `lnurl1…` (the case the recovered code lacked), upper-case lnurl, and malformed input.
- [x] **Amount bounds.** `validateZapAmount` covers under-min, over-max, in-range, and
      `allowsNostr:false` (msat units).
- [x] **No-theater.** The actor (Alice — not a seeded funder, so zero pre-existing 9735s) attempts a
      contribution to a project whose arbiter has no Lightning address and ends with **zero** 9735s
      authored by her.
- [x] **Openness.** `buildZapRequest` reflects whatever recipient + relay set it's given; no pubkey or
      relay is privileged. The live recipient is the goal's `zap` arbiter, the relays are the
      overridable active set.
- [ ] Receipt-lag UX (paid but no receipt yet) — manual checklist #6 (honest "waiting"/timeout, never
      a fake success).

## Changed existing test

`test/browser/crowdfund.spec.ts` — the old **"a funder can contribute to a goal"** test asserted the
mock behavior (instant "contribution sent" toast). That contract is removed by this story, so the
test was deleted; the affordance test (open-for-funding → a Contribute control appears) stays.

## Required handles for the Implementer (so the e2e passes)

- A contribute trigger button matching `/^contribute$/i`.
- When the project's arbiter has **no** `lud16`/`lud06`, opening contribute shows an honest message
  containing **"lightning address"** and offers no invoice — and publishes nothing.
- No remaining code path publishes a 9735 from the contribute UI (the `buildMockZapReceiptTemplate`
  call in `CrowdfundSection` is gone).

## Manual verification checklist (real wallet — do before announcing)

Against the live app (or dev pointed at a relay) with a project whose **arbiter has a real Lightning
address**:

1. Contribute N sats → a real invoice is generated.
2. The dialog shows **both** a scannable QR **and** a copy-to-clipboard of the raw invoice, with no
   browser wallet required. Copy works.
3. Pay the invoice from a separate wallet app → within moments the funding bar advances by ~N, driven
   by the real 9735 receipt (confirm a real receipt exists; no client-published receipt).
4. With a WebLN wallet present, the one-click pay path also works (additive).
5. Cancel/close before paying → no contribution recorded, bar unchanged.
6. If the receipt lags, the dialog shows an honest "waiting/relay" state and never a fake success.

## How to run

```
npx vitest run src/lib/zap.test.ts                          # unit (automatable core)
npx playwright test test/browser/contribute-real-lightning.spec.ts   # no-theater e2e (needs chromium)
npm test                                                    # full gate
```

## Verification (pre-implementation)

Confirmed failing 2026-06-05:

- **Unit** — fails for the right reason (module not yet created):

```
FAIL src/lib/zap.test.ts — Failed to resolve import "./zap" (src/lib/zap.ts does not exist)
```

- **E2E** — collects cleanly (`playwright test --list` lists both specs, no syntax/import errors).
  Execution is blocked **in this sandbox only** (no `libnspr4`/nss for the bundled chromium); the
  Implementer/Reviewer runs it with a working chromium. It necessarily fails pre-implementation:
  today contributing publishes a mock 9735 and shows "contribution sent" rather than the honest
  no-Lightning-address message.

```
[chromium] › contribute-real-lightning.spec.ts:17 › contributing when the arbiter has no Lightning address is honest and publishes no receipt
[chromium] › crowdfund.spec.ts:8 › patron opens a project for funding, then it shows a contribute affordance
```
