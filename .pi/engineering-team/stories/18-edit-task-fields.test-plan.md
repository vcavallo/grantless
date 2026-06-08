# Test Plan: Story 18 — Patron can edit a proposed task's fields

**Story:** `.pi/engineering-team/stories/18-edit-task-fields.md`
**ADR:** `.pi/engineering-team/decisions/0017-edit-task-fields.md`
**Date:** 2026-06-08

## Strategy

The re-publish + deadline round-trip logic this feature relies on **already exists and is tested**
(`catallax.buildTaskProposal.test.ts`, `catallax.taskProposalToInput.test.ts` cover deadline set/unset,
details-URL, categories, and tag preservation). So the genuinely-new logic is:

1. **Pure gating/parse rules** — *who* can edit (patron + proposed), *when* the amount is editable
   (no goal yet), and parsing the optional deadline input. These become small pure helpers and are the
   **runnable unit reds** (confirmed failing here). They also carry the openness assertion.
2. **UI behavior** — the edit dialog, amount-lock disable, open-for-funding confirmation, deadline
   field, validation. Exercised with **real events in a real browser** (Playwright) per house rules
   (no mocked-`useNostr`). Authoritative red for the implementer; not runnable in this NixOS env
   (no launchable Chromium), consistent with prior stories.

The seed already provides both fixtures needed: `seed-proposed-alice` (proposed, arbiter, **no goal** →
editable amount + open-for-funding) and `seed-seeking-alice` (proposed, **has goal** → locked amount).

## Coverage map

| Criterion (story AC) | Test name | Test file | Level |
|---|---|---|---|
| Edit affordance — patron, proposed only | `canEditTask: true only for the patron on a proposed task` | `src/lib/grantless.editTask.test.ts` | unit |
| Edit affordance — patron, proposed only (UI) | `patron sees Edit on their proposed task and can change a field` | `test/browser/edit-task.spec.ts` | e2e |
| No affordance otherwise | `canEditTask: false for non-patron or non-proposed` + `a non-patron sees no Edit; a non-proposed task offers no Edit` | unit + e2e |
| Editing descriptive fields re-publishes (identity/arbiter/goal/status preserved) | (covered by existing `taskProposalToInput.test.ts`) + `editing the description re-publishes and the detail page reflects it` | unit (existing) + e2e |
| Amount editable before funding opens | `canEditTaskAmount: true when proposed and no goal` + `amount field is editable on a proposed task with no goal` | unit + e2e |
| Amount locked after funding opens | `canEditTaskAmount: false once a goal exists` + `amount field is disabled with a reason on a task that has a goal` | unit + e2e |
| Open-for-funding confirmation | `opening for funding asks to confirm that the amount will lock; cancel makes no goal, confirm creates it` | `test/browser/edit-task.spec.ts` | e2e |
| Explicit, signed save | (inherent — `useNostrPublish` signs; asserted implicitly by the edit reflecting) | e2e |
| Immediate reflection | `editing the description re-publishes and the detail page reflects it` | e2e |
| Validation | `clearing the title blocks save with an error` | e2e |
| Optional deadline (set shows; empty hidden, never defaulted) | `parseDeadlineInput: date→unix, empty/invalid→undefined` + `setting a deadline shows it; a task with no deadline shows none` | unit + e2e |

## Edge cases
- [ ] `parseDeadlineInput`: empty string, whitespace, and invalid text all → `undefined` (never a default date).
- [ ] `canEditTaskAmount`: a `proposed` task that already opened for funding (has `goalId`) is locked.
- [ ] A task that is `proposed` but has a goal: descriptive fields editable, amount locked (both rules interact).
- [ ] **Openness / permissionlessness:** `canEditTask` is pure patron-equality — asserted for two distinct
      patron pubkeys, each can edit only their own task; no pubkey is special-cased, and it works for any key.

## Test infrastructure
- **Unit:** Vitest, pure, no relay/mocks. In-file `TaskProposal` factory.
- **E2E:** Playwright (`npm run test:browser`) against the seeded local strfry; login as the seeded
  patron (Alice / `ROSTER.applicants[0]`); navigate via `nip19.naddrEncode({kind:33401, pubkey, identifier})`
  (same pattern as `task-management.spec.ts`). No new seed fixtures required.
- **Mocks/fakes:** none.

## How to run
```
npm test               # tsc + eslint + vitest (unit reds here) + build
npm run test:browser   # Playwright e2e (needs a launchable Chromium + the seed)
```

## Verification
The unit reds fail against current code because `canEditTask`, `canEditTaskAmount`, and
`parseDeadlineInput` are not yet exported from `@/lib/grantless` (confirmed — see handoff output). The
Playwright spec is the outer red for the edit UI (no edit affordance exists yet); not executed in this
environment.
