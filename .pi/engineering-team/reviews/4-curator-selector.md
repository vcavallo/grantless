# Review: Story 4 — Curator selector + real applicant view

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-03
**Diff:** `git diff 0c40049..HEAD` (12 files, +806/-2)

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean).
- [x] `npx eslint` — **PASS** (exit 0; 0 errors, 2 pre-existing warnings in `ArbiterFilters.tsx`/`TaskFilters.tsx`, untouched here).
- [x] `npx vitest run` (unit gate) — **PASS** (6 files, 29 tests; +13 new curation-resolver tests).
- [x] `npx vite build` — **PASS** (~2.4s; pre-existing chunk-size warning only).
- [x] `npm run test:e2e` — **PASS** (3 files, 18 tests: happy-path 5 + seed 9 + curator-resolution 4).

## Spec adherence

| AC | Evidence | Verdict |
|---|---|---|
| Curators discoverable + selectable, plain overridable source | e2e "discovers the distinct curators…"; `distinctCurators` unit; `CuratorBrowser` builds the picker from `parseConfiguredCurators(env) ∪ distinctCurators(lists)` (env empty by default) | ✅ |
| Selecting a curator resolves applicants via observer/source-tag, p-order, **not by signer** | e2e "resolves each curator to its own applicants…" + "resolves by observer, never by the signer"; unit `resolveCuratorApplicants`/`applicantsForCurator` + signer-independence test; `grep` confirms no `authors:` filter in the resolver/hook | ✅ |
| Applicants render via Story-1 engine (profile + projects + "No projects yet") | `NomineeGrid` reuses `NomineeCard`/`NomineeProjectItem`; `useTaskProposals` + `groupTasksByPatron` | ✅ (logic auto; visuals manual) |
| Replaceable-list latest-wins | e2e "…latest list winning" (two agents, same observer); unit "even out of created_at order" | ✅ |
| Remembers last curator | `useLocalStorage('grantless:lastCurator')` drives the `Select` value | ✅ manual |
| Empty / error states | `CuratorBrowser`: no-curators, zero-applicants, error → cards + `RelaySelector`; loading skeletons | ✅ manual |
| No privileged source (openness) | e2e two-curator isolation + signer-independence; `parseConfiguredCurators` empty default & overridable; reads use configured relay set | ✅ |

Every acceptance criterion maps to a passing automated test (resolver/protocol layer) or a clearly-scoped manual browser step (UI), consistent with the test plan and prior stories. No criterion dropped; no behavior beyond the story.

## ADR adherence

- Files match ADR 0004's implementation notes exactly: resolver added to `src/lib/grantless.ts`; `useApplicantCurationLists` (single `{kinds:[30392], limit}` query feeding discovery + resolution); `NomineeGrid` (shared, reuses `NomineeCard`); `CuratorBrowser`; `GrantlessBrowse` swap; `.env.example` doc.
- Layering respected: pure resolver in `lib/`, query in the hook, render in components — the ADR-0001 seam. No new event kinds; `NIP.md` unchanged.
- No new dependencies. Reuses `useTaskProposals` (the deferred over-fetch is intentional, per ADR).
- Option-A decisions honored: discovery ∪ empty-default config; pasted-naddr path left unmounted (not deleted); `observer`/`source-tag` resolution, never `#d`/signer.

## Things tests can't catch

- **Resolver never trusts the signer** — verified by code (`grep`: no `authors:`/`event.pubkey` filter) and by the e2e signer-independence test. This is the prime-directive-critical property; confirmed.
- **Dead code:** `NomineeBrowser.tsx` + `useNomineeList.ts` are now unmounted (only `CuratorBrowser` is routed). Intentionally retained (ADR 0004, mirroring `Index.tsx` after ADR 0001), flagged for a later cleanup. Not deleted to keep the diff focused and avoid touching untested Story-1 code. **Non-blocking.**
- **No secrets / no debug logging** introduced in the diff. No `TODO`/`fixme`/placeholder comments (custom eslint rules would block them).
- **Stale remembered curator** (saved pubkey not on the current relay): the `Select` shows the placeholder and the view falls to the explicit "hasn't listed any applicants" empty state with a `RelaySelector` — graceful, non-crashing. **Non-blocking.**
- `import.meta.env.VITE_GRANTLESS_CURATORS` is typed `any` (vite/client index signature); parsing is delegated to the unit-tested `parseConfiguredCurators`. Fine.

## House rules check

- [x] **Open / permissionless / WoT:** no curator/relay/signer special-cased; curator set is discovery ∪ empty-default override; resolution keys on `observer`/`source-tag`.
- [x] **Trust WoT-derived, not encoded:** the client renders whatever the selected curator's latest list says; confers nothing; the TA-signed list resolves under the curator, not the signer.
- [x] **Bootstrapping defaults only:** `VITE_GRANTLESS_CURATORS` empty by default, documented, overridable, merged (never privileged); reads use the configured/overridable relay set.
- [x] **Fork test:** point at another relay with other curators' lists → the picker shows them and resolves their applicants identically (e2e demonstrates the multi-curator path).
- [x] **nsec handling / user signaling:** N/A — read-only feature, no signing/payments added.

## Findings

### Blocking
None.

### Non-blocking
1. **`src/components/grantless/NomineeBrowser.tsx`, `src/hooks/useNomineeList.ts`** — now unmounted dead code; schedule a cleanup story to delete (or repurpose as an "advanced: paste a list" affordance) once the curator flow has proven out.
2. **`src/hooks/useApplicantCurationLists.ts:34`** — `{kinds:[30392], limit:500}` over-fetches on a large prod relay (no indexed `observer` filter). Acceptable for now (bounded; dev/local + modest prod); the `#d` fast-path is the documented future optimization.
3. **Inherited `useTaskProposals` over-fetch** (all catallax tasks; ADR 0001) — kept for correctness; flagged for an `authors`-scoped query when applicant sets grow.

## Verdict
**PASS** — the diff matches the story, ADR 0004, and the test plan; all four quality gates are clean and all three e2e suites pass; the prime-directive-critical property (resolve by `observer`, never by signer; no privileged curator; overridable defaults) is satisfied and tested. The UI is left for the user's visual check against the dev seed, as planned. Mergeable as-is.
