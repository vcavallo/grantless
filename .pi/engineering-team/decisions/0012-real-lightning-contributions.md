# ADR 0012: Real Lightning contributions

**Status:** Proposed
**Date:** 2026-06-05
**Story:** `.pi/engineering-team/stories/13-real-lightning-contributions.md`

## Context

Story 13 makes the crowdfund **contribute** action move real sats. Today
`CrowdfundSection.contribute()` (`src/components/grantless/CrowdfundSection.tsx:78`) publishes a
**fabricated** kind-9735 via `buildMockZapReceiptTemplate` — no payment, theater funding bar. We
replace that path with a real NIP-57 zap to the project's arbiter, toward the NIP-75 goal.

What's already in place / available:

- **The goal is real.** "Open for funding" publishes a real 9041 (`buildZapGoalTemplate`,
  `catallax.ts:589`) whose `zap` tag is the arbiter and whose `relays` tag is the configured set.
- **Progress already reads real receipts.** `useZapGoal` (`src/hooks/useZapGoal.ts`) queries kind
  9735 by the goal's `#e`/`#a` and feeds `calculateGoalProgress` (`catallax.ts:632`). So **if a real
  zap's 9734 request carries `['e', goalId]`, the LNURL server's 9735 receipt will carry that `e`
  tag (NIP-57 copies request tags) and the bar moves with no client-published receipt.** This is the
  central seam.
- **Deps already present:** `qrcode` (+types) for **local** QR rendering, `@webbtc/webln-types`,
  `light-bolt11-decoder`, `nostr-tools`.
- **Recoverable prior art:** `useRealZap` (`git show 72e1c11:src/hooks/useRealZap.ts`) implements the
  NIP-57/LNURL *protocol* steps (resolve lud16 → LNURL-pay → check min/max + `allowsNostr` → sign
  9734 → fetch invoice). **But its UX is unusable for us:** it renders the QR via an **external image
  API** (`api.qrserver.com` — privacy/centralization leak), injects a raw `document.createElement`
  modal (not React/shadcn, untestable), hardcodes fallback relays (`relay.nostr.band`/`nos.lol`),
  only supports `lud16` (not `lud06`/bech32), and offers an **"I Paid – Continue" button that
  fabricates a fake receipt id** — the exact theater the story forbids. We reuse its protocol steps
  and discard its payment UX.

Constraints (`.pi/AGENTS.md`): wrapper/adapter seam, separation of UI/protocol/data, reuse over
re-implement, prefer real-event tests but accept that real Lightning has no local backend, and the
prime directive (no privileged relay/recipient; defaults overridable).

## Options considered

### Option A — Pure protocol lib + slim side-effecting hook + React dialog (QR via local `qrcode`)
Split into three layers:
1. **Pure** NIP-57/LNURL construction in `src/lib/zap.ts` (unit-testable — the story's automatable
   surface).
2. A **slim hook** `useLightningZap` that does the network steps (fetch profile → LNURL → invoice)
   and exposes the invoice + a receipt-driven completion signal. No DOM, no external QR, no fake
   confirm.
3. A **`ContributeDialog`** (shadcn `Dialog`) that always renders a locally-generated QR + a
   copy-to-clipboard invoice, with WebLN as an additive one-click button. Funding advances only when
   the real 9735 appears.

- **Pros:** meets the QR-always + no-theater requirements; pure layer is cleanly testable; reuses the
  proven protocol steps; respects the wrapper/separation rules; local QR (no third-party leak).
- **Cons:** more code than a copy-paste restore; receipt-detection polling needs care.

### Option B — Restore `useRealZap` + `RealZapDialog` largely as-is
- **Pros:** least effort.
- **Cons:** external QR image API (privacy/centralization — prime-directive smell), imperative DOM
  modal (un-Reactish, untestable), **fabricated "I paid" receipt** (violates story criteria 1 & 4),
  hardcoded relays, no `lud06`. Fails the hard requirements. Rejected.

### Option C — Adopt a third-party zap library
- **Pros:** offload LNURL/NIP-57 plumbing.
- **Cons:** heavy dependency for logic we can recover; less control over the QR-always + receipt-
  driven honesty; coupling we just worked to remove (AGENTS minimal-coupling). Rejected. (We may use
  `nostr-tools`' existing `nip57`/bech32 helpers *internally* in the pure layer.)

## Decision

**Option A.** It's the only option that satisfies the two hard requirements — **QR + copy always
present** and **never advance funding without a real payment** — while honoring the wrapper/
separation rules and keeping the testable core pure.

**Resolved open questions:**

1. **Paid-but-no-receipt-yet** → **receipt-driven only.** The dialog shows "Waiting for payment…"
   and polls the configured relays for the real 9735 referencing the goal. The bar moves only on a
   real receipt. On a timeout (~3 min) we show honest guidance ("Haven't seen your payment yet — if
   your wallet confirms it paid, it may take a moment; you can close this and refresh"). **No manual
   "I paid" button that advances funding** (that's the fake-receipt anti-pattern we're removing).
2. **Amount bounds** → validate against `minSendable`/`maxSendable` (msat) before requesting the
   invoice; show the allowed sat range in the UI. Pure `validateZapAmount`.
3. **Test strategy** → unit-test the **pure** layer (LNURL URL resolution incl. lud06 bech32, 9734
   builder, amount validation, invoice-URL builder). LNURL fetch / WebLN / payment / receipt
   detection are network+wallet → **manual real-wallet verification** (Story 1 precedent). Playwright
   covers the **no-Lightning-address honest path** (no network) — the dialog refuses and publishes
   nothing.

## Consequences

- **Enables:** real funding; a reusable pure zap layer for the follow-on payout/refund story; QR/copy
  that works for mobile-in-browser funders; local QR (no third-party dependency).
- **Constrains / follow-ups:** the contribute path loses its automated "money moved" e2e (inherent —
  no local LN backend); relies on the recipient LNURL server publishing a NIP-57 receipt to a relay
  in our set. `buildMockZapReceiptTemplate` **stays in `lib`** because `TaskLifecycleActions`
  (payout/refund) still uses it — that's the next story; this ADR only removes it from the
  *contribute* path (story criterion 4).
- **Receipt routing is load-bearing:** the 9734 request's `relays` tag and `['e', goalId]` must match
  what `useZapGoal` reads, or progress won't update. Both derive from the same overridable set.

## Openness / permissionlessness check (required)

- **Privileged actor?** **No.** The zap recipient is the **task's own arbiter** (the goal's `zap`
  tag) — never an app-chosen or fee-skimming intermediary. Grantless is not in the payment path and
  takes no cut.
- **Trust from WoT, not client?** **Yes.** Nothing about who can receive/contribute is encoded; the
  recipient's Lightning address is *their* profile data, not a client grant. If absent, we surface it
  honestly and publish nothing — no substitution, no gatekeeping.
- **Hardcoded defaults?** None introduced. Relays come from `getActiveRelays(config, presetRelays)`
  (already overridable). We **remove** the recovered code's hardcoded relays and **remove** the
  external `api.qrserver.com` dependency (QR rendered locally).
- **Fork test:** **Yes** — point at your own arbiters/relays and it works identically.

## Implementation notes

- **`src/lib/zap.ts`** (new, pure — the unit-tested core):
  - `lightningAddressToLnurlPayUrl(addr: string): string` — `user@domain` →
    `https://domain/.well-known/lnurlp/user`; `lnurl1…` (lud06) → bech32-decode to the URL (use
    `nostr-tools`/`@scure/base` bech32; **add lud06 support the recovered code lacked**). Throws on
    malformed.
  - `buildZapRequest(input: { recipientPubkey; amountSats; goalId; relays: string[]; comment?: string
    }): { kind: 9734; content: string; tags: string[][]; created_at? }` — tags `['p',recipient]`,
    `['amount', msat]`, `['relays', ...relays]`, **`['e', goalId]`** (so the receipt references the
    goal). Pure; mirrors `buildTaskProposalTemplate` style. (May wrap `nostr-tools` `nip57` internally
    but keep the signature/`e`-tag explicit and testable.)
  - `validateZapAmount(amountSats, lnurl: { minSendable; maxSendable; allowsNostr }): { ok: true } |
    { ok: false; reason: string }` — range check + `allowsNostr`.
  - `buildInvoiceUrl(callback, amountMsat, signedZapRequestJson, comment?): string`.
- **`src/hooks/useLightningZap.ts`** (new, adapted from `useRealZap`, slimmed): given
  `{ recipientPubkey, amountSats, goalId, relays }` → fetch recipient kind-0, extract lud16/lud06
  (throw a clear "no Lightning address" error if absent), resolve+fetch LNURL params, `validateZapAmount`,
  sign the 9734 via `user.signer`, fetch the bolt11 invoice. Returns `{ invoice, payWithWebLN?(),
  isWebLNAvailable }`. **No DOM, no external QR, no fabricated receipt.** A `waitForReceipt(goalId,
  sinceTs)` helper polls the configured relays for a real 9735 matching the goal (reuse the
  direct-WS query style already in `useZapGoal`), resolving when seen (drives the success state).
- **`src/components/grantless/ContributeDialog.tsx`** (new): amount input (shows allowed range) →
  "Get invoice" → renders a **locally generated QR** (`qrcode` → data URL/canvas) + a readonly
  invoice field + **Copy** button, always; plus a **"Pay with browser wallet"** button only when
  WebLN is available (additive). Shows "Waiting for payment…", auto-detects the real receipt →
  "Contribution confirmed" → invalidates the goal query so the bar updates; timeout → honest guidance
  (no fake confirm). If the arbiter has no Lightning address, render the honest message and **no
  invoice / no publish**.
- **`src/components/grantless/CrowdfundSection.tsx`**: replace the `contribute()` body (the
  `buildMockZapReceiptTemplate` publish, ~line 78–98) with opening `ContributeDialog`. Remove the
  `buildMockZapReceiptTemplate` import from this file. Keep "Open for funding" as-is.
- **Tests (for the Tester):** unit `src/lib/zap.test.ts` — `lightningAddressToLnurlPayUrl` (lud16 +
  lud06 + malformed), `buildZapRequest` (kind 9734, `p`/`amount`-in-msat/`relays`/`e`=goalId),
  `validateZapAmount` (under/over/allowsNostr=false), `buildInvoiceUrl`. Playwright: open a project
  whose arbiter has no Lightning address → contribute → honest "can't contribute" message, assert **no
  9735 is published** to the seeded relay. Manual: real wallet pays a real invoice → bar advances
  (document in the test plan as manual-verify).

## Out of scope

- Arbiter **payout to worker** and **refund to funders** (still mocked in `TaskLifecycleActions`) —
  next story; `buildMockZapReceiptTemplate` remains in `lib` for it until then.
- LNURL withdraw, NWC/Nostr Wallet Connect, zap splits, comments beyond a basic field.
- Making the dev seed or automated suite move real sats.
