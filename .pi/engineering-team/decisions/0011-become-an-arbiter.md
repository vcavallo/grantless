# ADR 0011: Become an Arbiter

**Status:** Proposed
**Date:** 2026-06-04
**Story:** `.pi/engineering-team/stories/12-become-an-arbiter.md`

## Context

Story 12 asks for a first-class "Become an Arbiter" on-ramp in the Grantless browse — the arbiter
analogue of "Post a project" — that lets a logged-in user announce a kind-33400 arbiter service and
is honest that announcing ≠ being selectable (selectability comes from a curator/host vouching via
their `grantless-arbiter` set).

What already exists:

- **The 33400 publish path**: `src/components/catallax/ArbiterAnnouncementForm.tsx` builds the
  announcement tags inline (`d`, `p`, `t:catallax`, `fee_type`, `fee_amount`, optional `r`,
  `min_amount`, `max_amount`, category `t`s; content carries `name`/`about`/`policy_*`) and publishes
  via `useNostrPublish`. It is a Catallax-flavored, many-field form wrapped in a `Card`, surfaced only
  on the `/catallax` dashboard — the surface Grantless steers away from.
- **The Grantless creation pattern**: `CreateProjectDialog.tsx` (a login-gated `Dialog` with a
  trigger button, rendering `CreateProjectForm` on success-closes) and `CreateProjectForm.tsx`
  (react-hook-form + zod + a **pure builder** `buildTaskProposalTemplate` from `lib/catallax.ts`
  (`catallax.ts:295`) + `useNostrPublish` + toast). This is the established, focused shape to mirror.
- **Pure-builder precedent**: tasks have `buildTaskProposalTemplate`; arbiter announcements do **not**
  — the tag shaping lives only inside the legacy form. `generateServiceId` (`catallax.ts:466`) and
  `FeeType` (`catallax.ts:13`) already exist.
- **Repeat-visit data**: `useMyArbiterServices(pubkey)` (`useCatallax.ts:201`) already returns a
  user's latest announcements (deduped per `pubkey:d`).

Constraints from `.pi/AGENTS.md`: protocol/Catallax code is shared one-way with upstream (keep it
unopinionated); wrapper/adapter seam; reuse over re-implementation; prefer real-event e2e + Playwright
over mocks; assert openness properties.

The 33400 is **addressable** (kind 33400, `d` = `generateServiceId(name)`), so re-announcing the same
service name replaces the prior revision — relevant to the repeat-visit affordance.

## Options considered

### Option A — Lean Grantless dialog + form, sharing a new pure 33400 builder
Extract a pure `buildArbiterAnnouncementTemplate` into `lib/catallax.ts` (mirroring
`buildTaskProposalTemplate`), refactor the legacy `ArbiterAnnouncementForm` to use it (behavior-
preserving — single source of truth for the 33400 shape), and add a Grantless `BecomeArbiterDialog`
+ lean `BecomeArbiterForm` (name, optional about, fee type + amount) that use the same builder. The
dialog shows an "announced ≠ vouched" panel on success and reflects an already-announced service on
the trigger.

- **Pros:** Mirrors the proven "Post a project" pattern exactly; minimal patron-evaluable fields;
  one canonical 33400 builder (DRY, unit-testable, upstream-friendly); Grantless copy/UX stays in
  Grantless components; clean place for the vouching message.
- **Cons:** A second (lean) form alongside the legacy one; a behavior-preserving refactor of a
  shared Catallax component (low risk, covered by keeping output identical).

### Option B — Reuse `ArbiterAnnouncementForm` as-is inside a Grantless dialog
Drop the existing form into a new `BecomeArbiterDialog`, no new form, no builder.

- **Pros:** Least new code.
- **Cons:** Catallax-flavored copy ("Advertise to the Catallax network") and ~9 fields in a flow the
  story wants focused; `Card`-inside-`Dialog` nesting; the "announced ≠ vouched" message has no clean
  home (the form owns its own success/reset); couples Grantless UX to a legacy component and leaves
  the 33400 shape un-extracted. Fails the "focused, mirror Post-a-project" intent.

### Option C — A dedicated `/become-arbiter` route/page
A full page instead of a dialog.

- **Pros:** Easy deep-linking from About; room to breathe.
- **Cons:** Diverges from the dialog pattern the story explicitly says to mirror; more navigation
  friction for a short form; inconsistent with "Post a project". Deep-linking is solvable for the
  dialog with a URL param (see Decision).

## Decision

We chose **Option A**.

It mirrors the established Grantless creation pattern, keeps the flow focused on the minimal terms a
patron needs, and establishes a single canonical, pure, testable builder for the 33400 shape that
both the new lean form and the legacy form share — satisfying the reuse and wrapper-seam rules
without re-implementing protocol logic.

**Resolved open questions:**

1. **Repeat-visit affordance** → minimal. Use `useMyArbiterServices(user.pubkey)`; when the user
   already has ≥1 announced service, the trigger reflects it (label e.g. "Update arbiter service" and
   a subtle "✓ announced" cue) and the dialog notes they're re-announcing (the replaceable `d` means
   same name = update). No management/list view in v1 (out of scope in the story).
2. **Minimal terms** → service **name** (required), **about** (optional), **fee type** + **fee
   amount** (required). The legacy form's min/max/categories/policy/URL fields stay on `/catallax`;
   they are not part of the focused Grantless flow.
3. **"How to get vouched" pointer** → in-app, least-coupled: the success panel links to the About
   page's curator section (`/about`), which already explains the curator/`grantless-arbiter`
   mechanism. No external/hardcoded dependency; a forker who repoints curation still gets a correct
   pointer.

**Entry points:** render `<BecomeArbiterDialog />` next to `<CreateProjectDialog />` in
`CuratorBrowser`'s curator-picker row (where "Post a project" now lives — the header is reserved for
About + login). The About "Want to be an Arbiter?" CTA links to `/?compose=arbiter`, and the browse
auto-opens the dialog when that param is present.

## Consequences

- **Enables:** a discoverable, focused arbiter on-ramp; an honest vouching message; a reusable pure
  33400 builder for future arbiter features (and tests); the About explainer becomes actionable.
- **Constrains / follow-ups:** no "manage my arbiter services" surface and no "vouched by X" status
  (both explicitly deferred). Two arbiter forms now exist (lean Grantless + full legacy) sharing one
  builder — acceptable; a later pass could retire or fold the legacy form when `/catallax` is
  reworked.
- **Replaceable-event care:** re-announcing the same service name (`d = generateServiceId(name)`)
  replaces the prior revision; `useMyArbiterServices` already dedupes latest-wins. New service names
  create new services — surfaced as "update vs new" via the name field, not enforced.

## Openness / permissionlessness check (required)

- **Grants special privileges?** **No.** Announcing is permissionless — any logged-in key may publish
  a 33400; the client confers no status. Selectability is *not* granted by announcing.
- **Trust from WoT, not the client?** **Yes.** Selectability derives entirely from a curator/host
  vouching (their `grantless-arbiter` set) — surfaced and explained, never encoded or faked. The flow
  explicitly refuses to let an arbiter self-vouch.
- **Hardcoded defaults introduced?** Only an **in-app link to `/about`** as the "how to get vouched"
  pointer — a documentation convenience with no elevated status, overridable by forking the copy. No
  new relay, pubkey, arbiter, or endpoint defaults. The 33400 publishes through the existing relay
  config (already overridable).
- **Fork test:** **Yes.** A forker pointing at their own host/curators/relay gets an identical flow;
  nothing depends on a specific party. Arbiter identity stays surfaced wherever an arbiter is chosen.

## Implementation notes

- **`src/lib/catallax.ts`** — add, mirroring `buildTaskProposalTemplate`:
  - `export interface ArbiterAnnouncementInput { name: string; about?: string; feeType: FeeType;
    feeAmount: string; policyText?: string; policyUrl?: string; detailsUrl?: string;
    minAmount?: string; maxAmount?: string; categories?: string[]; pubkey: string; }`
  - `export function buildArbiterAnnouncementTemplate(input): { kind: number; content: string;
    tags: string[][] }` — produces kind `ARBITER_ANNOUNCEMENT`, `content` JSON `{ name, about?,
    policy_text?, policy_url? }`, tags `['d', generateServiceId(name)]`, `['p', pubkey]`,
    `['t','catallax']`, `['fee_type',feeType]`, `['fee_amount',feeAmount]`, plus optional
    `['r',detailsUrl]`, `['min_amount',…]`, `['max_amount',…]`, and `['t', category]` per category.
    Pure — exact byte-compat with the current inline shaping in `ArbiterAnnouncementForm`.
- **`src/components/catallax/ArbiterAnnouncementForm.tsx`** — replace the inline tag/content building
  in `handleSubmit` with `buildArbiterAnnouncementTemplate({ ...formData, categories, pubkey:
  user.pubkey })`, passing the result to `createEvent`. Behavior must be unchanged (same event).
- **`src/components/grantless/BecomeArbiterForm.tsx`** (new) — mirror `CreateProjectForm`: rhf + zod
  (`name` required, `about` optional, `feeType` enum, `feeAmount` positive number with the same
  flat/percentage constraints the legacy form uses), build via `buildArbiterAnnouncementTemplate`,
  publish via `useNostrPublish`, toast on error, `onSuccess?()` on success.
- **`src/components/grantless/BecomeArbiterDialog.tsx`** (new) — mirror `CreateProjectDialog`:
  `Dialog` + trigger `Button` ("Become an Arbiter", `Shield` icon). Login-gated (logged-out →
  prompt + `LoginArea`). On submit-success, swap dialog content to an **"Announced — but not yet
  selectable"** panel: explains a curator/host must add them to their trusted-arbiter set, with a
  `Link to="/about"` for how. Use `useMyArbiterServices(user.pubkey)` to detect an existing service
  and adjust the trigger label ("Update arbiter service" + "✓ announced" cue). Accept an optional
  `open`/`onOpenChange` or read the `compose=arbiter` search param to auto-open.
- **`src/components/grantless/CuratorBrowser.tsx`** — render `<BecomeArbiterDialog />` beside
  `<CreateProjectDialog />` in the picker row (`~line 190`); the row already wraps for mobile. Read
  `useSearchParams()` for `compose=arbiter` to auto-open (or pass the flag down).
- **`src/pages/About.tsx`** — in the "Want to be an Arbiter?" section, make the CTA a
  `Link to="/?compose=arbiter"` (replacing the current "published from the Catallax dashboard" note)
  so it leads into the flow.
- **Tests (for the Tester):** unit-test `buildArbiterAnnouncementTemplate` (pure: correct kind, `d`,
  `p`, `t`s, fee tags, optional fields). Real-event e2e (nak + local strfry) is largely covered by
  existing arbiter-announcement fixtures; add coverage if the builder path needs it. Playwright:
  logged-in open → submit → see the vouching panel + a real 33400 on the relay; logged-out → login
  prompt, no publish; About CTA (`/?compose=arbiter`) opens the dialog.

## Out of scope

- A "manage / edit / retire my arbiter services" surface (beyond replaceable re-announce).
- "Vouched by curator X" status on the arbiter's side.
- Any change to how arbiters are *selected* on a task (Story 6 / `FilteredArbiterSelect`).
- Retiring the legacy `/catallax` arbiter form (it keeps working via the shared builder).
