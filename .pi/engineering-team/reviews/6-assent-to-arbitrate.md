# Review: Story 6 — Assign an arbiter (curator-vouched)

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-03
**Diff:** `git diff 31bb925..HEAD` (15 files, +744/-18)

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean).
- [x] `npx eslint` — **PASS** (exit 0; 0 errors, the 2 pre-existing `*Filters.tsx` warnings only).
- [x] `npx vitest run` (unit gate) — **PASS** (9 files, 44 tests; +7 new).
- [x] `npx vite build` — **PASS** (~2.5s).
- [x] `npm run test:e2e` — **PASS** (5 files, 25 tests: happy-path 5 + seed 9 + curator 4 + create-project 4 + assign-arbiter 3).

## Spec adherence

| AC | Evidence | Verdict |
|---|---|---|
| Options = curator's grantless-arbiter list ∩ has-33400, resolved by observer/source-tag (not signer) | unit `selectArbiterCandidates` (4 cases) + `resolveCuratorApplicants(.., GRANTLESS_ARBITER_SLUG)`; e2e "resolves the curator's grantless-arbiter list (signer-independent)" | ✅ |
| Assigning updates the task (p[1] arbiter, a coord, status stays proposed, fields preserved) | unit "assigns an arbiter to a proposed task without changing status" + round-trip; e2e "assigns an arbiter by re-publishing the patron-signed task" | ✅ |
| Only the patron can assign | `NomineeProjectItem` renders the control only when `user.pubkey === patronPubkey`; `AssignArbiterControl` self-gates too; authorized-updater enforced (patron-signed) | ✅ (manual UI; e2e publishes patron-signed) |
| Arbiter surfaced (incl. proposer==arbiter) | `NomineeProjectItem` `ArbiterLine` (useAuthor + fallback; amber note when arbiter==patron) | ✅ manual |
| Re-assignable, latest wins | e2e "re-assigns to a different arbiter, latest version winning" | ✅ |
| No privileged actor (openness) | signer-independent resolve; arbitrary keys; curator only filters options | ✅ |

Protocol-facing logic is covered by unit + real-event e2e; the UI surfacing/gating is the scoped manual step (dev seed), consistent with prior stories.

## ADR adherence

- Files match ADR 0006: pure `taskProposalToInput` (catallax.ts) + `selectArbiterCandidates`/`GRANTLESS_ARBITER_SLUG`/`ArbiterCandidate` (grantless.ts); `useCuratorArbiterCandidates`; `AssignArbiterControl`; restructured `NomineeProjectItem`; `curatorPubkey` threaded through grid/card/browser.
- Reuse honored: the slug-parameterized resolver (Story 4) and `buildTaskProposalTemplate` (Story 5) do the protocol work; no tag logic duplicated.
- **No new event kinds; `NIP.md` unchanged** — assent stays out-of-band (NIP.md:22), surfaced not enforced (Option C rejected as planned). No new dependencies.
- `taskProposalToInput` is the reusable re-publish primitive for Stories 8–10, as designed.

## Things tests can't catch

- **No assent kind invented** — the central protocol decision. Confirmed: the diff adds no kind and doesn't touch `NIP.md`; "assent" is the patron re-publishing with the arbiter (NIP-faithful) plus UI surfacing. Flagged in the story for the user's veto.
- **Resolve by observer, never signer** — e2e asserts the TA (signer) resolves no arbiters; `selectArbiterCandidates` keys on `arbiterPubkey`. Prime-directive-critical, covered.
- **Patron-only mutation** — the control is gated twice (mount-site `isPatron` in `NomineeProjectItem` *and* the early return in `AssignArbiterControl`), and the relay-side authorized-updater rule backstops it.
- **Status preserved** — assigning keeps `proposed` (unit + e2e); doesn't accidentally advance the lifecycle.
- No secrets / debug logging / placeholder comments in the diff; the signer is the only key-touching path (no nsec exposure).

## House rules check

- [x] **Open / permissionless / WoT:** arbiter is the patron's choice; curator list only filters; resolution observer/source-tag; nothing special-cased.
- [x] **Surface, don't hide, trust-relevant relationships:** arbiter shown to all; proposer==arbiter called out — exactly the house rule.
- [x] **Bootstrapping defaults only:** no new defaults; configured/overridable relay; slug is not a privilege.
- [x] **nsec / signing:** the patron signs their own task update via the signer; no key exposed.
- [x] **Fork test:** point at another curator/relay → that curator's arbiter options resolve identically.

## Findings

### Blocking
None.

### Non-blocking
1. **`src/hooks/useCuratorArbiterCandidates.ts:30`** — a second `{kinds:[30392], limit:500}` query alongside Story 4's applicants hook. React Query dedupes by `queryKey`, and the candidates control is only mounted for patron-owned items, so the real cost is one shared fetch; still, the applicants + arbiter 30392 queries could later share a single fetch (flagged in ADR 0006, deferred).
2. **30392 over-fetch with `limit`** (no indexed `observer`) — same known item as Stories 4/6; `#d` fast-path deferred.
3. **No explicit in-app arbiter assent** — by design (NIP.md:22). If the user wants the arbiter to actively confirm in-app, that's a separate story + a NIP change. Surfaced for veto.

## Verdict
**PASS** — the diff matches the story, ADR 0006, and the test plan; all four quality gates are clean and all five e2e suites pass. The patron assigns a curator-vouched arbiter via a NIP-faithful re-publish (no invented assent kind), trust resolves by `observer`/`source-tag` (never the signer), mutation is patron-gated, and the arbiter relationship is surfaced (incl. proposer==arbiter). The protocol decision to keep assent out-of-band is flagged for the user's veto. Mergeable as-is.
