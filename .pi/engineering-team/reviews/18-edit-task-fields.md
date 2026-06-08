# Review: Story 18 — Patron can edit a proposed task's fields (+ author guidance callouts)

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-08
**Diff:** `git diff b68e525..46e0073` (impl `585c3f2` + callouts `46e0073`)
**Story:** `.pi/engineering-team/stories/18-edit-task-fields.md`
**ADR:** `.pi/engineering-team/decisions/0017-edit-task-fields.md`
**Test plan:** `.pi/engineering-team/stories/18-edit-task-fields.test-plan.md`

## Quality gates (run by reviewer)
- [x] `npm test` — **pass.** 19 files, 126 tests.
- [x] `npx eslint` — **pass.**
- [x] `npx tsc -p tsconfig.app.json --noEmit` — **pass.**
- [x] `npm run build` — **pass.**

## Spec adherence (story ACs)
- [x] **Edit affordance — patron, proposed only** — `TaskDetail` renders `<EditProjectDialog>` only when
      `canEditTask(task, user?.pubkey)` (patron + `proposed`); unit-tested.
- [x] **No affordance otherwise** — same gate; non-patron / past-proposed → nothing.
- [x] **Editing descriptive fields re-publishes preserving identity/arbiter/goal/status** —
      `EditProjectForm` uses `buildTaskProposalTemplate({ ...taskProposalToInput(task), ...edits })`
      (the proven primitive; preservation already covered by `taskProposalToInput.test.ts`).
- [x] **Amount editable before funding opens** — input enabled when `canEditTaskAmount` (no goal).
- [x] **Amount locked after funding opens** — `amountLocked={!canEditTaskAmount(task)}` disables the
      input + shows the reason (`ProjectForm.tsx:151,158`).
- [x] **Open-for-funding confirmation** — `CrowdfundSection` wraps the button in an `AlertDialog`
      warning the amount locks; confirm → `openForFunding`, cancel → no goal.
- [x] **Explicit, signed save** — `useNostrPublish` signs every publish; success/error toasts; no silent write.
- [x] **Immediate reflection** — `useNostrPublish` invalidates `['catallax']` after publish.
- [x] **Validation** — shared zod schema; title-required etc.
- [x] **Optional deadline** — `parseDeadlineInput` → `undefined` when empty, so the builder omits it;
      `TaskDetail` already renders deadline only when present. Never defaulted.

## ADR adherence
- [x] Option A implemented exactly: shared presentational **`ProjectForm`** (fields + zod + optional
      deadline + amount-lock, emits normalized values via `onSubmit`); `CreateProjectForm` reduced to a
      thin create wrapper; new `EditProjectForm`/`EditProjectDialog`; `TaskDetail` gate; `CrowdfundSection`
      confirmation.
- [x] Re-publish goes only through `taskProposalToInput`+`buildTaskProposalTemplate` — preserved tags survive.
- [x] Resolved open question (deadline at create too, via the shared form) as the ADR anticipated.
- [x] No new dependencies. Pure helpers added to `grantless.ts` as the tested seam.
- [~] **Scope addition (disclosed):** the **author guidance callouts** (`PatronGuidance`, commit `46e0073`)
      are outside Story 18's ACs — a same-session UX add mirroring the Admin panel's stuck conditions for
      the patron. Reviewed as adjacent; clean and gated, but not in the story/test plan.

## Things tests can't catch
- [x] No secrets/nsecs; edits go through the signer.
- [x] No debug logging; no commented-out code.
- [x] Edit path **fixes** the latent duplicate-`catallax` tag for edits (filters `catallax` from the form
      categories; the builder re-adds it once) — `EditProjectForm.tsx:29`. (Other re-publish paths still
      double-add `catallax`; pre-existing, out of scope.)
- [x] Amount-lock uses a DOM-`disabled` `<Input>` inside a shadcn `FormField` (RHF Controller), so the
      value stays in form state and still submits — locked saves keep the current amount. **Correct by
      construction, but not exercised by an automated test** (see non-blocking #1).
- [x] `PatronGuidance` only judges visibility once curation has settled (`ready`/`empty`), so it never
      false-flags "invisible" on a loading/errored relay — same best-effort discipline as the Admin panel.

## House rules check
- [x] **Open / permissionless / WoT (prime directive):** `canEditTask` is pure patron-equality
      (unit-tested across two distinct pubkeys — no key special-cased). Editing is a patron re-publishing
      *their own* addressable event. The amount lock + confirmation are guardrails reflecting that the
      9041 goal isn't replaceable, not granted permissions. The guidance even reinforces permissionlessness
      ("self-curate … include your own pubkey").
- [x] **Trust WoT-derived:** unchanged.
- [x] **No hardcoded privileged defaults** introduced; no relay/arbiter/endpoint added.
- [x] **Fork test:** holds.
- [x] nsec safe; signing explicit (no payment surface changed here).

## Findings

### Blocking
None.

### Non-blocking
1. **Locked-amount SAVE path not e2e-covered.** The e2e checks the amount is *disabled* on a funding-open
   task but never *saves* a descriptive edit there. The RHF-Controller-preserves-disabled-value behavior
   is correct by reasoning, but add an e2e that edits+saves a field on `seed-seeking-alice` (has a goal)
   to prove the amount survives — it's the one path where a wrong assumption would silently break save.
2. **Playwright spec unrun in this env** (`test/browser/edit-task.spec.ts`) — NixOS has no launchable
   Chromium; owe a real `npm run test:browser` / staging eyeball for the edit UI + confirmation.
3. **Guidance callouts untested + minor message overlap.** `PatronGuidance` is outside the story/test
   plan; also it and `CrowdfundSection` both tell the patron to assign an arbiter on the same page —
   consider deduping or letting the callout own that message. Optional.

## Verdict
**PASS** — All four gates clean; every acceptance criterion implemented and (for the gating/lock/deadline
logic) unit-tested; conforms to ADR 0017; honors the prime directive (patron edits their own event, no
privilege, pure patron-equality gate). The guidance callouts are a clean, disclosed add-on. Findings are
non-blocking — most useful: an e2e that saves on a funding-open task, plus a real browser run of the
Playwright spec before relying on it.
