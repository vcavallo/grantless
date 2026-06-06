# Review: Grantless UX fixes — payout note, profile relays, npub fallback

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-05
**Diff:** `git diff bed0817..HEAD` (commits a4a8630, 2ba7630, eb214da)

> No story/ADR/test-plan: these are three Implementer-level fixes (the small-UI
> precedent in `_intake.md` — like the 2.5/seed/mid-polish batches). Reviewed
> against intent captured in the intake log and the prime directive, not a story.

## Quality gates (run by reviewer, not trusted)

- [x] `npm test` — **pass.** 16 files, 100 tests passed.
- [x] `npx eslint` — **pass.** No errors.
- [x] `npx tsc -p tsconfig.app.json --noEmit` — **pass.** No errors.
- [x] `npm run build` — **pass.** Built in ~2.2s (pre-existing >500 kB chunk warning only).

## What the diff does

1. **a4a8630** — `TaskLifecycleActions.tsx`: under the arbiter's Conclude action, adds a
   muted note that Grantless records the outcome but doesn't move sats (settle payout/refund
   manually over Lightning), linking the Catallax reference client for the automated feature.
   Restructures the conclude block from a flex row to a `space-y-2` column to seat the note.
2. **2ba7630** — `CuratorBrowser.tsx`: fixes persistent name-resolution failure. Curator/applicant
   kind-0 profiles were queried only from the curation-list relays; now queries
   `union(getActiveRelays(config, presetRelays), listRelays)` via a memoized `profileRelays`.
   Mirrors the blessed `useZapGoal` union approach; no hardcoded relay fallback.
3. **eb214da** — replaces the `genUserName` fabricated placeholder with a short npub across the
   Grantless surfaces (NomineeCard, ApplicantProjects, NomineeProjectItem, AssignArbiterControl,
   TaskDetail, CuratorBrowser) via a new shared `src/lib/shortNpub.ts`.

## Spec adherence (vs. intake intent)
- [x] Payout/refund: matches the recorded decision — keep manual, point to the reference client.
- [x] Profile relays: addresses the "Wise Owl persists on prod" report at its root (wrong relay set).
- [x] npub fallback: addresses the "never show that placeholder, show npub" ask on every Grantless surface.
- [x] No behavior added beyond the three asks.

## ADR adherence
- [x] N/A (no ADR for these fixes). Reuses existing patterns: `getActiveRelays`/`useAppContext`
      (same as `useZapGoal`), `useNomineeProfiles`, shared lib helper. No new dependencies.
- [x] Layering respected: pure helper in `src/lib/`, consumed by components.

## Things tests can't catch
- [x] No secrets / nsecs introduced.
- [x] No leftover debug logging or `console.log`.
- [x] No commented-out code. (Old local `shortNpub` in CuratorBrowser was removed, not commented.)
- [x] Edge cases: `shortNpub` try/catches a bad pubkey → truncated hex. Avatar initial uses
      `shortNpub(pubkey).slice(5)` to skip the `npub1` prefix (avoids a uniform "NP" initial);
      hex-fallback path still yields a sane 2-char initial. `ApplicantProjects` keeps its
      `'Applicant'` / `'A'` guards when `pubkey` is null.
- [x] No refetch/loop risk: `profileRelays` is memoized; react-query hashes key contents, so a
      same-contents array won't refetch.
- [x] `genUserName` still used by `AuthorAvatar`, `AccountSwitcher`, `NoteContent`, `AuthorName`
      — not dead code; `genUserName.ts` + its test legitimately remain.
- [x] No scope creep: non-Grantless components deliberately left on `genUserName`.

## House rules check
- [x] **Open / permissionless / WoT (prime directive):** no pubkey/relay/arbiter special-cased.
      The relay fix *broadens* reads to the user's overridable active set ∪ the list's own relay
      hints — strictly more decentralized than before, with an explicit "no hardcoded relay
      fallback" comment. Fork test holds: repoint relays via config and it works identically.
- [x] **Trust is WoT-derived, not encoded:** unchanged; profile resolution is relay plumbing.
- [x] **Bootstrapping defaults only:** no new relay/Blossom/arbiter/endpoint default added. The
      `catallax-reference-client.netlify.app` link is informational copy (same class as the
      existing GitHub "fork this" and MKStack links) — not infrastructure the app depends on,
      grants no privilege, and the app functions identically without it.
- [x] nsec handling: untouched, safe.
- [x] User signaling: the new copy *improves* signaling — it makes explicit that concluding does
      not move funds and that settlement is a manual out-of-band Lightning action.

## Findings

### Blocking
None.

### Non-blocking
1. **NomineeCard.tsx:30-34 / ApplicantProjects.tsx:28-30** — `shortNpub(pubkey)` is computed
   twice (display name + avatar initial). Micro-inefficiency on a cheap pure function; optional
   to hoist into one `const`.
2. **NomineeCard.tsx:47** — the npub fallback renders in `font-semibold` (sans), whereas the
   CuratorBrowser dropdown and TaskDetail render npubs in `font-mono`. Minor visual inconsistency;
   optional to monospace the fallback for a clearer "this is an identifier, not a name" cue.
3. **CuratorBrowser.tsx (relay union)** — behavioral bugfix with no automated test; it manifests
   only against real prod relays (applicant kind-0 on third-party relays), so it can't be
   reproduced on the single-relay local seed and relies on manual prod verification. Consistent
   with the small-UI/no-test precedent, but worth a note when the user verifies on prod.

## Verdict
**PASS** — All four gates clean. The three fixes match the recorded intent, reuse established
patterns (`getActiveRelays` union, shared lib helper), introduce no new dependencies or dead code,
and strengthen rather than weaken the prime directive (broader user-overridable relay reads, no new
hardcoded infra). Findings are non-blocking polish. Mergeable as-is.
