# Review: Story 1 — Minimal nominee browser

**Reviewer:** Claude (acting as Reviewer)
**Date:** 2026-06-02
**Diff:** `git diff 5e3d060..HEAD` on branch `grantless` (impl commits `bde1ad0`, `db7299c`, `a997656`, `d866318`, `44f5309`, `084853c`)
**Artifacts:** Story `stories/1-minimal-nominee-browser.md`, ADR `decisions/0001-minimal-nominee-browser.md`, Test plan `stories/1-minimal-nominee-browser.test-plan.md`

## Quality gates (run by reviewer, not trusted)

- [x] `npx tsc -p tsconfig.app.json --noEmit` — **PASS** (clean)
- [x] `npx eslint` — **PASS** (0 errors; 2 pre-existing `react-refresh` warnings in untouched `src/components/catallax/{ArbiterFilters,TaskFilters}.tsx`)
- [x] `npx vitest run` — **PASS** (4 files, 13/13; no tests added — deferred per test plan)
- [x] `npm run build` — **PASS** (built clean; pre-existing chunk-size advisory only)

## Spec adherence (acceptance criteria)

- [x] **Load & render** — `useNomineeList` decodes the naddr, requires kind ∈ {30392,30000,39089}, resolves member `p` tags via `extractNomineePubkeys` (deduped, first-occurrence order); rendered one `NomineeCard` per pubkey in order.
- [x] **Profile shown** — batch `useNomineeProfiles` → `metadata?.name ?? genUserName(pubkey)`, avatar with fallback initials. Verified live (Nathan Day / STIMD / AviBurra / ManiMe rendered).
- [x] **Projects beneath** — `groupTasksByPatron(useTaskProposals())`, all funding types, `NomineeProjectItem` shows title.
- [x] **No-projects state** — explicit "No projects yet"; every nominee renders regardless.
- [x] **Remember last list** — `useLocalStorage('grantless:lastNomineeList')` + effect persists only on `status==='ready'`, auto-loads on mount.
- [x] **Invalid input & empty states** — `malformed` / `unsupported_kind` error copy; `empty` and `not_found` states with `RelaySelector`.
- [x] **Openness** — nominees driven entirely by the pasted naddr; relays are the naddr's own hints or the configured (overridable) set.

All 7 acceptance criteria met. Verified end-to-end in the browser against real Nostr events (not mocks), consistent with the test plan's manual-verification approach.

## ADR adherence — deviations reviewed and **ratified**

1. **Relay resolution via naddr hints** (`useNomineeList`): ADR sketched `relays: [...configured, ...hints]`; impl passes the hints (or configured fallback) through the query's `relays` option, which `NPool.req` honors by overriding the reqRouter. This is *closer* to ADR intent and was proven correct (nak + standalone `NPool` probe: configured → 0 events, hints → 1 event/9 members). **Ratified.**
2. **Batch profiles instead of per-card `useAuthor`** (`useNomineeProfiles`, `NomineeCard` now takes `metadata` prop): necessary because nominee kind-0 lives on the list's relays (e.g. purplepag.es), not the configured set — verified with nak. Also resolves the ADR-noted N-query inefficiency. **Ratified.**
3. **`crypto.randomUUID` polyfill** (`src/lib/polyfills.ts`) and **`vite allowedHosts: true`**: not in the ADR; environment fixes for running over plain HTTP on a LAN/Tailscale host. Root-caused precisely (insecure context → `crypto.randomUUID` undefined → `NRelay1` never sends a REQ). These *advance* the prime directive (the app must run/fork over plain HTTP, not just HTTPS/localhost). **Ratified.**

## Things tests can't catch

- [x] No secrets / nsecs in the diff.
- [x] No leftover `console.log` / debug code in new files (existing noise in `useTaskProposals` is inherited, ADR-acknowledged out of scope).
- [x] No commented-out code.
- [x] Persistence effect cannot loop (re-runs to a no-op once `savedNaddr` updates).
- [x] Error/edge states handled (malformed, unsupported_kind, not_found, empty).
- [x] No race in profile/task fetches; cards degrade gracefully to fallback while loading.

## House rules check

- [x] **Open / permissionless / WoT (prime directive):** **no new hardcoded relay URLs and no pubkey literals in the entire diff** (grep-verified). Nominee set, relays, and profiles all derive from the user-pasted naddr or the configured/overridable relay set. No actor is special-cased.
- [x] **Trust WoT-derived, not encoded:** the client renders whatever list the user points at; no ranking/gatekeeping.
- [x] **Bootstrapping defaults only:** reads use the existing configured relays (overridable via `RelaySelector`) plus naddr hints; nothing new and load-bearing on our infra.
- [x] **Fork test:** anyone clones, pastes their own list, points at their own relays → identical behavior. The HTTP-context fixes specifically *broaden* who can self-host.
- [x] nsec handling: N/A (read-only).
- [x] User signaling: N/A (no signing/payments).

## Findings

### Blocking
None.

### Non-blocking (follow-ups / notes)
1. **`useTaskProposals` over-fetch + `console.log` noise** — inherited, ADR-acknowledged; clean up when the projects path is reworked (Story 2 relay policy).
2. **Projects only resolve from the configured relay** — a nominee's 33401s on other relays won't show. Expected; this is the queued **Story 2** (`relay.grantless.org` always-on + relay policy).
3. **`decodeNomineeListNaddr` runs every render** producing fresh arrays, so `profileRelays`/query keys recompute by value each render. Harmless (react-query hashes keys structurally) — memoize if it ever matters.
4. **`src/pages/Index.tsx` is now dead** (no longer routed). ADR sanctioned leaving it; remove in a later cleanup.
5. **`vite allowedHosts: true`** is broad — acceptable as it's dev-server-only and aids forkability; revisit only if a stricter dev posture is wanted.
6. **No automated tests** — user-approved deferral (test plan). The intended path remains real-event e2e (local strfry + nak).

## Verdict

**PASS.** The feature meets all acceptance criteria, honors the prime directive (zero hardcoded relays/pubkeys), passes all four quality gates, and was verified end-to-end against real events. The four deviations from ADR 0001 are improvements or necessary environment fixes and are ratified above. Mergeable as-is; the non-blocking items are tracked for Story 2 / cleanup.
