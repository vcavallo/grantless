# Story 14: Contributor visibility + honest profile loading

**Status:** Draft
**Created:** 2026-06-05
**Type:** Feature

## Background

Now that contributions are real (Story 13), the people who fund projects are real people who'd like
to be *seen* — and curators would like to show off the generosity their world attracts. Today the
crowdfund surface only shows a bare count ("N contributors"); there's no way to see *who* backed a
project, and nothing celebrates funders across a curator's whole set.

Separately, a production papercut undermines trust in everything else here: because prod is slower
and uncached, lists load slowly, and while profiles resolve the UI shows **fabricated placeholder
names** (e.g. "Wise Owl") that look exactly like real names — then they silently swap to the real
name once the profile loads. A user can't tell what's real, which is corrosive for an app whose whole
pitch is "trust is real and yours."

This story makes contributors visible (per project and across a curator), and makes profile loading
honest (never present a generated name as if it were the real one).

## User-facing description

- As anyone viewing a project, I want to **see who contributed** — their faces, names, amounts, and
  copyable npubs — not just a count, so funders get recognition and I can judge the backing.
- As a funder or curator, I want a **page of all contributors across a curator's projects, ranked by
  total contributed**, so funders can show off and curators can showcase their community.
- As any user, I want the app to **not show me fake names as if they were real** while profiles are
  still loading — show a clear loading state, then the real identity.

## Acceptance criteria

Testable from the outside.

### Group A — Contributors on a project's crowdfund

- [ ] Given a project with one or more contributions, when I view its crowdfund section, then I see
      contributors' profile pictures stacked horizontally (as many as reasonably fit) plus the total
      contributor count — not just a number.
- [ ] Given the contributors area, when I expand it, then I see each contributor's display name, their
      **total** amount contributed, and a **copyable** npub.
- [ ] Given a contributor who zapped more than once, when I view the list, then they appear **once**
      with their amounts summed (aggregated per contributor, ranked by amount).

### Group B — Honest profile loading (no fake names presented as real)

- [ ] Given a profile that has not yet resolved, when its name would be shown (the curator picker, and
      other places a name renders while loading), then the UI shows a **loading indication** (e.g. a
      skeleton or clearly-placeholder treatment) rather than a fabricated name presented as real.
- [ ] Given a profile that finishes loading **with** a name, when it resolves, then the real name
      replaces the loading state.
- [ ] Given a profile that finishes loading **without** any kind-0 name, when it resolves, then a
      clearly-fallback identifier is shown (showing a generated name is acceptable **only once we know
      there is no real name** — never during loading as if it were real).

### Group C — Curator-wide contributors page

- [ ] Given a selected curator, when I open their contributors page, then I see all contributors
      across that curator's set of projects, **aggregated per contributor and ranked by total
      contributed** (highest first) — no per-project breakdown required.
- [ ] Given that page, when I view a contributor row, then I see their display name, total contributed
      across everything, and a copyable npub.
- [ ] Given the page, when there are no contributions yet, then I see a clear empty state.
- [ ] Given the page, when I want to share it, then it has its own shareable URL (consistent with the
      existing `/c/:npub` and `/p/:npub` patterns), and is reachable from the curator browse.

## Out of scope

- **Per-project breakdown** on the curator-wide page (aggregate totals only).
- **Gamification** beyond ranking by total — no badges, tiers, or streaks yet.
- **A general caching/performance overhaul.** Group B fixes the *symptom* (fake names shown as real);
  it does not promise to make prod fast. Any light caching the Architect adds is a bonus, not the
  goal.
- **Opt-out / privacy hiding** of a contributor from the lists. Zaps are public; a future story can
  consider an opt-out.
- **Changing how contributions are made** (that's Story 13) — this is read-side display only.

## Openness check

Clean:

- All contributor data is derived from **public zap receipts**; npubs are public. Nothing here reads
  or exposes private data.
- Ranking is purely mechanical (by sats contributed) — **no pubkey, curator, or relay is privileged**
  or special-cased, and trust isn't conferred by the list (it just reflects public zaps).
- Works for **any** curator against **any** relay — a forker pointed at their own curator/relay gets
  an identical contributors view.
- The profile-loading fix removes a *misleading* signal (fake-name-as-real); it adds no privilege.

## Open questions

- ~~Real-vs-mock contributor attribution.~~ **Resolved (build for prod; the seed mirrors it).** The
  contributor is read from the **embedded zap request in the receipt's `description` tag**
  (`parseZapReceiptSender` → the request's `pubkey`) — the NIP-57-correct, prod-real attribution. The
  dev seed's mock receipts are deliberately shaped the same way (`description = {"pubkey": <sender>,
  …}`), so the **same code attributes both** and the feature is **fully testable locally against the
  seed** (`progress.contributors` already populates from seeded funders). No seed-specific code.
- **Curator-wide aggregation cost.** Gathering receipts across every goal of every applicant in a
  curator's set may be many queries on a slow prod relay — confirm the query approach and a good
  loading state in Architecture (this dovetails with Group B's loading concern).
- **Prominence/placement** of the curator-wide page entry point (button vs tab on the browse) — an
  Architect/UX call.

## Linked artifacts
- Source intent: 2026-06-05 user request (contributor avatars/expand, placeholder-name flicker on
  prod, curator-wide contributors "show off" page).
- Related: `src/components/grantless/CrowdfundSection.tsx` (the "N contributors" line), `calculateGoalProgress`
  (`src/lib/catallax.ts` — already aggregates contributors), `genUserName` (the placeholder source).
- ADR: (filled in after Architecture phase)
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
