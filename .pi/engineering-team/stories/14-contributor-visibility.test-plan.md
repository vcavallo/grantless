# Test Plan: Story 14 — Contributor visibility + honest profile loading

**Story:** `.pi/engineering-team/stories/14-contributor-visibility.md`
**ADR:** `.pi/engineering-team/decisions/0013-contributor-visibility.md`
**Date:** 2026-06-05

## Coverage map

| Criterion | Test | File | Level |
|---|---|---|---|
| A: contributors aggregated per sender, ranked | `aggregateContributors` sums/ranks | `src/lib/grantless.contributors.test.ts` | unit |
| A: project crowdfund shows avatars + expands to name/amount/copy-npub | `a project's crowdfund shows contributors and expands…` | `test/browser/contributors.spec.ts` | e2e (real relay) |
| C: curator-wide page ranks contributors | `aggregateContributors` (logic) + `the curator-wide contributors page lists ranked contributors` | unit + e2e | unit + e2e |
| C: shareable URL + reachable from browse | `the curator browse links to the contributors page` | `test/browser/contributors.spec.ts` | e2e |
| C: empty state | (inspection — no contributions in a fresh curator world; not seeded) | — | inspection |
| B: honest profile loading (no fake name while loading) | inspection / the resolved-without-name branch is covered by behavior, not a flaky timing test | — | inspection |
| Openness: ranking mechanical, no pubkey privileged | `does not privilege any pubkey…` | `src/lib/grantless.contributors.test.ts` | unit |

## Edge cases

- [x] **Cross-goal summation** — a contributor appearing in multiple goals is summed once.
- [x] **Ranking** — highest total first; the seeded funders fund every funded goal, so they aggregate.
- [x] **Empty** — no goals, and goals with no contributors, yield `[]`.
- [x] **No privilege** — equal totals still all appear; ranking is mechanical (sats only).
- [ ] **Profile-loading honesty (Group B)** — not asserted via e2e: it's a timing/visual concern and a
      deterministic test would be flaky. Verified by inspection (skeleton while `useAuthor` is loading;
      `genUserName` only after resolution with no kind-0 name) and implicitly by the `AuthorName`
      resolved-state rendering in the e2e (the seeded funders show their **real** names, not
      `genUserName`).

## Required handles for the Implementer (so the e2e passes)

- The project crowdfund contributors area exposes a **button matching `/contributor/i`** that, when
  clicked, **expands** to show each contributor's name, amount, and a copy control
  (`CopyNpubButton` renders a button matching `/copy/i`).
- A **route `/c/:npub/contributors`** rendering ranked contributors (name + total + copy control),
  for the seeded curator showing the seeded funders.
- A **link matching `/contributors/i`** in the curator browse (visible once a curator is selected)
  that navigates to that route.

## Test infrastructure

- **Unit:** Vitest — pure `aggregateContributors` over fabricated `GoalProgress[]`. No relay, no mocks.
- **E2E:** Playwright vs the seeded local strfry. The seed funds goals with mock 9735s whose
  `description` embeds the funder pubkey, so `parseZapReceiptSender` attributes the seeded funders —
  the same path real zaps use, so this exercises the real attribution.

## How to run

```
npx vitest run src/lib/grantless.contributors.test.ts
npx playwright test test/browser/contributors.spec.ts   # needs chromium
npm test
```

## Verification (pre-implementation)

Confirmed failing 2026-06-05:

- **Unit** — 4 tests run and fail for the right reason (`aggregateContributors` not yet exported →
  not a function):

```
FAIL src/lib/grantless.contributors.test.ts (4 tests) — aggregateContributors is not a function
```

- **E2E** — collects cleanly (`playwright test --list` lists 3 specs, no syntax/import errors).
  Execution is blocked **in this sandbox only** (no chromium libs); run with a working chromium.
  Necessarily fails pre-implementation: there is no contributor expander, no `/c/:npub/contributors`
  route, and no "Contributors" link yet.

```
[chromium] › contributors.spec.ts › a project's crowdfund shows contributors and expands…
[chromium] › contributors.spec.ts › the curator-wide contributors page lists ranked contributors
[chromium] › contributors.spec.ts › the curator browse links to the contributors page
```
