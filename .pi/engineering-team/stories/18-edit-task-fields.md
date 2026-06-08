# Story 18: Patron can edit a proposed task's fields

**Status:** Approved
**Created:** 2026-06-08
**Type:** Feature

## Background
A patron fills in several fields when creating a project (title, description, requirements,
funding amount, details URL, categories). Mistakes happen — one real user typo'd their funding
amount (an extra zero) and had no way to fix it. Today there is no edit path: Story 6.5 deliberately
deferred "editing a task's content fields … to its own story." This is that story.

Protocol facts that bound the design:
- The **task (kind 33401) is replaceable/addressable** (keyed by `patron:d`), so correcting its
  fields is a re-publish of the same `d` — the app already uses this re-publish primitive for
  arbiter assignment and status changes.
- The **crowdfunding goal (kind 9041) is NOT replaceable** (a NIP-75 regular event, no `d` tag), and
  contributions (zap receipts) reference a *specific* goal id. So the funding **amount** cannot be
  edited in place once a goal exists — changing it would require a new goal and would orphan any
  contributions.

Confirmed scope decisions:
- **Edit window = while `proposed` only** (before an arbiter/funding/work changes the terms).
- **Amount policy = lock once funding opens.** The amount is editable only while no goal exists yet
  (no contributions possible); once funding is open, the amount is locked. This keeps the typo case
  trivially clean and avoids orphaned contributions. Opening for funding is the point of no return,
  so that transition must warn the patron up front that the amount locks.
- **Editable fields = all the create-form fields** the patron filled in: title, description,
  requirements, amount (subject to the lock), details URL, categories — **plus an optional deadline**.
  The deadline is optional: when left empty it must not be shown on listings and must never be
  defaulted to a date.

## User-facing description
As the **patron (author) of a proposed task**, I want to edit the fields I entered when creating it,
so that I can correct mistakes (like a mistyped funding amount) without abandoning and re-creating
the project.

## Acceptance criteria
Testable from the outside.

- [ ] **Edit affordance — patron, proposed only.** Given I am the patron of my task and it is in
      `proposed` status, when I view it, then I can open an edit form pre-filled with its current
      field values.
- [ ] **No affordance otherwise.** Given a task that is not mine, OR is past `proposed`
      (funded/in_progress/submitted/concluded), when I view it, then no edit affordance is shown and
      I cannot edit it through the UI.
- [ ] **Editing descriptive fields.** Given the edit form, when I change the title, description,
      requirements, details URL, or categories and save, then the task is re-published under the same
      identity (`patron:d`) with the new values, and the change is reflected on the task and in the
      browse — with status, arbiter, goal link, and all other existing data preserved.
- [ ] **Amount editable before funding opens.** Given my proposed task has **no goal yet**, when I
      edit the amount and save, then the corrected amount is stored on the task.
- [ ] **Amount locked after funding opens.** Given my proposed task **already has a goal**, when I
      open the edit form, then the amount field is disabled/locked with a clear reason (the goal
      can't be changed without orphaning contributions); the other fields remain editable.
- [ ] **Open-for-funding confirmation.** Given my proposed task with no goal yet, when I open it for
      funding (which creates the goal), then I must first confirm an explicit warning that doing so
      **locks the funding amount** (it can't be changed afterward) — and the goal is created only if I
      confirm; cancelling leaves the task unchanged and the amount still editable.
- [ ] **Explicit, signed save.** Given I save an edit, when it is published, then it goes through an
      explicit signature (nothing is published silently), and only the fields I changed differ.
- [ ] **Immediate reflection.** Given I save a valid edit, when it completes, then my change is
      visible immediately on the relevant pages (not hidden behind stale cache).
- [ ] **Validation.** Given I clear a required field or enter an invalid amount/URL, when I try to
      save, then I get a validation error and nothing is published — same rules as creation.
- [ ] **Optional deadline.** Given the edit form, when I set a deadline and save, then it is stored
      and shown on the task; and given I leave the deadline empty (or clear it), when I save, then no
      deadline is stored and none is shown anywhere on listings — it is never defaulted to a date.

## Out of scope
- **Changing the amount (or re-creating the goal) after funding has opened / contributions exist** —
  the messy case (orphaned contributions, reset progress). Deferred to its own story; v1 locks it.
- **Editing by an arbiter or worker** — they have lifecycle/role actions, not content edits. Editing
  content is the patron's affordance only.
- **Editing tasks past `proposed`** (funded and beyond).
- **Changing the assigned arbiter** — that's the existing arbiter control, a separate flow.
- An **edit-history / revision-diff UI** — Nostr retains revisions, but surfacing a changelog is not
  part of this story.

## Openness check
Catallax is open, permissionless, WoT-based — this story respects that:
- A patron re-publishing **their own** replaceable event is inherent to Nostr; it grants no privilege
  and introduces no gatekeeper. The task coordinate `33401:<patron>:<d>` is authored by the patron,
  so editing it is just the author updating their own event.
- Offering the edit affordance to the patron (and not arbiter/worker) is a **UI scoping** choice, not
  a protocol privilege — anyone can always publish their own events outside the app. No pubkey, relay,
  or arbiter is special-cased.
- The amount lock is a **client-side guardrail** against orphaning public contributions, not an
  authority — it reflects the protocol reality that 9041 isn't replaceable, not a granted permission.

## Open questions
- Exact placement of the edit affordance (detail page vs. inline) and whether it reuses the create
  form — a "how" for the Architect.
- Copy for the locked-amount explanation — to settle in Test Design / implementation.
- Whether the **create** form should also gain the optional deadline field for symmetry (since the
  edit form now has it), or leave creation as-is and only expose deadline on edit — Architect's call.

## Linked artifacts
- ADR: (filled in after Architecture phase)
- Test plan: (filled in after Test Design phase)
- Review: (filled in after Review phase)
