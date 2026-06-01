# ADR 0001: Minimal nominee browser — a feature slice on the existing baseline

**Status:** Accepted
**Date:** 2026-06-01
**Story:** `.pi/engineering-team/stories/1-minimal-nominee-browser.md`

## Context

Story 1 wants a browse screen: paste an `naddr` for a kind **30392 / 30000 / 39089** list → render each member pubkey as a **nominee** (profile + fallback), with that nominee's Catallax task proposals (kind **33401**, all funding types) beneath, "No projects yet" when none, in published `p`-tag order, remembering the last list. Read-only; no new kinds.

**Existing assets to build on (verified in the codebase):**
- `nip19.decode` is already the app's naddr decode pattern — `src/pages/TaskDetail.tsx:37-40` (decode → check `type === 'naddr'` → use `data.kind/pubkey/identifier`). `nostr-tools@^2.13.0` is a dependency.
- `src/lib/catallax.ts` — `parseTaskProposal()` (→ `TaskProposal` with `patronPubkey`, `d`, `status`, `fundingType`) and `CATALLAX_KINDS`. This file is the de-facto protocol-parsing seam.
- `src/hooks/useCatallax.ts` — `useTaskProposals()` already queries all `#t:['catallax']` 33401 events and returns the **latest per `patronPubkey:d`**, applying the authorized-updater rule (patron/arbiter/worker). Reusable as the project source.
- `src/hooks/useAuthor.ts` (kind-0 profile, established pattern), `src/lib/genUserName.ts` (fallback name), `src/hooks/useLocalStorage.ts` (persistence), `RelaySelector` + `Card`/`Skeleton` (empty/loading conventions per CLAUDE.md).
- `useNostr().nostr.query(filters, { signal, relays? })` — default (no `relays`) reads from the app's configured, overridable relay (`AppConfig.relayUrl`). `useGrapeRank.ts` shows the `relays:` option for targeting hints.
- Page conventions: default-export page in `src/pages/`, `Helmet` for title, route registered in `src/AppRouter.tsx` above the catch-all.

**Constraints.** Per `.pi/AGENTS.md`: the stack is mid-rewrite off MKStack toward a wrapper/adapter layer — *that rewrite is a separate initiative and Story 1 does not authorize starting it*. House rules: keep pure protocol logic out of components (the `lib/` seam), prefer relay-level filtering, and the prime directive (no privileged pubkey/relay).

## Options considered

### Option A — Thin Grantless feature slice on the current baseline *(chosen)*
A new home page + route, a small `lib/` module for the new parsing, one query hook, and presentational components. Pure naddr/list parsing lives in `lib/` (unit-testable without React); the hook does the query; components render. Reuse `useTaskProposals`, `useAuthor`, `useLocalStorage`, `parseTaskProposal`, `nip19`.
- **Pros:** Smallest change that satisfies the story; follows existing patterns exactly; establishes the lib-parse / hook-query / component-render seam the future wrapper layer can formalize; trivially testable at all three levels.
- **Cons:** Reuses `useTaskProposals`, which over-fetches *all* catallax tasks (not just nominees') and carries inherited `console.log` noise.

### Option B — Make Story 1 the first slice of the framework rewrite
Build the wrapper/adapter layer now and implement the browser on top of it.
- **Pros:** Starts paying down the stated rewrite; "correct" long-term seam.
- **Cons:** Massively out of scope — the story is a scaffolding browse screen, not an architecture migration. Blocks a simple feature (and the deploy the user wants) on a large initiative with no ADR of its own. **Rejected**; the rewrite deserves its own story/ADR, and Option A's lib seam is a clean stepping-stone toward it.

### Option C — Reuse the heavy `TaskCard` for projects + scoped `authors` query for tasks
Render each project with the existing `TaskCard`, and fetch tasks with `{kinds:[33401], authors:[…nominees…]}` instead of reusing `useTaskProposals`.
- **Pros:** `authors`-scoped query is more relay-efficient (aligns with the efficient-query guidance); `TaskCard` is pre-built.
- **Cons:** `TaskCard` (12KB) pulls crowdfunding/zap/action UI that Story 1 explicitly puts **out of scope**; an `authors`-only query **misses** task proposals whose latest replaceable version was signed by a non-nominee arbiter/worker, so status/content can be stale. **Rejected for v1**: use a slim presentational project item, and reuse `useTaskProposals` for correctness + simplicity. The scoped-query efficiency win is noted as a follow-up for when nominee sets are real and large.

## Decision

We chose **Option A**. It's the minimum that honors the story, stays on the existing baseline (no premature rewrite), reuses the battle-tested replaceable-dedup logic, and puts the new parsing behind a `lib/` seam so it's unit-testable and rewrite-friendly. The browser is mounted at `/` (home) so a `grantless.org` deploy lands directly on it.

## Consequences

- Unblocks the browse UI and visual testing now, and gives the deploy chore its first deployable artifact.
- **No new event kinds; `NIP.md` unchanged; no protocol/firmware changes.** Purely additive read-only feature.
- `/` now serves the Grantless browser, so a Vercel deploy of `grantless.org` lands directly on it. The old `/` → `/catallax` redirect (`src/pages/Index.tsx`) is retired and left unused; the original Catallax dashboard and the "Vibed with MKStack" attribution remain reachable at `/catallax` (and `/about`).
- Inherits two known limitations from reusing `useTaskProposals`: it over-fetches all catallax tasks (fine for a v1 dev tool; flagged for a future `authors`-scoped query) and carries `console.log` noise (not cleaned here — out of scope).
- Per-nominee profile fetches via `useAuthor` mean N kind-0 queries for N nominees; acceptable for v1, batching is a later optimization.
- Establishes the **lib-parse → hook-query → component-render** seam that the eventual wrapper/adapter rewrite can formalize rather than fight.

## Implementation notes

Concrete targets for the Implementer:

- **`src/lib/grantless.ts`** (new — pure, framework-free, the parsing seam):
  - `export const NOMINEE_LIST_KINDS = [30392, 30000, 39089] as const;`
  - `decodeNomineeListNaddr(input: string): { kind: number; pubkey: string; identifier: string; relays?: string[] } | { error: 'malformed' | 'unsupported_kind' }` — wraps `nip19.decode`, requires `type === 'naddr'` and `kind ∈ NOMINEE_LIST_KINDS`.
  - `extractNomineePubkeys(event: NostrEvent): string[]` — collect `p`-tag values in tag order, **distinct (first occurrence wins)**.
  - `groupTasksByPatron(tasks: TaskProposal[]): Map<string, TaskProposal[]>` — bucket projects by `patronPubkey`.
- **`src/hooks/useNomineeList.ts`** (new): take the raw `naddr` string; `decodeNomineeListNaddr` it; on success `nostr.query([{ kinds:[kind], authors:[pubkey], '#d':[identifier] }], { signal, relays: [...configured, ...decoded.relays?] })`; return `extractNomineePubkeys(event)` plus a typed status (`idle | loading | error('malformed'|'unsupported_kind'|'not_found') | empty | ready`). Decode errors short-circuit (don't query).
- **`src/components/grantless/NomineeBrowser.tsx`** (new, container): naddr input + "Load" button; persists the last successfully-loaded naddr via `useLocalStorage('grantless:lastNomineeList', '')` and auto-loads it on mount; calls `useNomineeList` + `useTaskProposals`, `useMemo(groupTasksByPatron)`; renders idle/error/empty/loading/list states (empty + error use `RelaySelector` per house rules).
- **`src/components/grantless/NomineeCard.tsx`** (new): props `{ pubkey, tasks }`; `useAuthor(pubkey)` for name/avatar with `genUserName` fallback; renders projects via `NomineeProjectItem`, or **"No projects yet"** when `tasks` is empty.
- **`src/components/grantless/NomineeProjectItem.tsx`** (new, slim, presentational): props `{ task }`; shows at least `task.content.title`. Deliberately **not** `TaskCard` (out-of-scope funding/zap/action UI).
- **`src/pages/GrantlessBrowse.tsx`** (new): page shell (`Helmet` title "Grantless"), renders `NomineeBrowser`.
- **`src/AppRouter.tsx`**: set `<Route path="/" element={<GrantlessBrowse />} />` as the home route; remove the now-unused `Index` redirect and its import. The original dashboard stays reachable at `/catallax`; `src/pages/Index.tsx` becomes unused (leave in place; removing it is a later cleanup).

## Openness / permissionlessness check (required)

- **Privileged actors?** None. The nominee set is *entirely* the user-pasted `naddr`; no list, author, relay, or pubkey is hardcoded or special-cased. ✅ no.
- **Trust WoT-derived, not encoded?** Yes — the client renders whatever list the user points at; it does not rank, gate, or privilege any member. ✅ yes.
- **Hardcoded defaults introduced?** None. Reads use the app's existing configured/overridable relay (plus optional naddr-embedded relay hints); no new default endpoints. ✅
- **Fork test:** Anyone clones Grantless, pastes their own list `naddr`, points at their own relay → identical behavior. ✅ yes.

## Out of scope

- Starting the framework/wrapper-layer rewrite (Option B) — separate initiative.
- The real Curator nomination mechanism, Curator switching, arbiter curation, crowdfunding/funding UI, detail pages, write actions (all per the story).
- The `relay.grantless.org` default-relay policy — that's the queued Story 2.
- The long-term fate of the old `/catallax` dashboard and the now-unused `src/pages/Index.tsx`.
- Cleaning the inherited `console.log` noise in `useTaskProposals`.
