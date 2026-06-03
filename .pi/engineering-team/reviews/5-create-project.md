# Review: Story 5 — Create a project

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-03
**Diff:** `git diff 6ce41bf..HEAD` (10 files, +703/-3)

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean).
- [x] `npx eslint` — **PASS** (exit 0; 0 errors, the 2 pre-existing `*Filters.tsx` warnings only).
- [x] `npx vitest run` (unit gate) — **PASS** (7 files, 37 tests; +8 new builder tests).
- [x] `npx vite build` — **PASS** (~2.5s).
- [x] `npm run test:e2e` — **PASS** (4 files, 22 tests: happy-path 5 + seed 9 + curator 4 + create-project 4).

## Spec adherence

| AC | Evidence | Verdict |
|---|---|---|
| Creates a valid `proposed`/`crowdfunding` 33401 (d, patron `p[0]`, amount, status, funding_type, t:catallax, JSON content) | unit "carries the required tags…" + round-trip; e2e "publishes a parseable proposed/crowdfunding 33401 authored by the grantee" | ✅ |
| No arbiter / no goal at creation | unit "carries no arbiter p/a tag and no goal"; e2e "creates no arbiter and no goal at proposal time" | ✅ |
| Surfaces under the grantee (t:catallax, patron-signed, parseable, in curator list) | e2e "is authored by the patron…" + "would render under the grantee…"; browse auto-refresh via `useNostrPublish` `['catallax']` invalidation | ✅ (logic auto; visual manual) |
| Login-gated; can't publish logged out | `CreateProjectDialog` shows `LoginArea` when no `user`; `CreateProjectForm` returns a login notice; `useNostrPublish` throws if logged out | ✅ manual |
| Input validation; nothing published on invalid | zod schema (title/description/requirements non-empty; amount int>0; url) via `zodResolver`; submit blocked until valid | ✅ manual |
| Clear feedback + safe signing | explicit signer prompt (`user.signer` in `useNostrPublish`); success/destructive `toast`; `form.reset()` + dialog close | ✅ manual |
| No privileged actor (openness) | event authored by the user's own key; no relay/arbiter special-cased; e2e/unit use arbitrary keys | ✅ |

Every protocol-facing criterion maps to a passing unit + real-event e2e test; the form UI is the clearly-scoped manual step, consistent with the test plan and prior stories.

## ADR adherence

- Files match ADR 0005: pure `buildTaskProposalTemplate` + `TaskProposalInput` in `src/lib/catallax.ts`; `CreateProjectForm` (RHF/zod, the `EditProfileForm` pattern); login-gated `CreateProjectDialog`; mounted in `GrantlessBrowse` header. Legacy `/catallax` `TaskProposalForm` untouched.
- Builder is pure/deterministic (caller supplies `d` via `generateTaskId`); positional `p` ordering (patron, arbiter, worker) + `a`/`goal` honored and unit-locked for Stories 6–8.
- No new event kinds (`NIP.md` unchanged); no new dependencies; browse refresh reuses the existing invalidation.
- Option A honored: minimal slice — `proposed`/`crowdfunding`, arbiter-less, goal-less.

## Things tests can't catch

- **Builder ↔ parser agreement** — every unit case round-trips through `parseTaskProposal`, and the e2e parses the real published event. The prime risk (a malformed/ misordered 33401) is covered.
- **No accidental arbiter/goal** on a proposed task — asserted in both unit and e2e (the Stories 6–7 boundary is enforced, not just intended).
- **Prod CSP unchanged** — `dist/index.html` still `connect-src … wss:` (no `ws:`); the Story-5 diff doesn't touch the production security posture.
- No secrets / no debug logging in the diff; no `TODO`/`fixme`/placeholder comments. The signer is the only thing that touches keys (no nsec exposure).
- **Authorized-updater**: the proposal is patron-signed, so `useTaskProposals` accepts it (e2e asserts `event.pubkey === patronPubkey`).

## House rules check

- [x] **Open / permissionless / WoT:** posting is open to any logged-in key; the event is the user's own; nothing special-cased. Visibility stays curator-gated (Story 4) — the permissionless-floor/curated-visibility split.
- [x] **Bootstrapping defaults only:** no new defaults; writes use the configured/overridable relay. `funding_type:'crowdfunding'` is a product choice, not a privilege.
- [x] **nsec / signing:** the user's signer signs with an explicit prompt; no key exposed or logged.
- [x] **User signaling:** publish is an explicit submit; success/error surfaced via toast; failures don't half-create (goal/arbiter aren't part of this flow).
- [x] **Fork test:** anyone runs their own instance, logs in with any key, posts to their own relay identically.

## Findings

### Blocking
None.

### Non-blocking
1. **`src/components/grantless/CreateProjectForm.tsx:58`** — `amount: '' as unknown as number` in `defaultValues` is a small typing workaround for the empty initial numeric field (zod coerces on submit). Works and type-checks; could be tidied with a string field + coercion if desired. Non-blocking.
2. **Two 33401 construction paths** now exist (the new `buildTaskProposalTemplate` and the legacy `TaskProposalForm`'s inline tags). Flagged in ADR 0005; a later cleanup can refactor the legacy form onto the builder.
3. **`amount` as a sats string** follows the existing 33401 convention; if a future story needs numeric handling, normalize at the builder boundary.

## Verdict
**PASS** — the diff matches the story, ADR 0005, and the test plan; all four quality gates are clean and all four e2e suites pass. The built 33401 is proven (unit + real-event) to be parser-compatible, patron-authored, and free of arbiter/goal (honoring the Stories 6–7 boundary); posting is permissionless with explicit signing and no privileged actor. The form UI is left for the user's visual check against the dev seed (log in as Alice, post, see it under Alice). Mergeable as-is.
