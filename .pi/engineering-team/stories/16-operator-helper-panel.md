# Story 16: Operator helper panel — stuck-project diagnostics

**Status:** Approved
**Created:** 2026-06-06
**Type:** Feature

## Background
Real users have posted projects and then wondered "why isn't my crowdfunding active?" Two
recurring causes leave a project silently invisible or unfundable:

1. **Not vouched by any curator** — the creator isn't a member of any curator's applicant set
   (usually because they were never tagged / listed), so their project never appears in the
   curator browse, even though the project event exists.
2. **No arbiter assigned** — a project with no arbiter can't open for funding, so crowdfunding
   never starts.

Both are diagnosable with read-only public queries, but today nobody has a single place to see
them, so the operator of a Grantless instance can't proactively spot stuck people and help.

This story adds a read-only **operator helper panel** ("admin panel") that surfaces these two
"stuck" conditions. It is a **convenience surface, not a privilege**: it confers no special power
(every query it runs is a public read anyone could run), it cannot edit, delete, moderate, or
publish anything (this is Nostr — no one can), and it is shown only to a configured **operator
pubkey** purely to declutter the UI. The operator pubkey is supplied via an ENV variable with no
default shipped, so a forker sets their own (and our deployment sets the maintainer's in Vercel).

The panel is intended to grow more diagnostic checks later; v1 ships exactly the two above.

## User-facing description
As the **operator of a Grantless instance** (identified by a configured pubkey), I want a read-only
panel that lists projects which are stuck in one of two states — *not vouched by any curator* or
*no arbiter assigned* — so that I can recognize and reach out to people whose crowdfunding isn't
active and help them get unstuck.

## Acceptance criteria
Testable from the outside. "Operator pubkey" = the pubkey configured via the operator ENV variable.
"Crowdfunding project" = a current/authoritative crowdfunding task proposal discoverable in the
app's active relay set.

- [ ] **Gating — match.** Given the operator ENV is set and the logged-in user's pubkey equals it,
      when they navigate to the app, then the operator panel is reachable/visible to them.
- [ ] **Gating — non-match & logged out.** Given a logged-in user whose pubkey is not the operator
      pubkey, OR a logged-out visitor, when they use the app, then **no "admin"/operator nav link or
      affordance is rendered anywhere** and the panel is not reachable through the UI.
- [ ] **Gating — unset ENV.** Given the operator ENV is unset/empty, when anyone (including the
      maintainer) uses the app, then no operator nav link is rendered and the panel is shown to
      no one.
- [ ] **"Not under any curator" list.** Given a crowdfunding project whose creator is not a member
      of any curator's applicant set discoverable in the active relay set, when the operator opens
      the panel, then that project is listed under the "not vouched by any curator" condition; and
      given a project whose creator IS a member of at least one such set, then it is not listed
      there.
- [ ] **"No arbiter assigned" list.** Given a crowdfunding project with no arbiter assigned, when
      the operator opens the panel, then it is listed under the "no arbiter assigned" condition
      (whether or not its creator is vouched); and given a project that has an arbiter, then it is
      not listed there.
- [ ] **Both conditions surfaced.** Given a project that is both unvouched and arbiter-less, when
      the operator opens the panel, then it is surfaced for both reasons (each reason identifiable).
- [ ] **Actionable rows.** Given any listed stuck project, when the operator views it, then the row
      shows the project title and current status, the specific reason(s) it's flagged, the creator's
      identity (name/short-npub, with a way to copy the npub), and a link to the project's detail
      page.
- [ ] **Read-only / no privilege.** Given the operator uses the panel, when they interact with any
      listed project, then no event is created, edited, deleted, or published as a side effect — the
      panel only reads and links.
- [ ] **Empty state.** Given no projects match either condition, when the operator opens the panel,
      then it shows a clear "nothing stuck" empty state rather than appearing broken.

## Out of scope
- Any moderation/edit/delete/takedown power (impossible on Nostr and explicitly unwanted).
- In-app contacting of creators (DM compose, notifications) — outreach is out-of-band for v1.
- Additional admin/diagnostic checks beyond the two named (e.g. goal-missing, mis-tagged, expired,
  funded-but-not-marked) — future iterations.
- The curator-scoped nuance "creator IS vouched but only under a curator the viewer hasn't selected"
  — v1 treats vouched-by-*any*-discovered-curator as not-stuck.
- Any server-side enforcement or real access control — the gate is a client-side convenience, not a
  security boundary, and is not claimed to be one.
- Performance/scaling work for very large relays (pagination, incremental scan) — revisit if needed.

## Openness check
This feature brushes against the prime directive ("no admins, no gatekeepers"), so it was framed
deliberately to stay compliant:
- **No privileged capability.** Every query the panel runs is a public read any client could
  perform. The panel cannot edit, delete, moderate, or publish anything. The operator gains zero
  power other participants lack — only a convenience view.
- **Not a security boundary.** The npub "gate" is cosmetic decluttering, evaluated client-side; it
  is explicitly not access control and is not relied on as such.
- **Overridable, no shipped default.** The operator pubkey is an ENV variable with no value baked
  into the repo. Unset → the panel exists for no one. A forker sets their own pubkey and gets an
  identically-working panel; our deployment sets the maintainer's pubkey in Vercel. No identity is
  privileged in code.
- **Honest, best-effort diagnosis.** "Not under any curator" is relative to the curators/lists the
  app can currently discover in its relay set; if a curator's list is unreachable, a creator could
  be flagged who is actually vouched elsewhere. The panel is a heuristic aid, not an authority — to
  be reflected in its copy.

## Open questions
- Should terminal-status projects (e.g. `concluded`/cancelled) be excluded from the "stuck" lists,
  since they are no longer fundable? (Leaning yes — confirm in Test Design.)
- Exact placement/route of the panel and how the operator reaches it (header affordance vs.
  direct route) — a "how" detail for the Architect.

## Linked artifacts
- ADR: (filled in after Architecture phase)
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
