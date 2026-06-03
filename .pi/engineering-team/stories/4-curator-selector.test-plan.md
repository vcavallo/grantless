# Test Plan: Story 4 — Curator selector + real applicant view

**Story:** `.pi/engineering-team/stories/4-curator-selector.md`
**ADR:** `.pi/engineering-team/decisions/0004-curator-selector.md`
**Date:** 2026-06-03

## Approach

The risky, protocol-facing part of this feature is the **curation resolver** (filter 30392s by `observer`/`source-tag`, latest-wins, signer-independent). That is covered two ways, per the project's testing philosophy (no mocked-`useNostr` tests; real events for anything touching the relay):

1. **Unit (`npm test`, no relay):** `src/lib/grantless.curation.test.ts` exercises the pure resolver functions against constructed 30392 event arrays — parsing, slug filtering, discovery, latest-wins (incl. out-of-order `created_at`), per-curator isolation, **signer ≠ observer**, dedup/order, and configured-curator decoding.
2. **Real-event e2e (`npm run test:e2e`):** `test/e2e/curator-resolution.e2e.test.ts` publishes real `grantless-applicants` lists (signed by list agents, not curators) plus an arbiter list to a live local strfry, then runs the **app resolver** (`@/lib/grantless`) over the events the relay returns — proving discovery + resolution + latest-wins + arbiter-exclusion + signer-independence end to end.

The curator-selection **UI** (picker, remembered curator, empty/error states, rendering applicants via the Story-1 card) is verified **manually in the browser against the dev seed** — consistent with Stories 1 and 3 and the deferral of browser-level Playwright (Story 2.5). Component tests are intentionally avoided because `TestApp` wires a real relay and the house rules forbid mocked-`useNostr` tests.

Both suites fail RED until Implementation adds the resolver to `src/lib/grantless.ts`.

## Coverage map

| Criterion (AC) | Test | File | Level |
|---|---|---|---|
| Curators discoverable + selectable | "discovers the distinct curators…" | `test/e2e/curator-resolution.e2e.test.ts` | e2e |
| | `distinctCurators` returns distinct observers | `src/lib/grantless.curation.test.ts` | unit |
| Selecting a curator resolves their applicants (observer/source-tag, p-order, not by signer) | "resolves each curator to its own applicants…", "resolves by observer, never by the signer" | e2e | e2e |
| | `parseCurationList`, `applicantsForCurator`/`resolveCuratorApplicants`, dedup/order, signer-independence | unit | unit |
| Applicants render via Story-1 engine (profile + projects + "No projects yet") | reuse of `NomineeCard`/`NomineeProjectItem`/`useTaskProposals` | — | manual (browser) |
| Replaceable-list correctness (latest wins) | "…latest list winning" (e2e); "even out of created_at order" (unit) | e2e + unit | both |
| Remembers the last curator | `useLocalStorage('grantless:lastCurator')` | — | manual (browser) |
| Empty / error states | no-curators / no-applicants / error cards + `RelaySelector` | — | manual (browser) |
| No privileged source (openness) | "resolves each curator to its own…" (two curators, distinct worlds), "resolves by observer, never by the signer", `parseConfiguredCurators` (overridable, empty default) | e2e + unit | both |
| Configured-curator override | `parseConfiguredCurators` (npub + hex + junk; empty default) | unit | unit |

## Edge cases

- **Out-of-order `created_at`** among a curator's lists → newest still wins (unit).
- **Two list agents, same observer** → both events persist on the relay; resolver picks the latest (e2e).
- **Arbiter-slug list present** → excluded from the applicant view; its member never surfaces as an applicant (e2e + unit).
- **Signer ≠ observer** → a TA-signed list resolves under the curator, not the TA (unit + e2e).
- **Openness:** two curators yield two independent applicant sets; the configured-curator source is empty by default and overridable; reads use the configured/overridable relay set.

## Test infrastructure

- Unit: Vitest (`npm test`), constructed `NostrEvent` literals + `nostr-tools` for npub encoding. No relay.
- E2E: Vitest + local strfry (Docker) + `nak` (`npm run test:e2e`), reusing `test/e2e/relay.ts` + `test/e2e/harness.ts` (`publishCurationList`, `query`), driving `@/lib/grantless`.

## How to run

```
npm test           # unit gate, incl. the curation resolver unit tests
npm run test:e2e   # the curator-resolution e2e (+ happy-path + seed suites)
```

## Verification

RED confirmed on 2026-06-03 before implementation:
- Unit: `src/lib/grantless.curation.test.ts` fails to resolve the new exports (`parseCurationList`, `applicantCurationLists`, `distinctCurators`, `applicantsForCurator`, `resolveCuratorApplicants`, `parseConfiguredCurators`, `GRANTLESS_APPLICANTS_SLUG`) — feature not implemented. (Also surfaces as a `tsc` "no exported member" error, same cause.)
- E2E: `test/e2e/curator-resolution.e2e.test.ts` fails to resolve the same imports at collection.
Goes GREEN once Implementation adds those functions to `src/lib/grantless.ts` (and wires `CuratorBrowser`/`NomineeGrid`/`useApplicantCurationLists`, verified manually in the browser).
