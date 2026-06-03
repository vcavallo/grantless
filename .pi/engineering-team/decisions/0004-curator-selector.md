# ADR 0004: Curator selector — app-side curation resolver + reuse the Story-1 engine

**Status:** Accepted
**Date:** 2026-06-03
**Story:** `.pi/engineering-team/stories/4-curator-selector.md`

## Context

Story 4 replaces Story 1's pasted-`naddr` demo with a real curator-driven browse: discover the available curators, pick one, resolve **that curator's** `grantless-applicants` trusted list (kind 30392) through the `observer` + `source-tag` chain, and render the resolved applicants with Story 1's engine. First TDD'd product feature; builds on Stories 1–3.

**Acceptance criteria (quoted to anchor the design):** curators discoverable + selectable from a plain overridable source (no privileged curator); selecting `C` resolves 30392s where `observer == C` and the `source-tag` slug is `grantless-applicants`, latest by `created_at`, members in `p`-tag order, **without filtering by signer**; applicants render via the Story-1 card (profile + projects + "No projects yet"); replaceable-list latest-wins; remembers the last curator; empty/error states with `RelaySelector`; openness (two curators → two worlds, nothing special-cased, overridable relay/curator source).

**Existing assets (verified):**
- `src/lib/grantless.ts` — pure parsing seam: `extractNomineePubkeys()` (dedup, `p`-tag order), `groupTasksByPatron()`, `decodeNomineeListNaddr()`. The right home for the new resolver. No curator/`observer`/`source-tag` logic exists in `src/` yet (only in the test harness `test/e2e/harness.ts` `resolveCuration`/`publishCurationList`).
- Story-1 engine: `NomineeCard.tsx` (profile + projects + "No projects yet"), `NomineeProjectItem.tsx`, `useNomineeProfiles(pubkeys, relays)` (batch kind-0), `useTaskProposals()` (all catallax 33401, latest per `patron:d` with the authorized-updater rule) + `groupTasksByPatron`. All reusable unchanged.
- `useNomineeList.ts` / `NomineeBrowser.tsx` — the pasted-naddr path; the `useQuery` + status-enum + relay-hint shape is the pattern to mirror for the new hook.
- `getActiveRelays(config, presetRelays)` (`src/lib/relays.ts`), `useAppContext()`, `useLocalStorage()`, shadcn `Select` (`components/ui/select.tsx`), `RelaySelector`.
- Story 3 seed: curator **Cleo** publishes a `grantless-applicants` list (members Alice, Bob) on the local relay — exactly what discovery + resolution will read in dev.

**Constraints (`.pi/AGENTS.md`, prior ADRs):**
- **Prime directive:** no privileged curator/relay; trust resolves through `observer`/`source-tag`, never by trusting the signer (the list is TA-signed). Any default curator set must be empty-or-overridable.
- **Relay indexing:** only `d` and `p` are single-letter/indexed on 30392; `observer`/`source-tag` are **not**, so resolution = fetch 30392s and filter client-side (epic). An exact `#d` fast-path is a deferred optimization.
- **Testing philosophy:** no mocked-`useNostr` component tests (`TestApp` wires a real relay); pure helpers get plain unit tests; anything touching the relay/query path is exercised with **real events** (nak + local strfry). Browser-level Playwright is still the deferred Story 2.5.
- Keep the lib-parse → hook-query → component-render seam (ADR 0001).

## Options considered

### Option A — Pure resolver in `lib/grantless.ts` + one 30392 query feeding both discovery and resolution; reuse the Story-1 card via a small shared grid *(chosen)*
Add pure functions to `lib/grantless.ts` (`parseCurationList`, `applicantCurationLists`, `distinctCurators`, `applicantsForCurator`, `resolveCuratorApplicants`, `parseConfiguredCurators`). One hook `useApplicantCurationLists()` runs a single `{kinds:[30392], limit}` query and returns the parsed applicant lists; the component derives the curator set (discovered ∪ configurable default) and the selected curator's applicants from those lists with the pure functions, then renders through a new presentational `NomineeGrid` wrapping the existing `NomineeCard`. New `CuratorBrowser.tsx` replaces `NomineeBrowser` on the `/` page.
- **Pros:** one relay round-trip feeds both the picker and the applicant view (CLAUDE.md "combine queries"); all trust logic is pure and unit-testable without React; the real query+resolve path is e2e-testable against the local relay; reuses the Story-1 card verbatim; honors the lib/hook/component seam and the prime directive (default curator set is empty/overridable, resolution ignores the signer).
- **Cons:** `{kinds:[30392]}` with no indexed observer filter over-fetches on a large prod relay (mitigated by `limit`; `#d` fast-path deferred). Adds a small amount of grid markup (extracted, not duplicated).

### Option B — Resolve via an exact `#d` fast-path (`tl-pin-{observer8}-{tagAuthor8}-{slug}`)
Query by the indexed `d` tag instead of client-side `observer`/`source-tag` filtering.
- **Pros:** relay-indexed, efficient.
- **Cons:** the `d` encodes the **tagAuthor** (TA) 8-hex prefix, which a viewer doesn't know a priori — and for *discovery* (which curators exist?) there's no `d` to query by at all. The `observer`/`source-tag` filter is the source of truth (epic). **Rejected as the primary path**; kept as a noted future optimization once a curator+TA pairing is known.

### Option C — Reuse `NomineeBrowser` by feeding it a curator-resolved pubkey list (parameterize the existing component)
Generalize `NomineeBrowser`/`useNomineeList` to accept either a pasted naddr or a curator selection.
- **Pros:** less new UI code.
- **Cons:** entangles two input modes in one component and forces edits to Story-1 code (which has no tests guarding it), raising regression risk for little gain. **Rejected** — build `CuratorBrowser` alongside, reuse only the stable leaf (`NomineeCard`) via `NomineeGrid`, and leave Story-1's files untouched (the pasted-naddr path is simply no longer mounted).

## Decision

**Option A.** Pure resolver in `lib/grantless.ts`, a single `useApplicantCurationLists()` query feeding both discovery and per-curator resolution, and a new `CuratorBrowser` that reuses the Story-1 `NomineeCard` through a small shared `NomineeGrid`. Curator set = discovered observers ∪ a configurable, **empty-by-default** `VITE_GRANTLESS_CURATORS`. Resolution filters by `observer`/`source-tag`, never by signer.

## Consequences

- **Enables** the real browse experience and unblocks Stories 5–11, which all assume a curator-scoped applicant view.
- **No new event kinds; `NIP.md` unchanged.** Read-only feature; reuses 30392 exactly as Story 2/3 produce it.
- **One app-code config touch beyond components:** `VITE_GRANTLESS_CURATORS` (empty default → behavior driven purely by discovery; overridable for forkers). Documented in `.env.example`.
- **`/` now mounts `CuratorBrowser`.** `NomineeBrowser`/`useNomineeList` (the pasted-naddr path) become unmounted but are **left in place** (like `Index.tsx` after ADR 0001) — removable in a later cleanup; not deleted here to keep the diff focused and avoid touching untested Story-1 code.
- **Inherits** `useTaskProposals` over-fetch (all catallax tasks; ADR 0001) — kept for correctness (an `authors`-scoped query would miss task versions whose latest replaceable revision was signed by a non-applicant arbiter/worker). Flagged as a future optimization when applicant sets are large.
- **Over-fetch of 30392s** under no indexed `observer` filter — bounded by `limit`; `#d` fast-path deferred (Option B).
- Establishes the **app-side curation resolver** that Story 6 (arbiter selector) reuses by swapping the slug to `grantless-arbiter`.

## Implementation notes

- **`src/lib/grantless.ts`** (extend — pure, framework-free):
  - `export const GRANTLESS_APPLICANTS_SLUG = 'grantless-applicants';`
  - `export interface CurationList { observer: string; slug: string; members: string[]; createdAt: number; }`
  - `parseCurationList(event: NostrEvent): CurationList | null` — require `event.kind === 30392`, an `observer` tag value, and a `source-tag` tag with a slug at index 3; `members = extractNomineePubkeys(event)`; return `null` if `observer` or slug missing.
  - `applicantCurationLists(events: NostrEvent[], slug = GRANTLESS_APPLICANTS_SLUG): CurationList[]` — map `parseCurationList`, drop nulls, keep `list.slug === slug`.
  - `distinctCurators(lists: CurationList[]): string[]` — distinct `observer`s, first-seen order.
  - `applicantsForCurator(lists: CurationList[], curator: string): string[]` — among `lists` with `observer === curator`, take the **latest `createdAt`**, return its `members` (`[]` if none).
  - `resolveCuratorApplicants(events: NostrEvent[], curator: string, slug = GRANTLESS_APPLICANTS_SLUG): string[]` — `applicantsForCurator(applicantCurationLists(events, slug), curator)`. Convenience for the e2e/tests (full events→applicants path). **Never filters by `event.pubkey`.**
  - `parseConfiguredCurators(raw: string | undefined): string[]` — split on commas, trim, decode `npub…`→hex via `nip19`, accept 64-char hex as-is, drop anything invalid; deduped.
- **`src/hooks/useApplicantCurationLists.ts`** (new): mirror `useNomineeList`'s shape. `useNostr().nostr.query([{ kinds:[30392], limit: 500 }], { signal, relays: getActiveRelays(config, presetRelays) })`; return `{ lists: CurationList[]; status: 'loading'|'ready'|'empty'|'error'; relays }` where `lists = applicantCurationLists(events)`. `staleTime` modest; `retry:false`.
- **`src/components/grantless/NomineeGrid.tsx`** (new, presentational): props `{ pubkeys: string[]; tasksByPatron: Map<string, TaskProposal[]>; profiles?: Map<string, NostrMetadata> }`; renders the responsive grid of `NomineeCard` (extracted from `NomineeBrowser`'s ready-state markup so the per-applicant rendering is shared, not duplicated).
- **`src/components/grantless/CuratorBrowser.tsx`** (new, container):
  - `useApplicantCurationLists()` → `lists`, `status`, `relays`.
  - `curators = unique([...parseConfiguredCurators(import.meta.env.VITE_GRANTLESS_CURATORS), ...distinctCurators(lists)])`.
  - `useNomineeProfiles(curators, relays)` for curator display names in the `Select`; `useLocalStorage('grantless:lastCurator', '')` for the remembered selection (auto-applied on mount; cleared/replaced on change; only persisted when it's a real discovered/configured curator).
  - On a selected curator: `applicants = applicantsForCurator(lists, selected)`; `useTaskProposals()` + `useMemo(groupTasksByPatron)`; `useNomineeProfiles(applicants, relays)`; render `<NomineeGrid>`.
  - States: no curators → empty card + `RelaySelector`; selected curator with zero applicants → explicit empty card; lists `error` → non-crashing message + `RelaySelector`; loading → skeleton grid (reuse the skeleton block).
- **`src/pages/GrantlessBrowse.tsx`**: render `<CuratorBrowser />` instead of `<NomineeBrowser />` (drop the import).
- **`.env.example`**: document `VITE_GRANTLESS_CURATORS` (comma-separated npubs/hex; empty default = discovery only; overridable, no privileged status).

### Tests the Tester will write (anticipated)
- **Unit (`npm test`, no relay):** `src/lib/grantless.curation.test.ts` — `parseCurationList` (valid / missing observer / missing slug), `applicantCurationLists` (slug filter, drops arbiter lists), `distinctCurators`, `applicantsForCurator` + `resolveCuratorApplicants` (latest-wins incl. out-of-order `created_at`; only the selected curator; **resolves a TA-signed list, i.e. signer ≠ observer**; dedup/order), `parseConfiguredCurators` (npub + hex + junk).
- **Real-event e2e (`npm run test:e2e`):** `test/e2e/curator-resolution.e2e.test.ts` — publish two curators' `grantless-applicants` lists (TA-signed) + a republished newer version for one + an arbiter list (must be ignored); `query` the local relay and run the **app resolver** (`@/lib/grantless`) on the real events: assert `distinctCurators` contains both curators, each resolves to its own members, latest-wins holds, the arbiter-slug list is excluded, and resolution is signer-independent.
- **Manual (browser, dev seed):** curator picker shows Cleo, selecting renders Alice/Bob with their projects + "No projects yet"; last curator remembered on refresh; empty/error states. (UI not automatable without Playwright — deferred Story 2.5, consistent with Stories 1 & 3.)

## Openness / permissionlessness check (required)

- **Privileged actors?** None. Curators come from discovery (any `observer` of a `grantless-applicants` list) plus an **empty-by-default** overridable config; no curator is hardcoded or ranked. ✅ no.
- **Trust WoT-derived, not encoded?** Yes — resolution keys on `observer`/`source-tag`, explicitly **not** on the signer; the client renders whatever the selected curator's latest list says, conferring nothing. ✅ yes.
- **Hardcoded defaults introduced?** `VITE_GRANTLESS_CURATORS` (empty default, documented, overridable, no elevated status); reads use the configured/overridable relay set. ✅
- **Fork test:** point the app at another relay with other curators' lists → the selector shows those curators and resolves their applicants identically. ✅ yes.

## Out of scope
- Arbiter curation/filtering (`grantless-arbiter`) — Story 6 (reuses this resolver with a different slug).
- Crowdfunding/funding UI — Story 7. Write actions, detail pages, self-assignment — later.
- Shareable curator/project URLs — Story 11 (Story 4 uses local persistence).
- The `#d` fast-path optimization; an `authors`-scoped task query; multi-curator union; GrapeRank rank ordering.
- Deleting the now-unmounted pasted-naddr path (`NomineeBrowser`/`useNomineeList`) — later cleanup.
