# Test Plan: Story 16 — Operator helper panel (stuck-project diagnostics)

**Story:** `.pi/engineering-team/stories/16-operator-helper-panel.md`
**ADR:** `.pi/engineering-team/decisions/0015-operator-helper-panel.md`
**Date:** 2026-06-07

## Strategy

Outside-in. The feature is two pure predicates over data the app already fetches, plus a
client-side convenience gate and a page. So:

- **Runnable red (unit, Vitest):** the pure logic — `parseOperatorPubkeys`,
  `vouchedApplicantPubkeys`, `findStuckProjects`. These run under `npm test`, are high-value, and I
  confirm them failing here. They also carry the openness assertions (npub≡hex, no pubkey
  special-cased, ENV-derived operator).
- **Outer ring (e2e, Playwright):** the gating + UI acceptance criteria (operator-only nav link,
  `/admin` access, the two rendered lists over **real seeded events**, read-only, NotFound for
  others). Per house rules we do **not** write mocked-`useNostr` component tests; the UI is exercised
  with real events in a real browser via `npm run test:browser`. As noted on prior stories, the
  bundled Chromium can't launch in this NixOS dev env, so this spec is the authoritative red for the
  Implementer/CI/manual run, not executed in this session.

## Coverage map

| Criterion (story AC) | Test name | Test file | Level |
|---|---|---|---|
| Gating — match (operator sees panel) | `operator sees the Admin link and can open the panel` | `test/browser/operator-panel.spec.ts` | e2e |
| Gating — non-match (logged-in non-operator) | `a logged-in non-operator sees no Admin link and /admin is NotFound` | `test/browser/operator-panel.spec.ts` | e2e |
| Gating — logged out | `a logged-out visitor sees no Admin link and /admin is NotFound` | `test/browser/operator-panel.spec.ts` | e2e |
| Gating — unset ENV | (asserted via `parseOperatorPubkeys('')→[]` ⇒ no operator) + documented e2e note | `src/lib/grantless.operator.test.ts` | unit |
| "Not under any curator" list | `lists a project whose creator is in no curator applicant set; not one who is` | `src/lib/grantless.stuck.test.ts` + `the seeded unvouched project appears under "not vouched"` | unit + e2e |
| "No arbiter assigned" list | `lists a project with no arbiter; not one that has an arbiter` | `src/lib/grantless.stuck.test.ts` + `the seeded arbiter-less project appears under "no arbiter"` | unit + e2e |
| Both conditions surfaced | `a project that is unvouched AND arbiter-less appears in both buckets` | `src/lib/grantless.stuck.test.ts` | unit |
| Exclude concluded | `excludes concluded projects from both buckets` | `src/lib/grantless.stuck.test.ts` | unit |
| Actionable rows (title/status/reason/identity/link) | `each stuck row shows title, status, reason, creator identity and a task link` | `test/browser/operator-panel.spec.ts` | e2e |
| Read-only / no privilege | `the panel exposes no publish/edit/delete controls` | `test/browser/operator-panel.spec.ts` | e2e |
| Empty state | `returns empty buckets when nothing is stuck` | `src/lib/grantless.stuck.test.ts` | unit |

## Edge cases
- [ ] `parseOperatorPubkeys`: undefined / empty / whitespace-only → `[]`.
- [ ] `parseOperatorPubkeys`: comma-separated mix of npub + hex, dedup, invalid tokens dropped, hex lowercased.
- [ ] `vouchedApplicantPubkeys`: union across multiple lists with overlap; empty lists → empty set.
- [ ] `findStuckProjects`: a vouched creator with no arbiter is in `arbiterless` only (not `unvouched`).
- [ ] `findStuckProjects`: empty task list → `{ unvouched: [], arbiterless: [] }`.
- [ ] **Openness / permissionlessness:**
  - `parseOperatorPubkeys` returns the **same** result for a key's `npub…` and `64-hex` forms — no form is privileged, and *any* key can be the operator (no built-in identity).
  - `findStuckProjects` treats all pubkeys uniformly: with `vouched={A}` key `B` is unvouched; with `vouched={B}` the same call leaves `B` vouched — membership only, no special-casing.
  - e2e fork test: operator-ness comes purely from `VITE_GRANTLESS_OPERATOR` matching the logged-in pubkey; an ordinary seeded account stands in as operator, proving no privileged identity is baked in.

## Test infrastructure
- **Unit:** Vitest. Pure functions, no relay, no mocks. In-file factories build `TaskProposal` / `CurationList` fixtures.
- **E2E:** Playwright (`npm run test:browser`) against the seeded local strfry. Requires, from the Implementer (test-infra):
  1. **Seed fixtures** (`test/seed/`): at least one **unvouched** non-concluded crowdfunding project
     (authored by a roster pubkey that is in *no* `grantless-applicants` list — e.g. Carol the worker)
     and at least one **arbiter-less** non-concluded project (a `proposed` task with no arbiter).
  2. **Operator env:** the Playwright `webServer` command sets `VITE_GRANTLESS_OPERATOR` to a seeded
     account's npub (e.g. `ROSTER.funders[0]` / Frank) so the spec can log in as the operator. This
     does not affect other specs (they don't log in as that account).
- **Mocks / fakes:** none (house rule: no mocked-`useNostr`).
- **Fixtures:** seed roster `test/seed/accounts.ts`; helpers `test/browser/helpers.ts`.

## How to run
```
npm test                      # tsc + eslint + vitest (unit reds run here) + build
npm run test:browser          # Playwright e2e (needs a launchable Chromium + the seed)
```

## Verification
The new tests fail with the current code (functions/route/panel not implemented). Confirmed on
2026-06-07 — see the failure output captured in the handoff message (unit reds fail because
`parseOperatorPubkeys` / `vouchedApplicantPubkeys` / `findStuckProjects` are not yet exported, and
`npm test` fails at the `tsc` step for the same missing exports; the Playwright spec is the outer
red for `/admin`, not run in this env).
