# Review: Story 17 — Faster loads (caching + incremental rendering)

**Reviewer:** pi (acting as Reviewer)
**Date:** 2026-06-08
**Diff:** `git diff d8765d6..b68e525` (impl `0ad7142` + regression fix `b68e525`)
**Story:** `.pi/engineering-team/stories/17-faster-loads-caching.md`
**ADR:** `.pi/engineering-team/decisions/0016-faster-loads-caching.md`
**Note:** Test Design was skipped by user decision; verification = gates + manual Vercel staging (the
white-screen regression below was caught there and fixed). Already merged to master.

## Quality gates (run by reviewer)
- [x] `npm test` — **pass.** 18 files, 115 tests.
- [x] `npx eslint` — **pass.**
- [x] `npx tsc -p tsconfig.app.json --noEmit` — **pass.**
- [x] `npm run build` — **pass.** Core chunk ~518 KB (gzip 164) + per-page chunks (was one ~775 KB);
      the >500 KB warning persists on the vendor core (see non-blocking #2).

## Spec adherence (story ACs)
- [x] **Warm reload** — `PersistQueryClientProvider` + sync localStorage persister; staging-verified.
- [x] **Warm navigation** — in-memory cache + SWR; cached-first on revisit.
- [x] **Non-blocking** — cached-first paint; hot browse query timeout 10s→5s (`useCatallax.ts`).
- [x] **Own-action freshness** — preserved: `useNostrPublish.ts:73` invalidates `['catallax']`, which
      prefix-matches the new relay-keyed catallax keys, forcing refetch after any publish.
- [x] **Background-refresh correctness** — latest-wins dedup intact; stale queries revalidate on mount.
- [x] **Lighter initial load** — `AppRouter` pages are `React.lazy`; bundle split confirmed in build out.

## ADR adherence
- [x] Matches ADR 0016: persisted cache, dropped `staleTime:0`/focus overrides, relay set added to all
      7 catallax query keys, lowered hot timeout, removed hot-path `console.log`s, lazy routes + Suspense
      fallback.
- [x] **superjson** serializer is an ADR-consistent *refinement*, not a deviation: the ADR chose
      localStorage persistence; implementation surfaced that several hooks return `Map` data
      (`useGoalsProgress`, `useNomineeProfiles`) which plain JSON corrupts — superjson is the correct
      serialization to honor the chosen design. Documented inline + in the fix commit.
- [x] **ErrorBoundary** added beyond the ADR — justified: a white screen must never be reachable; it's a
      pure safety net (clears the persisted cache + reload prompt), no design impact.
- [x] New deps authorized: `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister`
      (ADR), plus `superjson` (a small pure serializer — minimal coupling, client-only).

## Things tests can't catch
- [x] No secrets/nsecs; read-path + serialization only.
- [x] Debug `console.log`s removed from `useCatallax` (legit `console.warn` for unauthorized updaters kept).
- [x] Regression root-caused and fixed at source (superjson), not just gated: `buster` bumped `v1→v2`
      discards the broken plain-JSON caches the bad branch deploy wrote to users' localStorage.
- [x] Old-format cache is safe under the new deserializer (buster mismatch discards; superjson on old
      data returns undefined → cold load, never a throw).
- [x] ErrorBoundary catches render crashes (the observed failure mode); self-heals by clearing the cache.

## House rules check
- [x] **Open / permissionless / WoT (prime directive):** caching is per-browser localStorage of **public**
      events; no pubkey/relay/arbiter privileged. The relay-keyed catallax queries are *what makes*
      relay/account switching safe (no cross-context cache bleed) — staging-verified.
- [x] **Trust WoT-derived:** unchanged; read-path plumbing.
- [x] **Bootstrapping defaults:** new constants are a cache `maxAge`/`buster` (plain client values, no
      infra, no privilege). No server-side introduced.
- [x] **Fork test:** holds — no operator/infra dependency; a forker on their own relays behaves identically.
- [x] nsec safe; no signing/payment surface touched.

## Findings

### Blocking
None.

### Non-blocking
1. **No automated regression guard for the persistence round-trip.** The white-screen was a Map-into-JSON
   serialization bug — exactly what a tiny unit test (persist→restore a query whose data is a `Map`, assert
   it's still a `Map`) would catch. Tests were skipped by decision; recommend adding that one guard when
   convenient, since the serializer is now load-bearing.
2. **Vendor core still >500 KB** (`index` ~518 KB). Route-splitting met AC6, but a `manualChunks` split of
   the vendor bundle (react / react-query / nostrify / radix) would shave the initial parse further. Optional
   follow-up; it's cached across navigations.
3. **`src/App.tsx` ErrorBoundary JSX indentation** is slightly off relative to its children (cosmetic;
   eslint clean). Optional tidy.

## Verdict
**PASS** — All four gates clean; every acceptance criterion met and staging-verified; conforms to ADR 0016
with two justified, documented additions (superjson serialization, ErrorBoundary safety net); strengthens
rather than weakens the prime directive (per-browser public-event cache, relay-keyed for context safety,
fully client-side, fork-safe). Findings are non-blocking — most notably, add a persistence round-trip test
when convenient. Already merged; mergeable as-is.
