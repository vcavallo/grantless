# Review: Story 12 — Become an Arbiter

**Date:** 2026-06-04
**Reviewer:** Reviewer (Phase 5)
**Story:** `.pi/engineering-team/stories/12-become-an-arbiter.md`
**ADR:** `.pi/engineering-team/decisions/0011-become-an-arbiter.md`
**Test plan:** `.pi/engineering-team/stories/12-become-an-arbiter.test-plan.md`
**Diff reviewed:** `f319f55~1..HEAD` (test commit `f319f55`, impl commit `2da4f77`)

## Verdict: **PASS**

A clean, ADR-faithful implementation that mirrors the established "Post a project" pattern, shares a
single pure builder for the 33400 shape, and is honest about the announced-≠-vouched distinction. All
runnable gates are green. The only caveat is environmental (Playwright can't execute in this sandbox),
recorded below as a follow-up, not a defect.

## Gates (run by the reviewer)

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | **exit 0** — clean |
| `npx eslint` | **exit 0** — 0 errors, 2 warnings (pre-existing, in `ArbiterFilters.tsx`/`TaskFilters.tsx`, untouched by this story) |
| `npx vitest run` | **75 passed** (14 files); +11 new from `catallax.buildArbiterAnnouncement.test.ts` |
| `npx vite build` | **exit 0** — clean (pre-existing chunk-size advisory only) |
| `npx playwright test` | **Not executable in this sandbox** — no `libnspr4`/nss for the bundled chromium; assessed by inspection (spec collects: 4 tests listed) |

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-1 logged-in announce → real 33400 discoverable | ✅ | `BecomeArbiterForm.onSubmit` builds via `buildArbiterAnnouncementTemplate` and publishes through `useNostrPublish` (real event). Shape proven by 11 unit tests (incl. parser round-trip); `become-arbiter.spec.ts:21` asserts the real event on the relay via the nak harness. |
| AC-2 logged-out → login prompt, no publish | ✅ | `BecomeArbiterDialog` renders `LoginArea` + "Log in to become an arbiter" when `!user`; the form (and its publish path) is not mounted. `spec:12`. |
| AC-3 announced ≠ vouched message | ✅ | `BecomeArbiterDialog` "Announced — but not yet selectable" panel explains curator vouching and links to `/about`; never self-vouches. `spec:21`. |
| AC-4 repeat visit reflects existing service | ✅ | `useMyArbiterServices(user?.pubkey)` → `hasService` → trigger "Update arbiter service" + check icon. `spec:44` (seeded arbiter Dave carries `t:catallax`, so the hook finds it). |
| AC-5 About CTA leads into the flow | ✅ | `About.tsx` CTA `Button asChild` → `Link to="/?compose=arbiter"`; `CuratorBrowser` reads `compose=arbiter` and auto-opens. `spec:53`. |
| AC-6 arbiter identity surfaced where chosen | ✅ | Builder emits the `p` announcer tag (round-trip parses `arbiterPubkey`); task-side disclosure unchanged (pre-existing Story 6 behavior). |

## ADR conformance

Matches ADR 0011 Option A exactly:
- Pure `buildArbiterAnnouncementTemplate` added to `lib/catallax.ts:477` (mirrors
  `buildTaskProposalTemplate`); the legacy `ArbiterAnnouncementForm` refactored to use it.
- **Refactor is behavior-preserving / byte-compatible:** old code built `content` with
  `about/policy_*: x || undefined` (JSON.stringify drops undefined keys) and tags in order
  `d, p, t:catallax, fee_type, fee_amount, [r], [min_amount], [max_amount], [categories…]`. The
  builder produces the identical content and identical tag order. ✓
- `BecomeArbiterForm`/`BecomeArbiterDialog` mirror `CreateProjectForm`/`CreateProjectDialog`.
- Rendered beside "Post a project" in `CuratorBrowser` (always-rendered picker row); `compose=arbiter`
  auto-open; About CTA wired.
- The three ADR open questions are honored: minimal terms = name + fee (OQ2); minimal repeat-visit
  acknowledgement (OQ1); `/about` as the in-app vouching pointer (OQ3).

## Openness / permissionlessness (prime directive)

- **No special-cased pubkey/relay/arbiter.** Builder tags the announcer as itself; no allowlist.
- **Trust is WoT-derived, never client-granted.** Selectability comes only from a curator's
  trusted-arbiter set; the success panel states this and the flow explicitly refuses to self-vouch
  ("there's no button here that can grant it"). 
- **No new hardcoded defaults.** No relay/Blossom/arbiter/endpoint introduced; the only added link is
  an in-app `/about` doc pointer (overridable by forking the copy). Publishing uses the existing
  (overridable) relay config.
- **Fork test:** ✅ a forker pointing at their own host/relay/curators gets an identical flow.

## Security / signing

- No nsec exposure. Publishing goes through `useNostrPublish` (NIP-07 signer); the announce is an
  explicit, user-initiated form submission (explicit signing signal). ✅

## Findings

**Non-blocking / notes:**

1. **Playwright not executed here (caveat, not a defect).** AC-1…AC-5 are verified by inspection +
   the unit layer; browser-level confirmation requires running `npx playwright test
   test/browser/become-arbiter.spec.ts` with a working chromium (`PLAYWRIGHT_CHROMIUM_PATH` on
   NixOS). Recommended before deploy. The spec collects with no syntax/import errors.
2. **`autoOpen` captured at mount only** (`useState(autoOpen)` in `BecomeArbiterDialog`). Correct for
   the actual flows (About→browse remounts `CuratorBrowser`), but a same-mount param toggle wouldn't
   re-open. Acceptable for v1; worth a comment if the entry point ever moves to an always-mounted
   shell.
3. **Vouching link targets `/about` top**, not a curator-section anchor. Minor UX polish; fine for a
   first cut.

None of these block the story. Items 2–3 are optional follow-ups.

## Linked artifacts
- Story: `.pi/engineering-team/stories/12-become-an-arbiter.md`
- ADR: `.pi/engineering-team/decisions/0011-become-an-arbiter.md`
- Test plan: `.pi/engineering-team/stories/12-become-an-arbiter.test-plan.md`
- Implementation: `2da4f77`; failing tests: `f319f55`
