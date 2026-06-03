# Story 11: Browse under a Curator — filters, sorts, funding cards, shareable URL

**Status:** Approved
**Created:** 2026-06-03
**Type:** Feature

## Background
The curator browse (Story 4) renders every applicant with all their projects as flat title+status rows. With the full lifecycle (Stories 5–7) in place, a curator's world is now rich enough to need shaping: a viewer should be able to **see funding at a glance**, **filter** to what they care about (what's seeking funds, what needs a worker, hide the finished stuff), **sort** (including by funding progress), and **share a curator's view by URL**. This is the epic's "Browse under a Curator" story.

## User-facing description
As a viewer browsing a curator's world, I want project cards that show funding progress, plus filters and sorts to focus on what matters to me (fund something, pick up work, skip concluded projects), and a shareable link to a curator's view, so that the browse is useful rather than an undifferentiated wall of projects.

## Acceptance criteria
- [ ] **Funding shown on cards.** Given a project that is **in a funding state** (has a 9041 goal and isn't concluded), then its card shows a **funding progress indicator** — amount raised vs. target and the backer count; a project with **no goal** shows its status as before; a **concluded** project is shown distinctly (de-emphasized / marked done).
- [ ] **Hide concluded (default on).** Given the browse loads, then concluded projects are hidden by default; a toggle reveals them.
- [ ] **Filter by status.** Given the status filter, when the viewer selects one or more statuses (proposed / funded / in-progress / submitted / concluded), then only projects in those statuses are shown.
- [ ] **Sorts.** Given the sort control, the viewer can order projects by **Newest** (created), **Funding progress** (most-funded first), or **Largest goal** (target amount); the chosen order is applied within each applicant.
- [ ] **Seeking-funding filter.** Given the "seeking funding" filter is on, then only projects with a goal that is **not yet met** are shown.
- [ ] **Needs-a-worker filter.** Given the "needs a worker" filter is on, then only **funded** projects with **no worker assigned** are shown.
- [ ] **Hide empty applicants.** Given the "hide empty applicants" toggle is on, then after filtering, applicant cards with **no matching projects** are not rendered (the screen isn't padded with "No projects yet").
- [ ] **Shareable curator URL.** Given a curator is selected, then the browse is reachable at a stable per-curator path (e.g. `/c/<npub>`); visiting that URL **loads that curator pre-selected** and resolves their applicants; selecting a different curator updates the URL so it can be bookmarked/shared; an invalid/unknown npub falls back gracefully (no crash) to the curator picker.
- [ ] **No privileged actor (openness).** Given the above, then filters/sorts/cards operate purely client-side over the *selected curator's resolved set*; the curator URL is just an npub (any curator works, none privileged); funding progress is derived from public zap receipts; reads use the configured, overridable relay. Anyone could share their own curator's URL and it resolves identically against their relay.

## Out of scope
- **Deadline / submitted-date / completed-date sorts** — these need extra per-task event reads (the submission/conclusion timestamps); deferred. Sorts here are created-at, funding-progress, and target-amount.
- **Text search** by title (considered, dropped from v1).
- **Encoding filters/sorts in the URL** — only the *curator* is in the URL this story; filter/sort state stays local (a later nicety).
- **Real Lightning** — funding progress is from the (mocked) zap receipts of Story 7.
- **Multi-curator union / cross-curator "my involvement" views.**

## Openness check
Everything here shapes the *viewer's chosen curator's* set — no curator, relay, or pubkey is privileged. The shareable URL carries only an npub (any curator), so sharing a view is just sharing a pointer, not conferring status; an unknown npub degrades to the picker. Funding progress is a derived tally of public receipts, not a trusted value. Reads use the configured, overridable relay. A forker shares their own curators' URLs against their own relay identically. Consistent with the prime directive.

## Open questions
Resolved during planning (with the user):
- **Extras included:** seeking-funding, needs-a-worker, hide-empty-applicants (text search dropped).
- **Shareable URL:** curator-in-URL (`/c/:npub`) is in scope this story; filters stay local.
- **Sorts:** Newest / Funding progress / Largest goal; date-based sorts deferred (need extra reads).
- **Per-project funding data:** fetched in **one batch** for the visible projects (not a query per card) so sorting by funding progress is deterministic.

## Linked artifacts
- Epic: `.pi/engineering-team/epics/grantless-mvp.md` (Story 11 row — filters / date sorts / shareable URLs)
- Builds on: Story 4 (`CuratorBrowser`, curator resolver), Story 7 (`calculateGoalProgress`, goals + mocked receipts), Story 1 (`NomineeCard`/`NomineeProjectItem`/`NomineeGrid`), `parsePubkey` (Story 6.5) for the npub route param.
- ADR: `.pi/engineering-team/decisions/0010-browse-under-curator.md`
- Test plan / Review: filled in later phases.
