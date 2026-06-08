# ADR 0017: Patron edit of a proposed task — shared form, re-publish, amount lock + confirmation

**Status:** Accepted
**Date:** 2026-06-08
**Story:** `.pi/engineering-team/stories/18-edit-task-fields.md`

## Context

Story 18: let a **patron** edit their own task's create-time fields while it is `proposed`, to fix
mistakes (the motivating case: a typo'd funding amount). Editable fields = title, description,
requirements, amount, details URL, categories, **plus an optional deadline** (empty → never shown,
never defaulted). The **amount is editable only before a goal exists** (`!task.goalId`); once funding
opens it's locked, because the NIP-75 goal (kind 9041) is a *regular, non-replaceable* event whose
contributions reference a specific goal id. And the **open-for-funding transition must warn** that it
locks the amount.

Existing building blocks:
- **`CreateProjectForm`** (`src/components/grantless/CreateProjectForm.tsx`) — a react-hook-form + zod
  form (title, description, requirements, amount, detailsUrl, categories) that builds a fresh task via
  `buildTaskProposalTemplate({ d: generateTaskId(title), patronPubkey: user.pubkey, …, status:
  'proposed' })` and publishes. **No deadline field today.**
- **`CreateProjectDialog`** — the dialog wrapper (trigger + login gate) that hosts the form.
- **Re-publish primitive** (`src/lib/catallax.ts`): `taskProposalToInput(task)` →
  `buildTaskProposalTemplate({ ...input, <overrides> })` rebuilds the 33401 preserving `d`, patron,
  arbiter `p`/`a`, worker, `goal`, status, categories — already used by arbiter-assign and status
  changes. `deadline` is carried on `content.deadline` and **omitted when undefined** by the builder.
- **`CrowdfundSection.openForFunding`** (`CrowdfundSection.tsx:62-81`) — patron-only, shown when
  `isPatron && task.arbiterPubkey && task.status === 'proposed'`; publishes the 9041 then re-publishes
  the task with `goalId`. This is the point the amount locks.
- **`TaskDetail`** already renders the deadline conditionally (`task.content.deadline && …`); browse
  cards don't render it — so "hide when empty" largely holds already.
- shadcn `Dialog` and `AlertDialog` both exist; native `<input type="date">` covers an optional date
  with no new dependency. `useNostrPublish` signs every publish (explicit signer prompt) and
  invalidates `['catallax']` (own-action freshness).

Constraints: prime directive (patron edits *their own* event — no privilege/gatekeeper); separation of
concerns; minimal coupling/forkable; explicit signing.

## Options considered

### Option A — Lift a shared presentational `ProjectForm`; new `EditProjectDialog`; confirm on open (chosen)
- **Extract the fields + zod validation into a presentational `ProjectForm`** that emits *validated
  values* via `onSubmit(values)` and takes `initialValues?`, `amountLocked?`, `submitLabel?`,
  `isPending?`. Add an **optional `deadline`** field (native date input; empty → `undefined`).
- **`CreateProjectDialog`** owns create `onSubmit` (build new template, current behavior).
- **New `EditProjectDialog`** owns edit `onSubmit`: `buildTaskProposalTemplate({
  ...taskProposalToInput(task), title, description, requirements, amount, detailsUrl, categories,
  deadline })` → publish (re-publish under the same coordinate). Pre-fills `initialValues` from the
  task; passes `amountLocked={!!task.goalId}`.
- **Edit affordance** lives on `TaskDetail`, shown only when `isPatron && task.status === 'proposed'`.
- **Amount lock:** when `amountLocked`, the amount input is disabled with a short reason.
- **Confirmation:** wrap `CrowdfundSection`'s "Open for funding" in an `AlertDialog` — proceed to
  `openForFunding` only on confirm; cancel leaves the task (and editable amount) untouched.
- Because the form is shared, the optional **deadline is available at create too** (symmetry — resolves
  the story's open question); optional and empty by default, so creation is otherwise unchanged.
- **Pros:** one source of fields + validation (DRY); clean separation (form = presentation, dialogs =
  action); reuses the proven re-publish primitive; no new deps; minimal new surface (one dialog + one
  confirm). Patron-only by construction.
- **Cons:** a real (small) refactor of `CreateProjectForm` — touches the working create path, so it
  must stay behavior-identical for create.

### Option B — Add edit-mode props to `CreateProjectForm` (no extraction)
Give the existing form a `task?`/`mode` prop and branch the submit internally.
- **Pros:** smallest diff.
- **Cons:** one component owns two responsibilities (create vs. re-publish) + the publish; muddier than
  lifting `onSubmit`. Rejected for separation-of-concerns, though acceptable if the refactor proves big.

### (Option C — separate `EditProjectForm` duplicating fields/validation)
- **Cons:** duplicates the schema and field markup; the two drift. Rejected (DRY).

## Decision
**Option A.** Lifting a shared `ProjectForm` keeps validation/fields in one place, isolates the
create-vs-edit action in the dialogs, and reuses the established re-publish primitive — the smallest
clean way to satisfy the story while keeping the create path intact.

## Consequences
- **Enables:** patrons fixing proposed-task fields (incl. the amount pre-funding); an explicit,
  signed re-publish; a deadline field for both create and edit; a clear point-of-no-return warning.
- **Constrains / trade-offs:** the create form is refactored (must verify create still behaves
  identically). Amount edits after a goal exists remain deliberately impossible (locked) — the messy
  re-create-goal case stays deferred.
- **Follow-ups:** changing the amount after funding opens (new goal + orphaned-contribution handling)
  is a separate future story; an edit-history/diff UI is out of scope.

## Openness / permissionlessness check (required)
- **Special privileges/capabilities?** **No.** A patron re-publishing their own addressable
  `33401:<patron>:<d>` is inherent to Nostr. Offering edit to the patron (not arbiter/worker) is UI
  scoping, not a protocol privilege — anyone can publish their own events outside the app.
- **Trust WoT-derived, not encoded?** **Yes** — unchanged.
- **Hardcoded defaults introduced:** none. The amount lock + confirmation are client-side guardrails
  reflecting the protocol fact that 9041 isn't replaceable — not a granted permission.
- **Fork test:** **Yes.** No infra/operator dependency; a fork behaves identically.

## Implementation notes
- **`src/components/grantless/CreateProjectForm.tsx`** → extract a presentational `ProjectForm`
  (rename or split): keep the zod schema, add an optional `deadline` field
  (`z.union([z.literal(''), z.string()])` parsed to a unix-seconds number or `undefined`; native
  `<input type="date">`). Props: `initialValues?: Partial<FormValues>`, `amountLocked?: boolean`,
  `submitLabel?: string`, `onSubmit: (values) => Promise<void> | void`, `isPending?: boolean`. When
  `amountLocked`, render the amount input `disabled` with a one-line reason.
- **`CreateProjectDialog.tsx`** — pass create `onSubmit` (build new template via
  `buildTaskProposalTemplate({ d: generateTaskId(title), patronPubkey, …, status: 'proposed',
  deadline })` + publish; keep current success/close).
- **New `src/components/grantless/EditProjectDialog.tsx`** — trigger (e.g. "Edit") rendered on
  `TaskDetail` only when `isPatron && task.status === 'proposed'`; hosts `ProjectForm` with
  `initialValues` from the task and `amountLocked={!!task.goalId}`; `onSubmit` =
  `publishEvent(buildTaskProposalTemplate({ ...taskProposalToInput(task), …edited, deadline }))` then
  refresh (the page already invalidates on update).
- **`src/pages/TaskDetail.tsx`** — mount `<EditProjectDialog task={task} />` in the patron-visible,
  `proposed`-only region.
- **`src/components/grantless/CrowdfundSection.tsx`** — wrap the "Open for funding" button in an
  `AlertDialog`: title/body warn that opening locks the funding amount (it can't be changed after);
  confirm → existing `openForFunding()`; cancel → no-op.
- **Deadline display:** confirm no listing path defaults a date; render only when
  `task.content.deadline` is set (TaskDetail already does; verify cards/`ApplicantProjects`).
- Keep `taskProposalToInput`/`buildTaskProposalTemplate` as the only re-publish path so all preserved
  tags (arbiter, goal, status) survive an edit.

## Out of scope
- Amount change / goal re-creation after funding opens (deferred story).
- Editing by arbiter/worker, or editing past `proposed`.
- Edit-history / revision-diff UI.
- A richer date picker beyond a native date input (Architect may swap in the shadcn Calendar if
  trivial, but it's not required).
