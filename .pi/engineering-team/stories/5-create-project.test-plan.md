# Test Plan: Story 5 — Create a project

**Story:** `.pi/engineering-team/stories/5-create-project.md`
**ADR:** `.pi/engineering-team/decisions/0005-create-project.md`
**Date:** 2026-06-03

## Approach

The risky part of a write flow is the **event shape** — getting the 33401 tags/content right so it parses, surfaces, and isn't accidentally arbiter-bound or goal-bound. That's a pure function (`buildTaskProposalTemplate`), so it's covered two ways:

1. **Unit (`npm test`, no relay):** `src/lib/catallax.buildTaskProposal.test.ts` asserts the built template's kind/content/tags for the Grantless case (proposed, crowdfunding, no arbiter, no goal), optional fields/defaults, and the with-arbiter/worker/goal ordering for later stories — and **round-trips every case through `parseTaskProposal`** so builder and parser are proven to agree.
2. **Real-event e2e (`npm run test:e2e`):** `test/e2e/create-project.e2e.test.ts` builds a proposal with the app builder, publishes it **signed by the grantee** to a live local strfry, reads it back, and runs `parseTaskProposal` + `resolveCuratorApplicants` over the real events — proving it's valid on a real relay, parser-compatible, authored by the patron (passes the authorized-updater check), arbiter/goal-free, and would render under the grantee in the curator browse.

The **form UI** (login gating, validation messages, signer prompt, success/error toasts, dialog) is verified **manually in the browser against the dev seed** — no mocked-`useNostr`/component tests (house rule; `TestApp` wires a real relay), Playwright still deferred (Story 2.5), consistent with Stories 1, 3, 4.

Both suites fail RED until `buildTaskProposalTemplate` exists in `src/lib/catallax.ts`.

## Coverage map

| Criterion (AC) | Test | File | Level |
|---|---|---|---|
| Creates a valid proposal (kind/d/patron/amount/status/funding_type/t/content) | "is a kind-33401…", "puts title/… in JSON content", "carries the required tags…" | `catallax.buildTaskProposal.test.ts` | unit |
| | "publishes a parseable proposed/crowdfunding 33401 authored by the grantee" | `create-project.e2e.test.ts` | e2e |
| No arbiter / no goal at creation | "carries no arbiter p/a tag and no goal", round-trip | unit | unit |
| | "creates no arbiter and no goal at proposal time" | e2e | e2e |
| Surfaces under the grantee (t:catallax, patron-signed, parseable, in curator list) | "is authored by the patron…", "would render under the grantee…" | e2e | e2e |
| Builder agrees with parser (and later-story ordering) | round-trip assertions; "orders p tags patron, arbiter, worker…" | unit | unit |
| Login-gated; validation; signer prompt; success/error feedback | dialog + RHF/zod + `useNostrPublish` + `useToast` | — | manual (browser) |
| No privileged actor (openness) | event authored by the grantee's own key; no relay/arbiter special-cased; harness uses arbitrary keys | unit + e2e | both |

## Edge cases

- **Defaults:** omitting `status`/`fundingType` → `proposed`/`single` (unit). Grantless always passes `crowdfunding`.
- **Optional fields:** deadline in content; details URL `r` tag; categories as extra `t` tags (unit).
- **Positional p tags:** with arbiter+worker present, order is patron, arbiter, worker, with `a`/`goal` — locked so Stories 6–8 extend the builder safely (unit).
- **Authorized-updater:** the proposal is signed by the patron, so `useTaskProposals` accepts it (e2e asserts `event.pubkey === patronPubkey`).
- **Openness:** the harness mints arbitrary keys; nothing special-cased; visibility still curator-gated (resolve test).

## Test infrastructure

- Unit: Vitest (`npm test`); constructs `NostrEvent` literals; reuses the existing `parseTaskProposal`.
- E2E: Vitest + local strfry (Docker) + `nak` (`npm run test:e2e`), reusing `test/e2e/relay.ts` + `test/e2e/harness.ts` (`publish`, `query`, `publishCurationList`), driving `@/lib/catallax` + `@/lib/grantless`.

## How to run

```
npm test           # unit gate, incl. the builder tests
npm run test:e2e   # the create-project e2e (+ the other suites)
```

## Verification

RED confirmed on 2026-06-03 before implementation: both suites import `buildTaskProposalTemplate` from `@/lib/catallax`, which does not exist yet (feature not implemented). Goes GREEN once Implementation adds the builder (and wires `CreateProjectForm`/`CreateProjectDialog` into `GrantlessBrowse`, verified manually).
