# ADR 0016: Faster loads — persisted cache, SWR tuning, route code-splitting

**Status:** Accepted
**Date:** 2026-06-08
**Story:** `.pi/engineering-team/stories/17-faster-loads-caching.md`

## Context

Story 17 asks for the **main browse flow** and **project detail** to feel fast — warm reloads,
warm navigation, non-blocking/incremental render, own-action freshness, background-refresh
correctness, and a lighter initial download — **client-side only, no server-side**. Confirmed
approach: **persist the cache across reloads** + **stale-while-revalidate (SWR)**.

What exists today:
- **`src/App.tsx:17-23`** — a single `QueryClient` (`refetchOnWindowFocus: false`, `staleTime: 60s`,
  `gcTime: Infinity`) under a plain `QueryClientProvider`. **No persistence** — memory only, so every
  hard reload is cold. (App.tsx's header comment explicitly allows *adding a provider*.)
- **`src/hooks/useCatallax.ts`** — the hot family (`useTaskProposals` etc.) overrides the defaults
  with **`staleTime: 0` + `refetchOnWindowFocus: true`** and a **10s** `AbortSignal.timeout`, and
  emits several hot-path `console.log`s (`:91-112,:151`). So the main browse re-fetches *all*
  kind-33401 (limit 1000, all relays) on every visit/focus and can block up to 10s.
- **Query-key relay scoping is inconsistent:** `useApplicantCurationLists` (`['…',relays]`),
  `useNomineeProfiles`, `useGoalsProgress`, `useZapGoal` already key by the relay set; the
  **catallax family does not** (`['catallax','tasks',status]`). For a *persisted* cache this matters —
  on a relay switch, persisted catallax data would otherwise be reused across relay sets.
- **`src/AppRouter.tsx`** eager-imports all 7 pages → one ~775KB/241KB-gzip bundle (build warns).
- `NostrProvider.tsx:33` already `resetQueries()` on relay-config change; `useCatallaxInvalidation`
  (`useCatallax.ts:15-29`) + the publish/lifecycle flows invalidate after mutations.
- react-query is **v5.56** (`package.json:49`); no persist packages installed.

Constraints: prime directive (no privileged actor); wrapper/separation (configure at provider/data
boundaries, leave the Nostr `NPool` wrapper untouched); minimal coupling/forkable; **no SSR**.

## Options considered

### Option A — Persist react-query's cache + SWR tuning + route splitting (chosen)
1. **Persistence:** swap `QueryClientProvider` → `PersistQueryClientProvider`
   (`@tanstack/react-query-persist-client`) with a `createSyncStoragePersister`
   (`@tanstack/query-sync-storage-persister`) over `localStorage`, `maxAge` ~24h, persisting only
   successful queries. With the sync localStorage persister, restore is effectively immediate →
   warm first paint (AC1/AC2). `gcTime: Infinity` already satisfies "gcTime ≥ maxAge".
2. **SWR tuning + correctness:** drop the catallax family's `staleTime: 0`/`refetchOnWindowFocus: true`
   overrides so they inherit the SWR-friendly defaults (cached-first, background revalidate). Keep the
   existing **latest-authoritative dedup** in `useTaskProposals` (AC5) and the **mutation
   invalidation** (`useCatallaxInvalidation` / lifecycle `onUpdate`) so own-actions refetch
   immediately regardless of staleTime (AC4).
3. **Context correctness (openness):** add the **active relay set** to the catallax query keys
   (matching the other hooks), so persisted entries never collide across relay sets; pair with a
   static cache-schema **`buster`** string (bump to invalidate all persisted data on a breaking
   change). Account-specific queries are already keyed by pubkey.
4. **Non-blocking (AC3):** cached-first render (from #1) removes the perceived block; additionally
   lower the hot task-query timeout from 10s toward ~4–5s (exact value a Test-Design tuning detail)
   and remove the hot-path `console.log`s.
5. **Lighter initial load (AC6):** convert `AppRouter` page imports to `React.lazy` (App.tsx's
   `<Suspense>` already supports it) so non-initial pages split into their own chunks.

- **Pros:** hits all six ACs; idiomatic (react-query's *official* persistence); reuses the existing
  query layer and invalidation; preserves correctness; fully client-side and fork-safe; small,
  provider-boundary change. New deps are first-party react-query extensions (low coupling).
- **Cons:** localStorage has a ~5MB cap and is synchronous (mitigated by `maxAge` + small,
  scoped data); adds two dependencies; requires the relay-key fix to avoid cross-context staleness.

### Option B — Hand-rolled localStorage cache in each hook
Write each query result to `localStorage` and feed it back as `initialData`.
- **Pros:** no new deps; fine-grained.
- **Cons:** reinvents persistence (serialization, hydration timing, GC, busting) by hand across many
  hooks — more code, more bugs, scattered (violates separation/"don't reinvent"). Rejected.

### (Option C — staleTime tuning + code-splitting only, no persistence)
- **Pros:** cheapest; no deps.
- **Cons:** fails **AC1 (warm reload)** — the user's explicitly-chosen biggest win — leaving reloads
  cold. Rejected as insufficient.

## Decision
**Option A.** It is the smallest idiomatic change that satisfies all six criteria, reuses the
existing query/invalidation machinery, stays entirely client-side, and keeps correctness intact. The
two added deps are first-party react-query persistence packages — not an opinionated stack.

## Consequences
- **Enables:** warm reloads/navigations, SWR feel, smaller initial bundle, and a clean seam for
  future persistence tuning. Removes the constant full-refetch on the busiest query.
- **Constrains / trade-offs:** persisted cache is bounded by localStorage size + `maxAge`; a lowered
  timeout trades a little cold-load completeness for snappiness (cushioned by cached-first + the
  background revalidate, which may use a longer budget). The `buster` must be bumped on any cached-
  shape change.
- **Follow-ups:** deeper progressive/streaming render and adaptive per-relay timeouts (the parked
  2026-06-05 funding-load note) remain a later option if AC3's cached-first approach isn't enough.

## Openness / permissionlessness check (required)
- **Special privileges/capabilities?** **No.** Caching is per-browser `localStorage` of **public**
  Nostr events; no pubkey, relay, or arbiter is special-cased or granted status.
- **Trust WoT-derived, not encoded?** **Yes** — unchanged; this is read-path plumbing only.
- **Hardcoded defaults introduced:** none of the privileged kind. New values are a cache `maxAge` and
  a `buster` string (plain client constants, no infra, no elevated status). The two new deps are
  client-only first-party react-query libraries.
- **Fork test:** **Yes.** No server, no operator dependency. Crucially, adding the **relay set to the
  catallax keys** plus context-scoped persistence means swapping relays/accounts never shows another
  context's cached data as current — consistent with relays/accounts being freely swappable. A forker
  pointed at their own relays gets identical behavior.

## Implementation notes
- **`package.json`** — add `@tanstack/react-query-persist-client` and
  `@tanstack/query-sync-storage-persister` (v5-compatible).
- **`src/App.tsx`** — replace `QueryClientProvider` with `PersistQueryClientProvider`; build a
  `createSyncStoragePersister({ storage: window.localStorage })`; pass
  `persistOptions={{ persister, maxAge: 1000*60*60*24, buster: '<schema-vN>',
  dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' } }}`. Keep the
  existing default options; `gcTime: Infinity` stays.
- **`src/hooks/useCatallax.ts`** — remove the per-query `staleTime: 0` and `refetchOnWindowFocus: true`
  overrides (inherit the global SWR defaults); add the active relay set to the catallax query keys
  (reuse `getActiveRelays(config, presetRelays)` from `@/lib/relays`, as the other hooks do); lower the
  hot task-query `AbortSignal.timeout` (toward ~4–5s; final value per Test Design); delete the hot-path
  `console.log`s. Leave the latest-wins dedup and the invalidation hook intact.
- **`src/AppRouter.tsx`** — convert the page imports to `React.lazy(() => import('./pages/…'))`;
  keep/ensure a `<Suspense>` fallback (a lightweight spinner/skeleton) so route transitions don't flash.
- Verify after: a hard reload of the browse shows last-seen data before relays respond; posting/
  assigning/contributing still reflects immediately (invalidation); switching relays does not show the
  prior relay's cached projects.

## Out of scope
- Server-side rendering / edge caching / any backend (explicit; keeps the parked link-preview deferral).
- Offline mode / full PWA / background sync.
- List virtualization or pagination.
- Progressive/streaming relay reads and adaptive per-relay timeouts beyond the modest timeout change
  (deferred — the parked 2026-06-05 note).
- Pages other than the browse flow + project detail (they may benefit incidentally).
