# Test Plan: Story 6 — Assign an arbiter (curator-vouched)

**Story:** `.pi/engineering-team/stories/6-assent-to-arbitrate.md`
**ADR:** `.pi/engineering-team/decisions/0006-assent-to-arbitrate.md`
**Date:** 2026-06-03

## Approach

The protocol layer is mostly reuse (Story 4's slug-parameterized resolver, Story 5's builder). The genuinely new, risky logic is pure: (a) **`taskProposalToInput`** — the re-publish primitive that must preserve a task's fields while one is changed; (b) **`selectArbiterCandidates`** — list-member ∩ 33400-announcement. Both get thorough unit tests, plus a real-event e2e that performs the actual assignment against a live relay.

1. **Unit (`npm test`, no relay):**
   - `src/lib/catallax.taskProposalToInput.test.ts` — round-trips a parsed task through `input → build → parse` (fields preserved), and proves assigning an arbiter to a proposed task adds the arbiter `p[1]` + `a` coord while keeping `status:'proposed'`.
   - `src/lib/grantless.arbiter.test.ts` — `selectArbiterCandidates` (member ∩ announcement, member order, latest-per-member, drop members without a 33400, ignore non-members, `serviceCoord` shape) and `resolveCuratorApplicants(.., GRANTLESS_ARBITER_SLUG)` resolving the arbiter list distinctly from applicants.
2. **Real-event e2e (`npm run test:e2e`):** `test/e2e/assign-arbiter.e2e.test.ts` — publish a curator `grantless-arbiter` list + two arbiters' 33400s + a patron's proposed task; resolve the arbiter list (signer-independent); build + publish the assignment **patron-signed**; assert the latest task carries the arbiter `p[1]` + `a` coord and stays `proposed`; re-assign to the other arbiter and assert latest-wins.

The **UI** (patron-only assign control, arbiter surfacing incl. arbiter==patron note, curator-scoped options, signer prompt, toast) is verified **manually in the browser against the dev seed** — no mocked-`useNostr`/component tests (house rule), Playwright deferred (Story 2.5), as in prior stories.

Both suites fail RED until `taskProposalToInput` (catallax.ts), `GRANTLESS_ARBITER_SLUG` + `selectArbiterCandidates` + `ArbiterCandidate` (grantless.ts) exist.

## Coverage map

| Criterion (AC) | Test | File | Level |
|---|---|---|---|
| Options = curator's grantless-arbiter list ∩ has-33400 | `selectArbiterCandidates` (member ∩ announcement, drop no-33400); "resolves the grantless-arbiter list…" | `grantless.arbiter.test.ts` / e2e | unit + e2e |
| Resolve by observer/source-tag, not signer | e2e "signer-independent" (TA resolves nothing) | `assign-arbiter.e2e.test.ts` | e2e |
| Assigning updates the task (p[1] arbiter, a coord, status proposed, fields preserved) | "assigns an arbiter to a proposed task without changing status"; e2e "assigns an arbiter by re-publishing…" | unit + e2e | both |
| Re-assignable, latest wins | e2e "re-assigns to a different arbiter, latest version winning" | e2e | e2e |
| Re-publish preserves fields | `taskProposalToInput` round-trip | unit | unit |
| Only the patron can assign | `AssignArbiterControl` gates on `user.pubkey === patronPubkey`; authorized-updater (patron-signed) — e2e publishes patron-signed | — / e2e | manual + e2e |
| Arbiter surfaced (incl. arbiter==patron note) | `NomineeProjectItem` arbiter line | — | manual (browser) |
| No privileged actor (openness) | signer-independent resolve; arbitrary keys; curator only filters | unit + e2e | both |

## Edge cases

- **Member without a 33400** → not offerable (unit).
- **Member with several 33400s** → latest chosen (unit).
- **Signer ≠ observer** → arbiter list resolves under the curator, not the TA (e2e).
- **Re-assignment** → replaceable latest-wins on the relay (e2e).
- **Arbiter == patron** → surfaced with a note (manual); not forbidden (house rule).
- **Openness** → arbitrary keys; the curator's list only filters options; configured relay.

## Test infrastructure

- Unit: Vitest; constructs `TaskProposal`/`ArbiterAnnouncement` fixtures; reuses `buildTaskProposalTemplate`/`parseTaskProposal`.
- E2E: Vitest + local strfry (Docker) + `nak`, reusing `test/e2e/harness.ts` (`publish`, `query`, `publishCurationList`, `publishArbiter`), driving `@/lib/catallax` + `@/lib/grantless`.

## How to run

```
npm test           # unit gate, incl. the arbiter + taskProposalToInput tests
npm run test:e2e   # the assign-arbiter e2e (+ other suites)
```

## Verification

RED confirmed on 2026-06-03 before implementation: the suites import `taskProposalToInput`, `GRANTLESS_ARBITER_SLUG`, `selectArbiterCandidates`, `ArbiterCandidate`, which do not exist yet. Goes GREEN once Implementation adds them (and wires `useCuratorArbiterCandidates` + `AssignArbiterControl` + the `NomineeProjectItem` arbiter line, verified manually).
