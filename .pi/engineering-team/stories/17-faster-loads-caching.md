# Story 17: Faster loads — caching + incremental rendering for browse & project detail

**Status:** Approved
**Created:** 2026-06-08
**Type:** Feature (performance)

## Background
Every load feels slow. Concretely, today:
- **Nothing persists across reloads.** The query cache lives only in memory, so a hard refresh
  starts cold and re-fetches everything from relays before showing anything.
- **The hottest query never caches.** The all-projects task query (and the rest of the catallax
  family) runs "always fresh" and re-fetches on every visit and every window focus — a large query
  across all relays with a long timeout — so the main browse pays full latency every time.
- **The whole app downloads up front** as one large bundle, regardless of which page you're on.
- **Rendering blocks on the slowest relay** rather than showing useful content as it arrives.

The `staleTime: 0` / refetch-on-focus behavior was a deliberate fix to avoid showing stale task
lifecycle state — so any caching change must keep lifecycle/state correctness while removing the
"cold and slow on every load" cost. The user asked to improve this **without server-side rendering
or heavy infrastructure** — client-side only.

Scope (confirmed): focus on the **main browse flow** (curator → applicants → projects) and the
**project detail page** (including funding), not every page. Approach: **persist the cache across
reloads** and use **stale-while-revalidate** (show last-seen content immediately, refresh in the
background, always reflect the user's own actions).

## User-facing description
As a visitor or user, I want the browse and project pages to appear quickly and reuse what I've
already loaded — across navigation *and* across reloads — so that I'm not staring at a blank or
slow screen every time, while still seeing fresh, correct state.

## Acceptance criteria
Testable from the outside (observable load/render behavior).

- [ ] **Warm reload.** Given I previously loaded the browse or a project detail page, when I hard-
      reload it, then last-seen content appears near-immediately (from persisted cache) instead of a
      cold blank/skeleton-only load, and the page then revalidates in the background.
- [ ] **Warm navigation.** Given I've viewed the browse, when I navigate away and back (or into a
      project and back), then previously-loaded content shows immediately without a full blank
      re-fetch.
- [ ] **Non-blocking / incremental.** Given relays differ in speed, when a page loads, then useful
      content appears before the slowest relay responds (the screen is not blocked until a timeout);
      a skeleton appears only when there is genuinely nothing cached to show yet.
- [ ] **Own-action freshness.** Given I post a project, assign an arbiter, or contribute, when the
      action completes, then my change is reflected immediately on the relevant page — never hidden
      behind stale cache.
- [ ] **Background-refresh correctness.** Given cached content is shown, when fresher data arrives,
      then the latest authoritative state replaces it (e.g. the newest task lifecycle status wins)
      without a manual reload — no permanently-stale or wrong state.
- [ ] **Lighter initial load.** Given I open the app, when it first loads, then it does not download
      the entire app's code up front — a page's code/data loads on demand — so the initial download
      is meaningfully smaller than today.

## Out of scope
- **Any server-side rendering, edge caching, or new backend** (explicitly — client-side only; ties
  to the parked project-link-preview decision, which stays deferred).
- Offline mode / full PWA / background sync.
- List virtualization or pagination for very large result sets (revisit only if needed).
- Relay-protocol redesign. (The existing 2026-06-05 note on the project-detail funding query —
  adaptive timeout / progressive render — is *related* and may be satisfied by the "non-blocking"
  criterion; deeper relay work beyond that is deferred.)
- Pages other than the main browse flow and project detail (curator/contributor/applicant pages may
  benefit incidentally but are not the target).

## Openness check
Catallax is open, permissionless, WoT-based — this story does not touch that:
- Caching is **per-browser, local, and holds only public Nostr events**. It grants no privilege and
  special-cases no pubkey, relay, or arbiter. A forker gets identical behavior.
- Correctness expectation tied to openness: the persisted cache must be **keyed to the active
  context** (relay set / account) so switching relays or accounts never shows another context's
  cached data as if it were current — consistent with relays/accounts being freely swappable.

## Open questions
- How much staleness is "too stale" for the background revalidate interval on the browse vs. the
  funding total? (A tuning detail; resolve in Architecture/Test Design — the criteria only require
  *that* it revalidates and that own-actions are immediate.)
- Whether to fold the parked 2026-06-05 funding-load perf note (adaptive timeout / progressive
  render) fully into this story or keep it as a follow-on — Architect's call given the "non-blocking"
  criterion already covers the user-visible part.

## Linked artifacts
- ADR: (filled in after Architecture phase)
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
