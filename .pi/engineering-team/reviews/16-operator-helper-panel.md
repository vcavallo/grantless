# Review: Story 16 — Operator helper panel (stuck-project diagnostics)

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-07
**Diff:** `git diff 5fbcf41..HEAD` (impl commit `983b25c`)
**Story:** `.pi/engineering-team/stories/16-operator-helper-panel.md`
**ADR:** `.pi/engineering-team/decisions/0015-operator-helper-panel.md`
**Test plan:** `.pi/engineering-team/stories/16-operator-helper-panel.test-plan.md`

## Quality gates (run by reviewer, not trusted)

- [x] `npm test` — **pass.** 18 files, 115 tests.
- [x] `npx eslint` — **pass.** No errors.
- [x] `npx tsc -p tsconfig.app.json --noEmit` — **pass.** (Also re-checked `src`+`test` via a throwaway config → 0 errors, covering the seed/spec edits the gate's `src`-only config skips.)
- [x] `npm run build` — **pass.** (~2.1s; pre-existing chunk-size warning only.)

## Spec adherence
- [x] **Gating — match** (`useIsOperator` true → `GrantlessBrowse.tsx:27-31` renders the Admin link; `/admin` → `OperatorPanel` passes the guard).
- [x] **Gating — non-match & logged out** (`GrantlessBrowse` link is conditional on `isOperator`; `OperatorPanel.tsx:80` returns `<NotFound/>` when not operator — no link, route 404s).
- [x] **Gating — unset ENV** (`parseOperatorPubkeys('')→[]` ⇒ `useIsOperator` always false; unit-tested in `grantless.operator.test.ts`).
- [x] **"Not under any curator"** (`findStuckProjects` unvouched = `!vouched.has(patronPubkey)`; `grantless.ts:230-241`).
- [x] **"No arbiter assigned"** (`arbiterless = !task.arbiterPubkey`).
- [x] **Both conditions surfaced** (separate arrays → both `Section`s; a project can appear in both; unit-tested).
- [x] **Exclude concluded** (`active = tasks.filter(status !== 'concluded')`; unit-tested).
- [x] **Actionable rows** (`StuckRow`: title, status badge, reason, creator name/`shortNpub` + `CopyNpubButton`, `/task/:naddr` link).
- [x] **Read-only / no privilege** (panel only reads + links; no publish/edit/delete control anywhere).
- [x] **Empty state** (`nothingStuck` card; per-section "None" sub-state).
- [x] No behavior beyond the story (analytics deferred, no outreach, no moderation).

## ADR adherence
- [x] Pure helpers in `lib/grantless.ts` (`vouchedApplicantPubkeys`, `findStuckProjects`, `parsePubkeyList`→`parseOperatorPubkeys`) exactly as specified; `parseConfiguredCurators` generalized over the shared parser (the ADR's suggested DRY).
- [x] `useIsOperator` + thin `useStuckProjects` composing `useTaskProposals` + `useApplicantCurationLists` — matches.
- [x] `/admin` page self-guards to `NotFound`; conditional nav link; docs in `README.md` + `.env.example` — matches.
- [x] No new dependencies.
- [~] **Deviation (non-blocking, disclosed):** ADR notes implementation notes say "lazy" route import; the impl uses an **eager** import (`AppRouter.tsx:9,23`) to match the repo's existing pattern (every other route is eager). This is an incidental detail, not a design decision, and "follow existing patterns" justifies it. Accepted.

## Things tests can't catch
- [x] No secrets/nsecs introduced. The seed nsecs are pre-existing dev fixtures; Frank's **npub** (public) in `playwright.config.ts` is test config, not app code.
- [x] No leftover debug logging in new code (the `console.log`s in `useTaskProposals` are pre-existing; ADR said don't add more — none added).
- [x] No commented-out code.
- [x] `useIsOperator` memoizes env read with `[]` deps — correct, env is build-time constant.
- [x] Seed edits are type-safe and guarded (`spec.arbiter` narrowed at every use; arbiter-less projects never reach goal/conclusion paths).
- [x] Read-only: `CopyNpubButton` accessible name is "Copy npub" — does not match the spec's forbidden-control regex; no mutation path exists.

## House rules check
- [x] **Open / permissionless / WoT (prime directive):** the panel grants **no** capability — every query is a public read; it cannot edit/delete/moderate/publish. No pubkey/relay/arbiter is special-cased or allowlisted in app code.
- [x] **Trust WoT-derived, not encoded:** the panel *diagnoses absence* of curation; "vouched" is computed live from curator-published lists; no trusted pubkey is hardcoded.
- [x] **Bootstrapping defaults only:** one new default — `VITE_GRANTLESS_OPERATOR` — ships **empty** (no identity in the repo), documented in README + `.env.example` as an overridable convenience with no elevated status. The gate is explicitly cosmetic, not access control.
- [x] **Fork test:** a forker sets their own `VITE_GRANTLESS_OPERATOR` and gets an identical panel; nothing depends on a specific operator/relay/our infra.
- [x] nsec handling safe; no signing/payment in this read-only feature.

## Findings

### Blocking
None.

### Non-blocking
1. **`src/hooks/useStuckProjects.ts:13-14` — curation-list load failure over-flags.** When
   `useApplicantCurationLists` returns `status: 'error'` (e.g. the Brainstorm SPOF), `lists` is `[]`,
   so `vouched` is empty and **every** non-concluded project is flagged "unvouched." `isLoading` only
   covers `'loading'`, not `'error'`, so the panel renders a wall of false positives with no warning.
   The story's openness note and the page copy ("best-effort… heuristic") already accept this, so it's
   not a regression — but consider surfacing a distinct "couldn't load curator lists" caveat when
   `status === 'error'` so the operator isn't misled. Optional.
2. **`src/hooks/useStuckProjects.ts` — no memoization.** `vouchedApplicantPubkeys`/`findStuckProjects`
   recompute each render. Cheap pure ops over small, reference-stable arrays; harmless. Optional.
3. **E2E unverified in this environment.** The Playwright spec (`test/browser/operator-panel.spec.ts`)
   and `seed.e2e` could not be executed here (NixOS lacks a launchable Chromium; seed-e2e needs the
   docker relay) — consistent with prior stories. The seed/spec/config are type-checked and the seed
   fixtures were authored by Carol (a non-applicant) to avoid disturbing browse/ordering specs, but a
   real `npm run test:browser` run is still owed to confirm the outer ring green. Flag for the next
   environment that can run it; the runnable unit ring (15 tests) fully covers the detection logic.

## Verdict
**PASS** — All four gates clean. Every acceptance criterion is implemented and (for the detection
logic + env gating) unit-tested; the design matches ADR 0015 (one disclosed, justified eager-import
deviation); and the feature strengthens rather than weakens the prime directive (read-only, no
privilege, empty-by-default overridable operator, fork test holds). Findings are non-blocking polish
plus the documented e2e-can't-run-here caveat. Mergeable as-is.
