# Story 13: Real Lightning contributions

**Status:** Draft
**Created:** 2026-06-05
**Type:** Feature

## Background

Crowdfunding is the core value proposition of Grantless — funders send sats to back the projects
they want to exist. But today **no sats actually move.** The "contribute" action on a project's
crowdfund surface publishes a *fabricated* zap receipt signed by the contributor; the funding bar
fills from these fake receipts. It is theater. (Publishing the funding *goal* is real — that's just
a Nostr event — but the contribution payment is mocked.)

This was a deliberate, documented deferral ("payments are mocked in tests; real zaps are a later
hardening pass"), acceptable while building the flows against a local relay. It is **not** acceptable
to announce Grantless to the public with a funding bar that moves no money — anyone who "funds" a
project would believe they'd contributed when nothing happened.

This story makes the contribution path **real**: a funder sends actual Lightning sats toward a
project's goal, the escrow lands with the project's chosen arbiter, and the funding bar reflects real
money. (The codebase previously contained a working real-Lightning implementation, and one still
lives upstream, so this is restoring/adapting a capability, not inventing one — but that's the
Architect's concern.)

The arbiter payout-to-worker and refund-to-funders flows (the conclusion-side money movements) are
**out of scope here** and are the natural next story.

## User-facing description

As a funder looking at a project that's open for funding, I want my contribution to send **real
Lightning sats** to the project's escrow (its arbiter), so that the funding I see is real money I
actually committed — and I want the app to be honest when a real contribution isn't possible rather
than pretend it succeeded.

## Acceptance criteria

Testable from the outside. Real payments require a real wallet, so the money-moving criteria are
verified manually with a Lightning wallet (see Open questions); the construction and the
no-theater guarantees are automatable.

- [ ] Given a project open for funding whose arbiter has a Lightning address, when I enter an amount
      and complete the Lightning payment, then **real sats are sent** to that arbiter and the funding
      progress increases by approximately that amount (driven by the real zap receipt the payment
      produces, not a client-fabricated one).
- [ ] Given I begin a contribution, when an invoice is generated, then I am **always** shown both a
      **scannable QR code** and a **copy-to-clipboard** of the raw invoice string — regardless of
      whether a browser wallet (WebLN) is present. (Mobile funders already in a browser can't use
      their camera on their own screen, so copy-then-paste into a wallet app is the reliable path.)
- [ ] Given a browser Lightning wallet (WebLN) is available, when I contribute, then I may
      additionally pay in one click — but WebLN is an **optional convenience layered on top of** the
      QR/copy invoice, never a precondition for contributing.
- [ ] Given I begin a contribution, when payment is required, then I must **explicitly authorize it**
      (scan/copy-and-pay the invoice, or approve the WebLN prompt) — nothing is sent silently — and
      if I cancel or the payment fails, **no contribution is recorded** and the funding bar does not
      move.
- [ ] Given the project's arbiter has **no Lightning address**, when I try to contribute, then I am
      clearly told a real contribution isn't possible for this project and **no receipt is
      published** — the app does not fake a contribution.
- [ ] Given the contribution flow, there is **no remaining path** by which a user can advance a
      project's funding bar without an actual payment (the mock-receipt contribution path is removed).
- [ ] Given any project, the contribution is directed to **the arbiter that project designates** and
      uses the configured/overridable relay set — no hardcoded or privileged recipient or relay.

## Out of scope

- **Arbiter payout to the worker** and **refund to funders** on conclusion — these are the other two
  real-money flows (still mocked in `TaskLifecycleActions`). They are the next story (or stories).
- **Tests/seed staying mocked.** The dev seed and the automated test suite continue to use fabricated
  receipts — real Lightning cannot run against the local strfry. This story does not try to make the
  seed pay real sats.
- **Wallet onboarding / custodial accounts.** We rely on the funder having a Lightning wallet
  (browser extension or mobile); we don't build or bundle a wallet.
- **Recovering/structuring the implementation** (which prior code to restore, how to wire WebLN vs
  QR) — that's the Architecture phase.

## Openness check

Clean, and it actively avoids creating a privileged party:

- **Recipient is the project's own arbiter**, designated by the task — never a hardcoded, app-chosen,
  or fee-skimming intermediary. Grantless takes no cut and is not in the payment path.
- **No privileged relay.** The zap goal / receipt relays come from the configured, overridable set.
- **Lightning address is the recipient's own property**, not a privilege the client confers. If an
  arbiter hasn't published one, the app surfaces that honestly (criterion 3) rather than gatekeeping
  or substituting one.
- **Fork test:** someone running their own Grantless, pointed at their own arbiters/relays, gets an
  identical flow — nothing depends on us or our infrastructure.

## Open questions

- **Test strategy (important).** Real Lightning can't be exercised end-to-end against the local
  strfry — there's no Lightning backend. Automated coverage is therefore limited to the **pure
  NIP-57 construction** (building the zap request, parsing the Lightning-address/LNURL response,
  computing progress from a *real* receipt shape). Actually moving sats is **manual verification with
  a real wallet** (the Story 1 manual-verify precedent). Confirm this split is acceptable with the
  Tester/Architect.
- **"Paid but no receipt yet."** Funding progress is computed from the public zap receipt, which the
  recipient's LNURL server publishes — some servers lag or don't publish. What should the funder see
  between paying and the receipt appearing? (Resolve in Architecture.)
- **Amount bounds.** LNURL endpoints advertise min/max sendable; how do we present/validate the
  amount against those? (Architecture.)
- ~~No-WebLN environments / affordances.~~ **Decided (PO):** the QR code + copyable invoice is the
  always-present baseline path; WebLN is an additive one-click convenience only. (See acceptance
  criteria.) The Architect still decides *how* to render/poll, not *whether* to show QR+copy.

## Linked artifacts
- Source intent: 2026-06-05 user request — "we never tested real lightning payments… build it first."
- Related: `src/components/grantless/CrowdfundSection.tsx` (the mocked contribute path this replaces)
- ADR: `.pi/engineering-team/decisions/0012-real-lightning-contributions.md`
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
